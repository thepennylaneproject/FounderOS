# FounderOS — Founder Operating System

> Part of <a href="https://thepennylaneproject.org">The Penny Lane Project</a> — technology that serves the individual.

## What This Is

FounderOS is an all-in-one command center for solo founders and small teams. It combines intelligent email management, CRM, campaign execution, domain management, and revenue operations into a single platform — replacing the scattered stack of tools most founders are forced to stitch together.

## Current Status

**Alpha** — The unified inbox, contact triage, AI-assisted email drafting, and campaign engine work end-to-end. Active development is focused on the intelligence layer (strategic briefs, momentum scoring) and the revenue operations module.

## Technical Overview

- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend:** Next.js API Routes (serverless-compatible), Node.js background jobs
- **Database:** PostgreSQL (via Supabase); local Docker Postgres for development
- **Auth:** Supabase Auth with server-side session management
- **AI:** Multi-provider routing (OpenAI, Anthropic, Mistral, Google, DeepSeek)
- **Email:** IMAP/SMTP via IMAPFlow + Nodemailer; unified inbox with AI classification
- **Deployment:** Docker Compose (self-hosted) or Vercel/cloud-hosted via Supabase

## Architecture

JAMstack-style Next.js monorepo with an App Router frontend and co-located API routes. Business logic lives in domain modules under `src/` (intelligence, campaigns, CRM, revenue). Background jobs run as cron-triggered API routes. Docker Compose wires together Next.js, PostgreSQL, Redis, and a mail server for local development.

## Development

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Node.js 18+
- Copy `.env.example` to `.env.local` and fill in required values

### Start the environment

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run without Docker

```bash
npm install
npm run dev
```

### Run inbox tests

```bash
npm run test:inbox
# or
make test-inbox
```

### Key routes

| Route | Description |
|---|---|
| `/` | Dashboard |
| `/inbox` | Unified inbox |
| `/inbox/receipts` | Receipt extraction |
| `/crm` | Contact CRM |
| `/campaigns` | Email campaigns |
| `/automations` | Workflow automation |
| `/domains` | Domain management |

## License

All rights reserved — © The Penny Lane Project
