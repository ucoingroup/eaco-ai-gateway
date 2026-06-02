/**
 * @fileoverview Authentication & authorization middleware.
 * Provides API-key auth, JWT verification, rate limiting, and input sanitization.
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET, RATE_LIMITS } = require('../config');
const logger = require('../utils/logger');

/** In-memory rate limit store: apiKey -> { count, resetAt }. */
const rateStore = new Map();

/**
 * Extract API key from x-api-key header or Authorization: Bearer xxx.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractApiKey(req) {
  if (req.headers['x-api-key']) return req.headers['x-api-key'];
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/**
 * API Key authentication middleware.
 * Attaches req.apiKey on success.
 */
function apiKeyAuth(req, res, next) {
  const key = extractApiKey(req);
  if (!key) {
    return res.status(401).json({ error: { message: 'Missing API key. Provide x-api-key header or Authorization: Bearer <key>' } });
  }
  req.apiKey = key;
  next();
}

/**
 * JWT verification middleware.
 * Decodes token and attaches req.user.
 */
function jwtAuth(req, res, next) {
  const token = extractApiKey(req);
  if (!token) {
    return res.status(401).json({ error: { message: 'Missing token' } });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}

/**
 * Per-key rate limiting middleware (in-memory).
 */
function rateLimiter(req, res, next) {
  const key = req.apiKey || req.ip;
  const now = Date.now();
  const record = rateStore.get(key);

  if (!record || now > record.resetAt) {
    rateStore.set(key, { count: 1, resetAt: now + RATE_LIMITS.windowMs });
    return next();
  }

  if (record.count >= RATE_LIMITS.maxRequests) {
    logger.warn(`Rate limit exceeded for key ${key.substring(0, 8)}...`);
    return res.status(429).json({ error: { message: 'Rate limit exceeded. Try again later.' } });
  }

  record.count++;
  next();
}

/**
 * Basic input sanitization — trims strings and strips script tags.
 */
function sanitize(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    const sanitizeValue = (v) => {
      if (typeof v === 'string') return v.replace(/<script\b[^<]*<\/script>/gi, '').trim();
      if (Array.isArray(v)) return v.map(sanitizeValue);
      if (v && typeof v === 'object') {
        const out = {};
        for (const k of Object.keys(v)) out[k] = sanitizeValue(v[k]);
        return out;
      }
      return v;
    };
    req.body = sanitizeValue(req.body);
  }
  next();
}

module.exports = { apiKeyAuth, jwtAuth, rateLimiter, sanitize };
