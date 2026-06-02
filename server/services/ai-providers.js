/**
 * @fileoverview AI provider adapter layer.
 * Unified chatCompletion interface wrapping OpenAI, Anthropic, DeepSeek, Google, Mistral.
 * Handles request/response normalization, retry logic, token estimation, and billing.
 */

const { API_KEYS, MODEL_PRICING } = require('../config');
const logger = require('../utils/logger');

/** Provider base URLs. */
const BASE_URLS = {
  openai:    'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  deepseek:  'https://api.deepseek.com/v1',
  google:    'https://generativelanguage.googleapis.com/v1beta',
  mistral:   'https://api.mistral.ai/v1',
};

/** Max retries on transient failures. */
const MAX_RETRIES = 2;

/**
 * Estimate token count (rough: ~4 chars per token for English, ~2 for CJK).
 * @param {string} text
 * @returns {number}
 */
function estimateTokens(text) {
  if (!text) return 0;
  const cjk = (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  const rest = text.length - cjk;
  return Math.ceil(rest / 4 + cjk / 2);
}

/**
 * Count tokens in a messages array.
 * @param {Array} messages
 * @returns {number}
 */
function countMessagesTokens(messages) {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content || ''), 0);
}

// ─── Provider-specific adapters ──────────────────────────────────────────

/**
 * Call OpenAI-compatible API (OpenAI, DeepSeek, Mistral share the same format).
 * @param {string} baseUrl
 * @param {string} apiKey
 * @param {object} body
 * @returns {Promise<object>}
 */
async function callOpenAICompatible(baseUrl, apiKey, body) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI-compatible error (${res.status}): ${err}`);
  }
  return res.json();
}

/**
 * Call Anthropic Messages API.
 * @param {string} apiKey
 * @param {object} body
 * @returns {Promise<object>}
 */
async function callAnthropic(apiKey, body) {
  // Convert OpenAI messages to Anthropic format
  const system = body.messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
  const messages = body.messages.filter(m => m.role !== 'system');

  const res = await fetch(`${BASE_URLS.anthropic}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: body.model,
      max_tokens: body.max_tokens || 4096,
      system: system || undefined,
      messages,
      stream: false,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error (${res.status}): ${err}`);
  }
  const data = await res.json();
  // Normalize to OpenAI format
  return {
    id: data.id,
    model: data.model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: data.content.map(b => b.text).join('') },
      finish_reason: data.stop_reason || 'stop',
    }],
    usage: {
      prompt_tokens: data.usage.input_tokens,
      completion_tokens: data.usage.output_tokens,
      total_tokens: data.usage.input_tokens + data.usage.output_tokens,
    },
  };
}

/**
 * Call Google Generative Language API.
 * @param {string} apiKey
 * @param {object} body
 * @returns {Promise<object>}
 */
async function callGoogle(apiKey, body) {
  // Convert messages to Google format
  const contents = body.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemInstruction = body.messages.find(m => m.role === 'system');

  const res = await fetch(
    `${BASE_URLS.google}/models/${body.model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : undefined,
        generationConfig: { maxOutputTokens: body.max_tokens || 4096 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google error (${res.status}): ${err}`);
  }
  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map(p => p.text).join('') || '';
  const usageMeta = data.usageMetadata || {};

  return {
    id: `google-${Date.now()}`,
    model: body.model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: text },
      finish_reason: candidate?.finishReason || 'stop',
    }],
    usage: {
      prompt_tokens: usageMeta.promptTokenCount || 0,
      completion_tokens: usageMeta.candidatesTokenCount || 0,
      total_tokens: usageMeta.totalTokenCount || 0,
    },
  };
}

// ─── Unified interface ───────────────────────────────────────────────────

/**
 * Dispatch a chat completion request to the correct provider.
 * @param {string} model - Model identifier (lowercase).
 * @param {object} params - { messages, max_tokens?, temperature?, stream? }
 * @param {number} [retryCount=0]
 * @returns {Promise<object>} Normalized OpenAI-format response.
 */
async function chatCompletion(model, params, retryCount = 0) {
  const pricing = MODEL_PRICING[model];
  if (!pricing) throw new Error(`Unknown model: ${model}`);

  const provider = pricing.provider;
  const apiKey = API_KEYS[provider];
  if (!apiKey) throw new Error(`No API key configured for provider: ${provider}`);

  const body = {
    model,
    messages: params.messages,
    max_tokens: params.max_tokens || 4096,
    temperature: params.temperature ?? 0.7,
    stream: false,
  };

  logger.info(`AI Provider: calling ${provider}/${model} (retry=${retryCount})`);

  try {
    let response;
    switch (provider) {
      case 'openai':
      case 'deepseek':
      case 'mistral':
        response = await callOpenAICompatible(BASE_URLS[provider], apiKey, body);
        break;
      case 'anthropic':
        response = await callAnthropic(apiKey, body);
        break;
      case 'google':
        response = await callGoogle(apiKey, body);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
    return response;
  } catch (err) {
    if (retryCount < MAX_RETRIES && isTransientError(err)) {
      logger.warn(`AI Provider: retrying ${model} after error: ${err.message}`);
      await sleep(1000 * (retryCount + 1));
      return chatCompletion(model, params, retryCount + 1);
    }
    throw err;
  }
}

/**
 * Check if an error is transient (rate limit, 5xx, timeout).
 * @param {Error} err
 * @returns {boolean}
 */
function isTransientError(err) {
  const msg = err.message || '';
  return msg.includes('429') || msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('timeout');
}

/**
 * Calculate billing cost in EACO.
 * @param {string} model
 * @param {number} promptTokens
 * @param {number} completionTokens
 * @returns {number} cost in EACO (per-million-token pricing, scaled)
 */
function calculateCost(model, promptTokens, completionTokens) {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return Math.ceil((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6 decimal precision
}

/** @param {number} ms */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { chatCompletion, calculateCost, estimateTokens, countMessagesTokens };
