/**
 * @fileoverview Caching service with Redis (ioredis) primary and in-memory Map fallback.
 * Provides getCache, setCache, clearCache with TTL and hit/miss statistics.
 */

const { REDIS_URL, CACHE_TTL } = require('../config');
const logger = require('../utils/logger');

let client = null;
let useMemory = false;

/** In-memory fallback store. */
const memoryCache = new Map();

/** Cache statistics. */
const stats = { hits: 0, misses: 0 };

/**
 * Initialize the cache backend. Tries Redis first, falls back to memory.
 */
async function init() {
  try {
    const Redis = require('ioredis');
    client = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
    await client.connect();
    logger.info('Cache: connected to Redis');
  } catch (err) {
    useMemory = true;
    logger.warn('Cache: Redis unavailable, using in-memory fallback');
  }
}

/**
 * Build a cache key from model + messages hash.
 * @param {string} model
 * @param {Array} messages
 * @returns {string}
 */
function buildKey(model, messages) {
  const content = JSON.stringify({ model, messages });
  const hash = content.length < 64 ? content : simpleHash(content);
  return `eaco:cache:${model}:${hash}`;
}

/** Simple deterministic hash. */
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/**
 * Retrieve a cached response.
 * @param {string} key
 * @returns {Promise<object|null>}
 */
async function getCache(key) {
  try {
    if (useMemory) {
      const entry = memoryCache.get(key);
      if (!entry) { stats.misses++; return null; }
      if (Date.now() > entry.expiresAt) { memoryCache.delete(key); stats.misses++; return null; }
      stats.hits++;
      return entry.value;
    }
    const raw = await client.get(key);
    if (!raw) { stats.misses++; return null; }
    stats.hits++;
    return JSON.parse(raw);
  } catch (err) {
    logger.warn('Cache get error:', err.message);
    stats.misses++;
    return null;
  }
}

/**
 * Store a response in cache.
 * @param {string} key
 * @param {object} value
 * @param {number} [ttlSeconds]
 */
async function setCache(key, value, ttlSeconds = CACHE_TTL) {
  try {
    if (useMemory) {
      memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      return;
    }
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn('Cache set error:', err.message);
  }
}

/**
 * Clear all cache entries.
 */
async function clearCache() {
  try {
    if (useMemory) {
      memoryCache.clear();
      return;
    }
    const keys = await client.keys('eaco:cache:*');
    if (keys.length) await client.del(...keys);
  } catch (err) {
    logger.warn('Cache clear error:', err.message);
  }
}

/**
 * Return cache hit/miss statistics.
 * @returns {{ hits: number, misses: number }}
 */
function getStats() {
  return { ...stats };
}

module.exports = { init, buildKey, getCache, setCache, clearCache, getStats };
