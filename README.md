# FounderOS - Domain & Marketing Command Center

FounderOS is an all-in-one platform for managing domains, email marketing, and project management.

## Project Structure

- `src/app`: Next.js App Router (Frontend + API Routes)
- `src/components`: UI Components
- `src/domain`: Business logic and types (CRM, Automation, etc.)
- `database/init.sql`: Initial database schema
- `docker-compose.yml`: Multi-container setup (Next.js, Postgres, Redis, Mailserver)

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed on your machine.

### Running the Project

1. **Start the environment:**
   ```bash
   docker compose up --build
   ```

2. **Access the Dashboard:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Check Service Logs:**
   ```bash
   docker compose logs -f
   ```

## Development

### Adding Email Domains
The mail server is configured via `docker-compose.yml`. To add an email user, you can run:
```bash
docker exec -it founderos-mail setup email add admin@founderos.local Ss90902eight
```

### Database Access
You can connect to the Postgres database on port `5432` with:
- **User:** `founderos`
- **Password:** `changeme123` (or as set in `.env`)
- **Database:** `founderos`
