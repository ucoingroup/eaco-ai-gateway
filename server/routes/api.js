/**
 * @fileoverview API route handlers for EACO AI Gateway.
 * Endpoints: chat completions, models, pricing, EACO wallet, Agent World.
 */

const express = require('express');
const jwt = require('jsonwebtoken');

const { MODEL_PRICING, AVAILABLE_MODELS, PAYMENT_MODIFIERS, FEE_DISTRIBUTION, JWT_SECRET, AGENT_WORLD_API_KEY } = require('../config');
const { apiKeyAuth, rateLimiter, sanitize, registerApiKey } = require('../middleware/auth');
const cache = require('../services/cache');
const router = require('../services/router');
const eaco = require('../services/eaco');
const ai = require('../services/ai-providers');
const logger = require('../utils/logger');

const apiRouter = express.Router();

// ─── Health Check ─────────────────────────────────────────────────────────

/** GET /api/v1/health */
apiRouter.get('/health', (req, res) => {
  const uptime = process.uptime();
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    uptime: Math.floor(uptime),
    memory: {
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
    },
    models: AVAILABLE_MODELS.length,
    timestamp: new Date().toISOString(),
  });
});

// ─── Chat Completions ────────────────────────────────────────────────────

/**
 * POST /api/v1/chat/completions
 * OpenAI-compatible chat endpoint.
 * Flow: auth -> balance check -> route -> AI call -> cache -> bill -> respond
 */
apiRouter.post('/chat/completions', apiKeyAuth, rateLimiter, sanitize, async (req, res) => {
  try {
    const { messages, model: requestedModel, max_tokens, temperature, stream } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: { message: 'messages is required and must be a non-empty array' } });
    }

    // Check balance (use API key as wallet identifier for now)
    const walletAddress = req.apiKey;
    const balance = eaco.getBalance(walletAddress);
    if (balance <= 0) {
      return res.status(402).json({ error: { message: 'Insufficient EACO balance. Please deposit first.' } });
    }

    // Route to model
    const routing = router.routeRequest({ model: requestedModel, messages });
    let currentModel = routing.model;
    const tried = [currentModel];

    // Check cache
    const cacheKey = cache.buildKey(currentModel, messages);
    const cached = await cache.getCache(cacheKey);
    if (cached) {
      logger.info(`Cache hit for model=${currentModel}`);
      return res.json(cached);
    }

    // Call AI with fallback
    let response;
    while (true) {
      try {
        response = await ai.chatCompletion(currentModel, { messages, max_tokens, temperature });
        break;
      } catch (err) {
        logger.warn(`Model ${currentModel} failed: ${err.message}`);
        const next = router.nextFallback(currentModel, tried, routing.fallbackChain);
        if (!next) {
          return res.status(502).json({ error: { message: `All models failed. Last error: ${err.message}` } });
        }
        tried.push(next);
        currentModel = next;
        logger.info(`Falling back to ${next}`);
      }
    }

    // Calculate cost and deduct
    const usage = response.usage || {};
    const promptTokens = usage.prompt_tokens || ai.countMessagesTokens(messages);
    const completionTokens = usage.completion_tokens || ai.estimateTokens(response.choices?.[0]?.message?.content || '');
    const cost = ai.calculateCost(currentModel, promptTokens, completionTokens);

    let billingResult;
    try {
      billingResult = eaco.deductPayment(walletAddress, cost, 'eaco');
    } catch (err) {
      // Not enough balance after usage — still return response but flag it
      logger.error(`Billing failed: ${err.message}`);
      billingResult = { charged: cost, balance: 0, txId: 'billing_failed' };
    }

    // Cache the response
    await cache.setCache(cacheKey, response);

    // Return response with billing metadata
    res.json({
      ...response,
      _meta: {
        model_used: currentModel,
        routing_tier: routing.tier,
        cost_eaco: billingResult.charged,
        balance_remaining: billingResult.balance,
        payment_method: 'eaco',
        discount_applied: PAYMENT_MODIFIERS.eaco,
      },
    });
  } catch (err) {
    logger.error('Chat completion error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
});

// ─── Models ──────────────────────────────────────────────────────────────

/** GET /api/v1/models - List available models and pricing. */
apiRouter.get('/models', (req, res) => {
  const models = AVAILABLE_MODELS.map(id => ({
    id,
    pricing: MODEL_PRICING[id],
    eaco_discount: PAYMENT_MODIFIERS.eaco,
  }));
  res.json({ object: 'list', data: models });
});

// ─── Pricing ─────────────────────────────────────────────────────────────

/** GET /api/v1/pricing - Detailed pricing info. */
apiRouter.get('/pricing', (req, res) => {
  res.json({
    currency: 'EACO',
    unit: 'per million tokens',
    models: MODEL_PRICING,
    payment_modifiers: PAYMENT_MODIFIERS,
    note: 'EACO payments get 20% discount. USDC payments have 10% premium.',
  });
});

// ─── EACO Wallet ─────────────────────────────────────────────────────────

/** POST /api/v1/eaco/balance */
apiRouter.post('/eaco/balance', apiKeyAuth, (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: { message: 'address is required' } });
  res.json({ address, balance: eaco.getBalance(address), mint: eaco.EACO_MINT_ADDRESS });
});

/** POST /api/v1/eaco/deposit */
apiRouter.post('/eaco/deposit', apiKeyAuth, (req, res) => {
  const { address, amount } = req.body;
  if (!address || !amount) return res.status(400).json({ error: { message: 'address and amount are required' } });
  try {
    const result = eaco.deposit(address, parseFloat(amount));
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

/** POST /api/v1/eaco/withdraw */
apiRouter.post('/eaco/withdraw', apiKeyAuth, (req, res) => {
  const { address, amount } = req.body;
  if (!address || !amount) return res.status(400).json({ error: { message: 'address and amount are required' } });
  try {
    const result = eaco.withdraw(address, parseFloat(amount));
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

/** POST /api/v1/eaco/transfer */
apiRouter.post('/eaco/transfer', apiKeyAuth, (req, res) => {
  const { from, to, amount } = req.body;
  if (!from || !to || !amount) return res.status(400).json({ error: { message: 'from, to, and amount are required' } });
  try {
    const result = eaco.transfer(from, to, parseFloat(amount));
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// ─── Agent World ─────────────────────────────────────────────────────────

/** In-memory agent registry. */
const agentRegistry = new Map();

/** POST /api/v1/agent-world/register */
apiRouter.post('/agent-world/register', apiKeyAuth, (req, res) => {
  const { name, description, capabilities } = req.body;
  if (!name) return res.status(400).json({ error: { message: 'name is required' } });

  const agentId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const token = jwt.sign({ agentId, name }, JWT_SECRET, { expiresIn: '30d' });

  agentRegistry.set(agentId, {
    agentId, name, description: description || '', capabilities: capabilities || [],
    owner: req.apiKey, createdAt: Date.now(),
  });

  logger.info(`Agent registered: ${name} (${agentId})`);
  res.json({ agentId, token, name });
});

/** POST /api/v1/agent-world/verify */
apiRouter.post('/agent-world/verify', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: { message: 'token is required' } });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const agent = agentRegistry.get(decoded.agentId);
    if (!agent) return res.status(404).json({ error: { message: 'Agent not found' } });

    res.json({ valid: true, agentId: decoded.agentId, name: decoded.name, agent });
  } catch (err) {
    res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
});

// ─── Staking ─────────────────────────────────────────────────────────────

/** POST /api/v1/eaco/stake */
apiRouter.post('/eaco/stake', apiKeyAuth, (req, res) => {
  const { address, amount } = req.body;
  if (!address || !amount) return res.status(400).json({ error: { message: 'address and amount are required' } });
  try {
    const result = eaco.stake(address, parseFloat(amount));
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

/** GET /api/v1/eaco/stake/:address */
apiRouter.get('/eaco/stake/:address', apiKeyAuth, (req, res) => {
  res.json(eaco.getStake(req.params.address));
});

// ─── DAO ─────────────────────────────────────────────────────────────────

/** POST /api/v1/dao/proposals */
apiRouter.post('/dao/proposals', apiKeyAuth, (req, res) => {
  const { title, description, voteType } = req.body;
  if (!title) return res.status(400).json({ error: { message: 'title is required' } });
  try {
    const result = eaco.createProposal(req.apiKey, title, description, voteType);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

/** POST /api/v1/dao/vote */
apiRouter.post('/dao/vote', apiKeyAuth, (req, res) => {
  const { proposalId, support } = req.body;
  if (!proposalId) return res.status(400).json({ error: { message: 'proposalId is required' } });
  try {
    const result = eaco.vote(proposalId, req.apiKey, support);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

/** GET /api/v1/dao/proposals */
apiRouter.get('/dao/proposals', (req, res) => {
  res.json(eaco.getProposals());
});

// ─── Distribution Pools ──────────────────────────────────────────────────

/** GET /api/v1/eaco/distribution */
apiRouter.get('/eaco/distribution', (req, res) => {
  res.json({
    feeDistribution: eaco.FEE_DISTRIBUTION,
    pools: eaco.getDistributionPools(),
  });
});

// ─── Auth / API Key Management ────────────────────────────────────────────

/** POST /api/v1/auth/register — Register new API key (admin secret required) */
apiRouter.post('/auth/register', (req, res) => {
  const { admin_secret } = req.body;
  try {
    const newKey = registerApiKey(admin_secret);
    res.json({ apiKey: newKey, message: 'API key registered successfully' });
  } catch (err) {
    res.status(403).json({ error: { message: err.message } });
  }
});

module.exports = apiRouter;
