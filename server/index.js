/**
 * @fileoverview EACO AI Gateway — Express server entry point.
 * Bootstraps middleware, routes, static file serving, and error handling.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const { PORT } = require('./config');
const cache = require('./services/cache');
const logger = require('./utils/logger');
const apiRouter = require('./routes/api');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ──────────────────────────────────────────────────────────

app.use('/api/v1', apiRouter);

// ─── Static Files (frontend) ─────────────────────────────────────────────

const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
      if (err) res.status(404).json({ error: { message: 'Not found' } });
    });
  }
});

// ─── Error Handler ───────────────────────────────────────────────────────

app.use((err, req, res, _next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
});

// ─── Start ───────────────────────────────────────────────────────────────

async function start() {
  // Initialize cache
  await cache.init();

  app.listen(PORT, () => {
    logger.info('╔══════════════════════════════════════════╗');
    logger.info('║       EACO AI Gateway - Running          ║');
    logger.info(`║       Port: ${PORT}                         ║`);
    logger.info(`║       Env:  ${process.env.NODE_ENV || 'development'}           ║`);
    logger.info('╚══════════════════════════════════════════╝');
    logger.info(`API:  http://localhost:${PORT}/api/v1`);
    logger.info(`Chat: http://localhost:${PORT}/api/v1/chat/completions`);
    logger.info(`Docs: http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
