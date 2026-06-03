/**
 * @fileoverview Configuration module for EACO AI Gateway.
 * Exports all runtime config including port, model registry, EACO token info,
 * per-model pricing (EACO-denominated), and payment modifiers.
 */

require('dotenv').config();

const PORT = parseInt(process.env.PORT, 10) || 3000;

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const EACO_MINT_ADDRESS = process.env.EACO_MINT_ADDRESS || 'DqfoyZH96RnvZusSp3Cdncjpyp3C74ZmJzGhjmHnDHRH';
const EACO_DECIMALS = parseInt(process.env.EACO_DECIMALS, 10) || 6;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const API_KEYS = {
  openai: process.env.OPENAI_API_KEY || '',
  anthropic: process.env.ANTHROPIC_API_KEY || '',
  deepseek: process.env.DEEPSEEK_API_KEY || '',
  google: process.env.GOOGLE_API_KEY || '',
  mistral: process.env.MISTRAL_API_KEY || '',
};

const AGENT_WORLD_API_KEY = process.env.AGENT_WORLD_API_KEY || '';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-in-production';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

/** Pricing per million tokens in EACO. */
const MODEL_PRICING = {
  'gpt-4o':                  { input: 30,  output: 60,  provider: 'openai' },
  'gpt-4o-mini':             { input: 2,   output: 8,   provider: 'openai' },
  'gpt-3.5-turbo':           { input: 1,   output: 3,   provider: 'openai' },
  'claude-3.5-sonnet':       { input: 15,  output: 50,  provider: 'anthropic' },
  'claude-3-haiku':          { input: 1,   output: 3,   provider: 'anthropic' },
  'claude-3-opus':           { input: 75,  output: 150, provider: 'anthropic' },
  'deepseek-v3':             { input: 1,   output: 2,   provider: 'deepseek' },
  'deepseek-r1':             { input: 4,   output: 8,   provider: 'deepseek' },
  'gemini-1.5-pro':          { input: 8,   output: 20,  provider: 'google' },
  'gemini-1.5-flash':        { input: 0.5, output: 1.5, provider: 'google' },
  'mistral-large':           { input: 12,  output: 24,  provider: 'mistral' },
  'mistral-small':           { input: 1,   output: 3,   provider: 'mistral' },
  'llama-3.1-405b':          { input: 3,   output: 6,   provider: 'deepseek' },
  'llama-3.1-70b':           { input: 1,   output: 2,   provider: 'deepseek' },
  'qwen-2.5-72b':            { input: 1,   output: 2,   provider: 'deepseek' },
};

/** Available model identifiers. */
const AVAILABLE_MODELS = Object.keys(MODEL_PRICING);

/** Payment modifiers. */
const PAYMENT_MODIFIERS = {
  /** 20% discount when paying with EACO. */
  eaco: 0.8,
  /** 10% premium when paying with USDC. */
  usdc: 1.1,
};

/** Fee distribution ratios — EACO Token Economy */
const FEE_DISTRIBUTION = {
  nodeOperators: 0.50,   // 50% → 节点运营商
  communityOps: 0.20,    // 20% → 社区运营
  userGrowth: 0.20,      // 20% → 发展新用户
  earthVillage: 0.10,    // 10% → 地球村公益
};

/** DAO governance config */
const DAO_CONFIG = {
  votingPeriodHours: 72,
  quorumPercentage: 10,
  proposalThreshold: 10000, // minimum EACO to create proposal
};

/** Staking config */
const STAKING_CONFIG = {
  minimumStake: 1000,      // minimum EACO to run a node
  rewardRatePerMB: 0.5,    // EACO reward per MB processed
  unbondingPeriodDays: 7,
};

/** Rate limits (requests per minute per API key). */
const RATE_LIMITS = {
  windowMs: 60 * 1000,
  maxRequests: 60,
};

/** Cache TTL in seconds. */
const CACHE_TTL = parseInt(process.env.CACHE_TTL, 10) || 300;

module.exports = {
  PORT,
  SOLANA_RPC_URL,
  EACO_MINT_ADDRESS,
  EACO_DECIMALS,
  REDIS_URL,
  API_KEYS,
  AGENT_WORLD_API_KEY,
  ADMIN_SECRET,
  JWT_SECRET,
  MODEL_PRICING,
  AVAILABLE_MODELS,
  PAYMENT_MODIFIERS,
  FEE_DISTRIBUTION,
  DAO_CONFIG,
  STAKING_CONFIG,
  RATE_LIMITS,
  CACHE_TTL,
};
