/**
 * @fileoverview Smart model routing service.
 * Selects the best model based on request complexity, supports manual override
 * and fallback chains on failure.
 */

const { MODEL_PRICING, AVAILABLE_MODELS } = require('../config');
const logger = require('../utils/logger');

/** Complexity tiers. */
const TIERS = {
  light:   ['deepseek-v3', 'claude-3-haiku', 'gpt-4o-mini'],
  medium:  ['claude-3.5-sonnet', 'gpt-4o', 'gemini-1.5-pro'],
  heavy:   ['claude-3-opus', 'deepseek-r1'],
};

/** Fallback chains per model. */
const FALLBACK_CHAINS = {
  'gpt-4o':            ['gpt-4o-mini', 'deepseek-v3'],
  'gpt-4o-mini':       ['deepseek-v3', 'claude-3-haiku'],
  'gpt-3.5-turbo':     ['gpt-4o-mini', 'deepseek-v3'],
  'claude-3.5-sonnet': ['gpt-4o', 'gemini-1.5-pro'],
  'claude-3-haiku':    ['gpt-4o-mini', 'deepseek-v3'],
  'claude-3-opus':     ['claude-3.5-sonnet', 'gpt-4o'],
  'deepseek-v3':       ['gpt-4o-mini', 'claude-3-haiku'],
  'deepseek-r1':       ['claude-3-opus', 'gpt-4o'],
  'gemini-1.5-pro':    ['claude-3.5-sonnet', 'gpt-4o'],
  'gemini-1.5-flash':  ['gpt-4o-mini', 'deepseek-v3'],
  'mistral-large':     ['gpt-4o', 'claude-3.5-sonnet'],
  'mistral-small':     ['deepseek-v3', 'gpt-4o-mini'],
  'llama-3.1-405b':    ['deepseek-v3', 'gpt-4o'],
  'llama-3.1-70b':     ['deepseek-v3', 'gpt-4o-mini'],
  'qwen-2.5-72b':      ['deepseek-v3', 'gpt-4o-mini'],
};

/** Keywords that hint at complex reasoning. */
const COMPLEXITY_KEYWORDS = {
  heavy: [
    'analyze', 'reason', 'complex', 'derive', 'prove', 'theorem',
    'architect', 'design system', 'deep analysis', 'research',
    'multi-step', 'chain of thought', 'explain in detail',
  ],
  medium: [
    'write', 'code', 'implement', 'explain', 'compare', 'review',
    'refactor', 'summarize', 'translate', 'debug',
  ],
};

/**
 * Estimate complexity tier from the last user message.
 * @param {Array} messages - OpenAI-format messages array.
 * @returns {'light'|'medium'|'heavy'}
 */
function estimateComplexity(messages) {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUser) return 'light';
  const text = (lastUser.content || '').toLowerCase();

  // Check heavy first
  for (const kw of COMPLEXITY_KEYWORDS.heavy) {
    if (text.includes(kw)) return 'heavy';
  }
  // Then medium
  for (const kw of COMPLEXITY_KEYWORDS.medium) {
    if (text.includes(kw)) return 'medium';
  }

  // Simple heuristic: short messages -> light
  if (text.length < 100) return 'light';
  if (text.length < 500) return 'medium';
  return 'medium';
}

/**
 * Select a model from a tier.
 * @param {'light'|'medium'|'heavy'} tier
 * @returns {string} model name
 */
function pickFromTier(tier) {
  const candidates = TIERS[tier];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Route a request to the best model.
 * @param {object} request - { model?, messages, stream? }
 * @returns {{ model: string, tier: string, fallbackChain: string[] }}
 */
function routeRequest(request) {
  // Manual override
  if (request.model && AVAILABLE_MODELS.includes(request.model.toLowerCase())) {
    const model = request.model.toLowerCase();
    logger.info(`Router: manual override -> ${model}`);
    return {
      model,
      tier: 'manual',
      fallbackChain: FALLBACK_CHAINS[model] || [],
    };
  }

  const tier = estimateComplexity(request.messages || []);
  const model = pickFromTier(tier);
  logger.info(`Router: tier=${tier}, selected=${model}`);

  return {
    model,
    tier,
    fallbackChain: FALLBACK_CHAINS[model] || [],
  };
}

/**
 * Get the next fallback model from the chain.
 * @param {string} failedModel
 * @param {string[]} tried - Models already attempted.
 * @param {string[]} chain - Fallback chain.
 * @returns {string|null}
 */
function nextFallback(failedModel, tried, chain) {
  for (const m of chain) {
    if (!tried.includes(m)) return m;
  }
  return null;
}

module.exports = { routeRequest, nextFallback, estimateComplexity };
