# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

FounderOS is a single Next.js 15 (App Router) application with co-located API routes. Not a monorepo. See `README.md` for the full tech stack and route table.

### Required Services

| Service | How to start | Notes |
|---|---|---|
| PostgreSQL 15 | `sudo docker compose up -d postgres` | Schema auto-loads from `database/init.sql` on first start. Data persists in `./data/postgres/`. |
| Next.js Dev Server | `npm run dev` | Runs on port 3000. |

Redis and the mail server are defined in `docker-compose.yml` but have zero runtime usage in source code; they are not required.

### Key Gotchas

- **No lockfile**: The repo has no `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`. Use `npm install` (not `npm ci`).
- **Pre-existing ESLint errors**: `npm run lint` and `npm run build` fail due to ~20 pre-existing lint errors (unescaped entities, hooks rules). The dev server (`npm run dev`) works fine regardless.
- **Supabase Auth middleware**: All `/api/*` routes (except `/api/events/health`) require a Supabase session via `src/middleware.ts`. Without valid Supabase credentials, API routes return 401. Frontend pages render normally without auth.
- **DB connection for local dev**: When running Next.js outside Docker, set `DB_HOST=localhost` in `.env.local` (the `docker-compose.yml` default uses `postgres` as hostname which only works inside the Docker network).
- **Docker daemon**: Must start `dockerd` before using `docker compose`. In this cloud environment, Docker requires `fuse-overlayfs` storage driver and `iptables-legacy`.

### Starting Services

1. Start Docker daemon: `sudo dockerd &>/dev/null &` (wait ~3s)
2. Start PostgreSQL: `sudo docker compose up -d postgres` (wait for healthy)
3. Start dev server: `npm run dev` (port 3000)

### Seeding Test Data

- **Inbox**: `DATABASE_URL=postgresql://founderos:changeme123@localhost:5432/founderos node scripts/seed-inbox.js` — seeds 200 messages across 50 threads plus 2 classification rules.
- **CRM contact (manual)**: Insert directly via `sudo docker exec founderos-db psql -U founderos -d founderos -c "INSERT INTO contacts ..."`.

### Common Commands

See `README.md` and `package.json` scripts. Key ones:

- **Dev server**: `npm run dev`
- **Lint**: `npm run lint`
- **Build**: `npm run build`
- **Inbox tests**: `npm run test:inbox` (requires running app + DB; see `Makefile`)

### Auth Limitation

Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) were not provided. Without them, all `/api/*` routes (except `/api/events/health`) return 401. Frontend pages render correctly but cannot load data from API routes. To fully test API-driven features (CRM CRUD, inbox loading, campaign management), valid Supabase project credentials are needed in `.env.local`.
