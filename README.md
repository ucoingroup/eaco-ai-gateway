# EACO Nexus — Decentralized AI Gateway

EACO-powered AI model token relay station with smart routing, on-chain billing, and 10-language support.

## Features

- **Smart Model Routing** — Auto-select optimal model based on task complexity (light/medium/heavy)
- **EACO Payment** — 20% discount for $EACO holders with transparent fee distribution
- **Cache Acceleration** — Redis-based caching reduces API costs up to 90%
- **Agent World Integration** — Universal identity across the agent internet
- **Token Economy** — 50/20/20/10 distribution: node operators, community ops, user growth, Earth Village charity
- **DAO Governance** — Stake $EACO, propose and vote on ecosystem decisions
- **10 Languages** — EN, ZH, ES, FR, DE, AR, JA, KO, PT, RU with RTL support

## Quick Start

```bash
# 1. Install dependencies (Node.js >= 18)
npm install

# 2. Copy env config
cp .env.example .env
# Edit .env with your API keys

# 3. Start server
npm start
```

Server runs at http://localhost:3000

## Docker

```bash
docker compose up -d
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/health | Health check |
| POST | /api/v1/chat/completions | Chat (OpenAI-compatible) |
| GET | /api/v1/models | Available models + pricing |
| GET | /api/v1/pricing | Detailed pricing |
| POST | /api/v1/eaco/balance | Query EACO balance |
| POST | /api/v1/eaco/deposit | EACO deposit |
| POST | /api/v1/eaco/transfer | EACO transfer |
| POST | /api/v1/eaco/stake | Stake EACO for node operation |
| POST | /api/v1/eaco/distribution | Query distribution pools |
| POST | /api/v1/dao/proposals | Create governance proposal |
| POST | /api/v1/dao/vote | Vote on proposal |
| GET | /api/v1/dao/proposals | List proposals |
| POST | /api/v1/agent-world/register | Agent World register |
| POST | /api/v1/agent-world/verify | Agent World verify |

## EACO Token Economy

Fee distribution from every API call:

| Allocation | Share | Purpose |
|-----------|-------|---------|
| Node Operators | 50% | Reward relay node infrastructure |
| Community Operations | 20% | Fund community building |
| User Growth | 20% | Incentivize new user acquisition |
| Earth Village Charity 🌍 | 10% | Global public benefit |

## EACO Token

- **Name**: EACO (Earth's Best Coin)
- **Chain**: Solana
- **CA**: `DqfoyZH96RnvZusSp3Cdncjpyp3C74ZmJzGhjmHnDHRH`

## Links

- [1万年文明推演](https://10000.base44.app/)
- [EACO DEX Bot](https://eaco-dexbot.base44.app/)
- [Earth EACO 3000 Good Deeds](https://eaco-kind-path.base44.app/)
- [Agent World](https://world.coze.com)

## License

MIT
