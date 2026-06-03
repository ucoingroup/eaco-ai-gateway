/**
 * @fileoverview EACO token payment service.
 * In-memory simulation of wallet balances, deposits, withdrawals, transfers,
 * discount calculation, fee distribution, staking, and DAO governance.
 */

const { EACO_MINT_ADDRESS, EACO_DECIMALS, PAYMENT_MODIFIERS, FEE_DISTRIBUTION } = require('../config');
const logger = require('../utils/logger');

/** Wallet balances (address -> number). Simulated with in-memory Map. */
const wallets = new Map();

/** Transaction log. */
const transactions = [];

/** Cumulative distribution pool balances. */
const distributionPools = { nodeOperators: 0, communityOps: 0, userGrowth: 0, earthVillage: 0 };

/** Stakes (address -> { amount, since }). */
const stakes = new Map();

/** DAO proposals. */
const proposals = [];

/**
 * Get or create a wallet entry.
 * @param {string} address
 * @returns {number} balance
 */
function getBalance(address) {
  return wallets.get(address) || 0;
}

/**
 * Deposit EACO into a wallet (simulated).
 */
function deposit(address, amount) {
  if (amount <= 0) throw new Error('Deposit amount must be positive');
  const current = getBalance(address);
  const newBalance = current + amount;
  wallets.set(address, newBalance);

  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  transactions.push({ txId, type: 'deposit', from: 'system', to: address, amount, timestamp: Date.now() });
  logger.info(`EACO deposit: ${amount} to ${address}, new balance: ${newBalance}`);

  return { balance: newBalance, txId };
}

/**
 * Withdraw EACO from a wallet (simulated).
 */
function withdraw(address, amount) {
  if (amount <= 0) throw new Error('Withdraw amount must be positive');
  const current = getBalance(address);
  if (current < amount) throw new Error('Insufficient balance');

  const newBalance = current - amount;
  wallets.set(address, newBalance);

  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  transactions.push({ txId, type: 'withdraw', from: address, to: 'system', amount, timestamp: Date.now() });
  logger.info(`EACO withdraw: ${amount} from ${address}, new balance: ${newBalance}`);

  return { balance: newBalance, txId };
}

/**
 * Transfer EACO between wallets.
 */
function transfer(from, to, amount) {
  if (amount <= 0) throw new Error('Transfer amount must be positive');
  const fromBalance = getBalance(from);
  if (fromBalance < amount) throw new Error('Insufficient balance');

  const toBalance = getBalance(to);
  wallets.set(from, fromBalance - amount);
  wallets.set(to, toBalance + amount);

  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  transactions.push({ txId, type: 'transfer', from, to, amount, timestamp: Date.now() });
  logger.info(`EACO transfer: ${amount} from ${from} to ${to}`);

  return { fromBalance: fromBalance - amount, toBalance: toBalance + amount, txId };
}

/**
 * Deduct payment from a wallet with four-way fee distribution.
 */
function deductPayment(address, baseCostEACO, paymentMethod = 'eaco') {
  const modifier = PAYMENT_MODIFIERS[paymentMethod] || 1;
  const charged = Math.ceil(baseCostEACO * modifier * 100) / 100;
  const discount = baseCostEACO - charged;

  const balance = getBalance(address);
  if (balance < charged) throw new Error(`Insufficient EACO balance. Need ${charged}, have ${balance}`);

  const newBalance = balance - charged;
  wallets.set(address, newBalance);

  const distribution = {
    nodeOperators: Math.ceil(charged * FEE_DISTRIBUTION.nodeOperators * 100) / 100,
    communityOps: Math.ceil(charged * FEE_DISTRIBUTION.communityOps * 100) / 100,
    userGrowth: Math.ceil(charged * FEE_DISTRIBUTION.userGrowth * 100) / 100,
    earthVillage: Math.ceil(charged * FEE_DISTRIBUTION.earthVillage * 100) / 100,
  };

  // Accumulate into distribution pools
  distributionPools.nodeOperators += distribution.nodeOperators;
  distributionPools.communityOps += distribution.communityOps;
  distributionPools.userGrowth += distribution.userGrowth;
  distributionPools.earthVillage += distribution.earthVillage;

  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  transactions.push({
    txId, type: 'payment', from: address, to: 'platform',
    amount: charged, distribution, paymentMethod, timestamp: Date.now(),
  });

  logger.info(`EACO payment: ${charged} from ${address} (method=${paymentMethod}, dist=${JSON.stringify(distribution)})`);
  return { charged, discount, distribution, balance: newBalance, txId };
}

/**
 * Get transaction history for an address.
 */
function getTransactions(address) {
  return transactions.filter(t => t.from === address || t.to === address);
}

/** Get distribution pool balances (cumulative). */
function getDistributionPools() {
  return { ...distributionPools };
}

/** Stake EACO for node operation. */
function stake(address, amount) {
  if (amount <= 0) throw new Error('Stake amount must be positive');
  const balance = getBalance(address);
  if (balance < amount) throw new Error('Insufficient balance to stake');

  wallets.set(address, balance - amount);

  const existing = stakes.get(address) || { amount: 0, since: Date.now() };
  stakes.set(address, { amount: existing.amount + amount, since: existing.since });

  logger.info(`EACO staked: ${amount} from ${address}`);
  return { stakedAmount: existing.amount + amount, walletBalance: balance - amount };
}

/** Get stake info for an address. */
function getStake(address) {
  return stakes.get(address) || { amount: 0, since: null };
}

/** Create a DAO proposal. */
function createProposal(creator, title, description, voteType) {
  const proposal = {
    id: `prop_${Date.now()}`,
    creator, title, description, voteType,
    votesFor: 0, votesAgainst: 0,
    voters: new Set(),
    createdAt: Date.now(),
    status: 'active',
  };
  proposals.push(proposal);
  return proposal;
}

/** Vote on a DAO proposal. */
function vote(proposalId, voter, support) {
  const proposal = proposals.find(p => p.id === proposalId);
  if (!proposal) throw new Error('Proposal not found');
  if (proposal.status !== 'active') throw new Error('Proposal not active');
  if (proposal.voters.has(voter)) throw new Error('Already voted');

  proposal.voters.add(voter);
  if (support) proposal.votesFor++;
  else proposal.votesAgainst++;

  return { proposalId, support, votesFor: proposal.votesFor, votesAgainst: proposal.votesAgainst };
}

/** Get all DAO proposals. */
function getProposals() {
  return proposals.map(p => ({ ...p, voters: p.voters.size }));
}

module.exports = {
  getBalance, deposit, withdraw, transfer, deductPayment, getTransactions,
  getDistributionPools, stake, getStake,
  createProposal, vote, getProposals,
  EACO_MINT_ADDRESS, EACO_DECIMALS, FEE_DISTRIBUTION,
};
