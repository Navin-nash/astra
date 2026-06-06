# Astra

Zero-friction, AI-driven portfolio generator for developers. Point it at your GitHub repositories — Astra parses the code structure with tree-sitter, summarizes each project with an LLM, and assembles a production-ready MDX portfolio served instantly at `useastra.qzz.io/[username]`.

No forms. No manual writing. Your code is the source of truth.

---

## How it works

```
GitHub OAuth (Next.js)
        ↓
Repo selection + content fetch (Next.js → GitHub API)
        ↓
POST /api/generate  →  Rust worker
                           ├─ tree-sitter AST parsing
                           ├─ LLM summary per repo
                           ├─ MDX assembly
                           └─ Postgres + Redis cache
        ↓
Public portfolio at /[username]  (Next.js SSR → Redis → Postgres)
```

---

## Repository structure

```
astra/
├── web/          Next.js 16 — auth, UI, public portfolio rendering
├── api/          Rust Axum — AST parsing, AI generation, portfolio storage
├── docker-compose.yml
└── README.md
```

### `web/` — Next.js frontend

| Responsibility | Implementation |
|---|---|
| GitHub OAuth | Better Auth with GitHub provider |
| Session management | Better Auth sessions in Postgres |
| Repo content fetching | Server actions using Better Auth's stored OAuth token |
| Public portfolio rendering | App Router SSR + `next-mdx-remote` |
| Rust API client | Short-lived HS256 JWTs, server-side only |

### `api/` — Rust processing engine

| Responsibility | Implementation |
|---|---|
| AST parsing | tree-sitter (JS, TS, Python, Rust, Go) |
| AI generation | async-openai (OpenAI-compatible) |
| Portfolio storage | PostgreSQL via sqlx |
| Cache | Redis, 24h TTL, invalidated on publish |
| Auth | JWT validation only — no OAuth, no token storage |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Framer Motion |
| Auth | Better Auth (GitHub OAuth) |
| Processing API | Rust, Axum 0.7, Tokio |
| AST parsing | tree-sitter 0.22 |
| AI | OpenAI-compatible API (gpt-4o-mini default) |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Package manager | Bun (web), Cargo (api) |

---

## Prerequisites

- [Rust](https://rustup.rs/) 1.75+
- [Bun](https://bun.sh/) 1.0+
- [Docker](https://www.docker.com/) (for local Postgres + Redis)
- A [GitHub OAuth App](https://github.com/settings/developers)
- An OpenAI API key (or any OpenAI-compatible provider)

---

## Setup

### 1. Clone and enter the repo

```bash
git clone https://github.com/your-org/astra
cd astra
```

### 2. Create a GitHub OAuth App

Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**

| Field | Value |
|---|---|
| Application name | Astra (local) |
| Homepage URL | `http://localhost:3000` |
| Authorization callback URL | `http://localhost:3000/api/auth/callback/github` |

Copy the **Client ID** and **Client Secret** — you need them in both env files below.

### 3. Generate secrets

```bash
# JWT secret (shared between api and web — must be identical)
openssl rand -hex 32

# Better Auth secret (web only)
openssl rand -base64 32
```

### 4. Configure the Rust API

```bash
cp api/.env.example api/.env
```

Edit `api/.env`:

```env
PORT=8080
ENVIRONMENT=development

DATABASE_URL=postgres://astra:astra_dev@localhost:5432/astra
REDIS_URL=redis://localhost:6379

# Must match JWT_SECRET in web/.env.local exactly
JWT_SECRET=<your-generated-hex-secret>

FRONTEND_URL=http://localhost:3000

OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Optional: Anthropic or other OpenAI-compatible provider
# OPENAI_BASE_URL=https://api.anthropic.com/v1
```

### 5. Configure the Next.js frontend

Edit `web/.env.local`:

```env
DATABASE_URL=postgres://astra:astra_dev@localhost:5432/astra

NEXT_PUBLIC_APP_URL=http://localhost:3000
RUST_API_URL=http://localhost:8080

# Must match JWT_SECRET in api/.env exactly
JWT_SECRET=<your-generated-hex-secret>

GITHUB_CLIENT_ID=<from-your-github-oauth-app>
GITHUB_CLIENT_SECRET=<from-your-github-oauth-app>

BETTER_AUTH_SECRET=<your-generated-base64-secret>

OPENAI_API_KEY=sk-...
```

---

## Running locally

### Start infrastructure

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` and Redis on `localhost:6379`.

Verify they are healthy:

```bash
docker compose ps
```

### Start the Rust API

```bash
cd api
cargo run
```

On first run, sqlx automatically applies the database migrations. The API listens on `http://localhost:8080`.

```
astra-api listening on 0.0.0.0:8080
database migrations applied
```

### Start the Next.js frontend

```bash
cd web
bun dev
```

Open `http://localhost:3000`.

Better Auth creates its own session tables in Postgres on the first request.

---

## API reference

All protected routes require `Authorization: Bearer <jwt>` where the JWT is issued server-side by Next.js (`web/src/lib/rust-api.ts`).

### Public

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/portfolio/:username` | Public portfolio — Redis cached |

### Protected (JWT required)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/generate` | Start an async generation job |
| `GET` | `/api/generate/:job_id` | Poll job status |
| `GET` | `/api/portfolio` | Current user's portfolio |
| `PATCH` | `/api/portfolio` | Update MDX content or theme config |
| `POST` | `/api/portfolio/publish` | Make portfolio public |
| `POST` | `/api/portfolio/unpublish` | Revert to draft |

### `POST /api/generate` body

```json
{
  "user_id": "better-auth-user-id",
  "username": "navinraj",
  "avatar_url": "https://avatars.githubusercontent.com/...",
  "repos": [
    {
      "id": "123456",
      "name": "my-project",
      "full_name": "navinraj/my-project",
      "description": "A TypeScript monorepo",
      "html_url": "https://github.com/navinraj/my-project",
      "primary_language": "TypeScript",
      "topics": ["react", "nextjs"],
      "stars_count": 42,
      "forks_count": 3,
      "readme": "# My Project\n...",
      "package_json": "{\"dependencies\":{\"react\":\"^19\"}}",
      "main_source": "export function App() { ... }"
    }
  ]
}
```

### Job status response

```json
{
  "id": "uuid",
  "status": "parsing_ast | generating_content | assembling_portfolio | completed | failed",
  "progress": 75,
  "error": null
}
```

---

## Generation pipeline

When `POST /api/generate` is called, a Tokio worker runs in the background:

```
1. Upsert portfolio record (user_id + username)
2. For each repo (parallel):
   a. tree-sitter AST parse → extract functions, classes, imports, frameworks
   b. LLM call → 2-paragraph technical summary in MDX
   c. Save repository + AST metadata + summary to Postgres
3. LLM call → assemble full MDX portfolio from all repo summaries
4. Save MDX to portfolios table
5. Invalidate Redis cache for username
6. Set job status → completed
```

Total time target: **< 15 seconds** for 3-5 repositories.

---

## Database schema

The Rust API owns two tables. Better Auth manages its own `user`, `session`, and `account` tables separately.

```sql
-- portfolios — one per user
CREATE TABLE portfolios (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,   -- Better Auth user.id
    username TEXT NOT NULL UNIQUE,  -- GitHub login, used for public routing
    avatar_url TEXT,
    mdx_content TEXT NOT NULL DEFAULT '',
    theme_config JSONB NOT NULL DEFAULT '{}',
    is_published BOOLEAN NOT NULL DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- repositories — linked to portfolio
CREATE TABLE repositories (
    id UUID PRIMARY KEY,
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    github_repo_id TEXT NOT NULL,
    name TEXT, full_name TEXT, description TEXT,
    html_url TEXT, primary_language TEXT, topics JSONB,
    stars_count INTEGER, forks_count INTEGER,
    ast_metadata JSONB,   -- tree-sitter output
    ai_summary TEXT,      -- LLM-generated summary
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    UNIQUE (portfolio_id, github_repo_id)
);
```

---

## Testing

### Rust unit tests (no DB required)

```bash
cd api
cargo test --lib
```

Covers: JWT validation, AES-GCM crypto, tree-sitter AST parsing, middleware token extraction.

### Rust integration tests (requires running Postgres)

```bash
cd api
cargo test
```

Covers: DB upsert/read, portfolio publish visibility, MDX update.

### Type check (Next.js)

```bash
cd web
bun run build
```

---

## Environment variables reference

### `api/.env`

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | API listen port. Default: `8080` |
| `ENVIRONMENT` | No | `development` or `production`. Default: `development` |
| `DATABASE_URL` | Yes | Postgres connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | HS256 signing secret — must match `web/.env.local` |
| `FRONTEND_URL` | No | CORS allowed origin. Default: `http://localhost:3000` |
| `GROQ_API_KEY` | Yes | Groq API key — get one at console.groq.com |
| `OPENAI_MODEL` | No | Model name. Default: `llama-3.3-70b-versatile` |
| `OPENAI_BASE_URL` | No | Override to use a different provider. Default: `https://api.groq.com/openai/v1` |

### `web/.env.local`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Same Postgres instance as the API |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of the Next.js app |
| `RUST_API_URL` | Yes | Internal URL of the Rust API |
| `JWT_SECRET` | Yes | Must match `api/.env` exactly |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth App client secret |
| `BETTER_AUTH_SECRET` | Yes | Secret for Better Auth session signing |
| `GROQ_API_KEY` | No | Reference only — AI calls are made by the Rust API, not Next.js |

---

## AI provider

Astra uses **Groq** by default — the OpenAI-compatible inference API. Groq's `llama-3.3-70b-versatile` hits the < 15s generation target comfortably.

Get a free key at [console.groq.com](https://console.groq.com).

### Switching providers

The Rust API speaks to any OpenAI-compatible endpoint. Set `OPENAI_BASE_URL` and `OPENAI_MODEL` in `api/.env` to swap providers without touching code.

**Groq (default)**
```env
GROQ_API_KEY=gsk_...
OPENAI_MODEL=llama-3.3-70b-versatile
# OPENAI_BASE_URL defaults to https://api.groq.com/openai/v1
```

**Anthropic Claude**
```env
GROQ_API_KEY=sk-ant-...
OPENAI_BASE_URL=https://api.anthropic.com/v1
OPENAI_MODEL=claude-sonnet-4-6
```

**OpenAI**
```env
GROQ_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

**Local (Ollama)**
```env
GROQ_API_KEY=ollama
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=llama3.2
```

---

## Deployment

### Rust API

Build a release binary:

```bash
cd api
cargo build --release
./target/release/astra-api
```

Or containerize (add a `Dockerfile` at `api/`):

```dockerfile
FROM rust:1.75-slim AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/astra-api /usr/local/bin/
CMD ["astra-api"]
```

Recommended platforms: Railway, Render, AWS ECS, Fly.io.

### Next.js frontend

```bash
cd web
bun run build
bun start
```

Or deploy directly to Vercel — zero config for Next.js App Router.

### Managed database

Use [Neon](https://neon.tech), [Supabase](https://supabase.com), or any Postgres 16+ provider. Set the same `DATABASE_URL` in both env files.

---

## Project status

| Component | Status |
|---|---|
| Rust API — core pipeline | Complete |
| AST parsing (5 languages) | Complete |
| AI generation + MDX assembly | Complete |
| Redis caching | Complete |
| JWT auth middleware | Complete |
| Database migrations | Complete |
| Better Auth (GitHub OAuth) | Complete |
| Next.js → Rust API client | Complete |
| Dashboard — repo selection | In progress |
| Public portfolio page `/[username]` | In progress |
| MDX editor + preview | Planned |
| Custom domains | Planned |
| Private repo support | Planned |
| Deployment configs | Planned |