/**
 * @fileoverview Simple logger utility with timestamped, colorized console output
 * and optional file logging.
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const LOG_FILE = process.env.LOG_FILE || null;

/**
 * Format a log message with timestamp and level.
 * @param {string} level
 * @param {string} message
 * @returns {string}
 */
function formatMessage(level, message) {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] ${message}`;
}

/**
 * Write a line to the log file if configured.
 * @param {string} line
 */
function toFile(line) {
  if (!LOG_FILE) return;
  try {
    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch { /* ignore file write errors */ }
}

/** @param {...any} args */
function info(...args) {
  const msg = args.join(' ');
  const line = formatMessage('info', msg);
  console.log(`${COLORS.green}${line}${COLORS.reset}`);
  toFile(line);
}

/** @param {...any} args */
function warn(...args) {
  const msg = args.join(' ');
  const line = formatMessage('warn', msg);
  console.warn(`${COLORS.yellow}${line}${COLORS.reset}`);
  toFile(line);
}

/** @param {...any} args */
function error(...args) {
  const msg = args.join(' ');
  const line = formatMessage('error', msg);
  console.error(`${COLORS.red}${line}${COLORS.reset}`);
  toFile(line);
}

/** @param {...any} args */
function debug(...args) {
  if (process.env.LOG_LEVEL !== 'debug') return;
  const msg = args.join(' ');
  const line = formatMessage('debug', msg);
  console.log(`${COLORS.cyan}${line}${COLORS.reset}`);
  toFile(line);
}

module.exports = { info, warn, error, debug };
