/**
 * @fileoverview EACO token payment service.
 * In-memory simulation of wallet balances, deposits, withdrawals, transfers,
 * discount calculation, and fee distribution (30% to buyback pool).
 */

const { EACO_MINT_ADDRESS, EACO_DECIMALS, PAYMENT_MODIFIERS } = require('../config');
const logger = require('../utils/logger');

/** Wallet balances (address -> number). Simulated with in-memory Map. */
const wallets = new Map();

/** Transaction log. */
const transactions = [];

/** Fee distribution ratio. */
const BUYBACK_RATIO = 0.3; // 30% to buyback pool

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
 * @param {string} address
 * @param {number} amount
 * @returns {{ balance: number, txId: string }}
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
 * @param {string} address
 * @param {number} amount
 * @returns {{ balance: number, txId: string }}
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
 * @param {string} from
 * @param {string} to
 * @param {number} amount
 * @returns {{ fromBalance: number, toBalance: number, txId: string }}
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
 * Deduct payment from a wallet with EACO discount.
 * @param {string} address
 * @param {number} baseCostEACO - Cost before discount (in EACO units).
 * @param {'eaco'|'usdc'} paymentMethod
 * @returns {{ charged: number, discount: number, buybackPool: number, balance: number, txId: string }}
 */
function deductPayment(address, baseCostEACO, paymentMethod = 'eaco') {
  const modifier = PAYMENT_MODIFIERS[paymentMethod] || 1;
  const charged = Math.ceil(baseCostEACO * modifier * 100) / 100;
  const discount = baseCostEACO - charged;

  const balance = getBalance(address);
  if (balance < charged) throw new Error(`Insufficient EACO balance. Need ${charged}, have ${balance}`);

  const newBalance = balance - charged;
  wallets.set(address, newBalance);

  const buybackPool = Math.ceil(charged * BUYBACK_RATIO * 100) / 100;
  const platformFee = charged - buybackPool;

  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  transactions.push({
    txId, type: 'payment', from: address, to: 'platform',
    amount: charged, buybackPool, platformFee, paymentMethod, timestamp: Date.now(),
  });

  logger.info(`EACO payment: ${charged} from ${address} (method=${paymentMethod}, buyback=${buybackPool})`);
  return { charged, discount, buybackPool, balance: newBalance, txId };
}

/**
 * Get transaction history for an address.
 * @param {string} address
 * @returns {Array}
 */
function getTransactions(address) {
  return transactions.filter(t => t.from === address || t.to === address);
}

module.exports = {
  getBalance, deposit, withdraw, transfer, deductPayment, getTransactions,
  EACO_MINT_ADDRESS, EACO_DECIMALS,
};
