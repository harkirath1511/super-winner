# LLM Twin — Anonymous Survey Agent

A MetaMask-authenticated onboarding agent that builds a personal knowledge base for a user. The knowledge base is later used by a separate agent to answer surveys on the user's behalf while keeping their identity anonymous.

## How it works

1. **Connect** — User connects with MetaMask and signs a SIWE message (no email/password).
2. **Onboard** — An adaptive AI interviewer (Claude Haiku via Vercel AI Gateway) asks questions, searches the web, and proposes facts to store. Tool calls are interactive: search results render as cards, save/delete actions require explicit approval.
3. **Knowledge Base** — Facts are pinned to IPFS via Pinata. The pin-list index is private (Pinata JWT); the wallet address is pseudonymous so PII stays minimal.
4. **Dashboard** — Browse, filter, and delete stored facts.

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Auth**: MetaMask + Sign-In With Ethereum (SIWE) + iron-session
- **AI**: Vercel AI SDK v6 + AI Gateway → `anthropic/claude-haiku-4-5`
- **Search**: Tavily (`/search` + `/extract`)
- **Storage**: Pinata public IPFS pinning (classic API) — no database
- **UI**: Tailwind v4 with interactive tool-call cards

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env template:

   ```bash
   cp .env.example .env
   ```

3. Fill in all values in `.env`:

   | Variable | Where to get it |
   |---|---|
   | `AI_GATEWAY_API_KEY` | Vercel Dashboard → AI Gateway |
   | `PINATA_JWT` | [app.pinata.cloud](https://app.pinata.cloud/developers/api-keys) → New Key (pin + unpin + read) |
   | `PINATA_GATEWAY` | Your Pinata gateway URL (default: `https://gateway.pinata.cloud`) |
   | `TAVILY_API_KEY` | [app.tavily.com](https://app.tavily.com) |
   | `SESSION_SECRET` | Any random string ≥ 32 chars |
   | `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for dev |

4. Start the dev server:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — run ESLint
