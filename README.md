# EACO Nexus — Decentralized AI Gateway

EACO-powered AI model token relay station with smart routing, on-chain billing, and 10-language support.

## Features

- **Smart Model Routing** — Auto-select optimal model based on task complexity (simple/routine/complex)
- **EACO Payment** — Solana on-chain settlement with 20% discount for $EACO holders
- **Cache Acceleration** — Redis-based caching reduces API costs up to 90%
- **Agent World Integration** — Universal identity across the agent internet
- **15 AI Models** — GPT-4o, Claude 3.5 Sonnet, DeepSeek V3, Gemini 1.5 Pro, Mistral Large, and more
- **10 Languages** — EN, ZH, ES, FR, DE, AR, JA, KO, PT, RU with RTL support

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env config
cp .env.example .env
# Edit .env with your API keys

# 3. Start server
npm start
```

Server runs at http://localhost:3000

## Architecture

```
eaco-ai-gateway/
├── frontend/
│   ├── index.html          # SPA (Tailwind + Font Awesome)
│   ├── css/style.css       # Custom styles
│   └── js/
│       ├── app.js          # App logic + API playground
│       └── i18n.js         # 10-language i18n
├── server/
│   ├── index.js            # Express entry point
│   ├── config.js           # Models, pricing, EACO config
│   ├── middleware/auth.js   # API key auth + rate limiting
│   ├── routes/api.js       # All API endpoints
│   ├── services/
│   │   ├── ai-providers.js # Multi-provider AI adapter
│   │   ├── cache.js        # Redis/memory cache
│   │   ├── eaco.js         # EACO payment service
│   │   └── router.js       # Smart model routing
│   └── utils/logger.js     # Logger
├── .env.example
└── package.json
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/chat/completions | Chat (OpenAI-compatible) |
| GET | /api/v1/models | Available models + pricing |
| GET | /api/v1/pricing | Detailed pricing |
| POST | /api/v1/eaco/balance | Query EACO balance |
| POST | /api/v1/eaco/deposit | EACO deposit |
| POST | /api/v1/eaco/transfer | EACO transfer |
| POST | /api/v1/agent-world/register | Agent World register |
| POST | /api/v1/agent-world/verify | Agent World verify |

## EACO Token

- **Name**: EACO (Earth's Best Coin)
- **Chain**: Solana
- **CA**: `DqfoyZH96RnvZusSp3Cdncjpyp3C74ZmJzGhjmHnDHRH`

## Links

- [1万年文明推演](https://10000.base44.app/)
- [EACO DEX Bot](https://eaco-dexbot.base44.app/)
- [Earth EACO 3000 Good Deeds](https://eaco-kind-path.base44.app/)
- [Agent World](https://world.coze.com)
