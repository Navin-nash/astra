# Astra — API

Rust Axum processing engine for Astra. Receives pre-fetched repository content from Next.js, runs tree-sitter AST analysis and LLM generation, stores the result in Postgres, and serves public portfolios with Redis caching.

See the [root README](../README.md) for full project setup.

## Stack

- Rust 1.75+, Axum 0.7, Tokio
- sqlx 0.8 (Postgres, async, migrations)
- Redis 0.26 (async, multiplexed)
- tree-sitter 0.22 (JS, TS, Python, Rust, Go grammars)
- async-openai 0.27 (OpenAI-compatible)
- jsonwebtoken 9 (HS256 validation only)

## Module map

```
src/
├── main.rs            Entry point — server startup + migration
├── lib.rs             Router wiring (re-exported for integration tests)
├── config.rs          Typed config from environment
├── error.rs           AppError → HTTP response mapping
├── state.rs           AppState: DB pool + Redis + JWT service + job map
├── auth/
│   └── jwt.rs         JWT validation (tokens issued by Next.js)
├── middleware/
│   └── auth.rs        Bearer extraction → CurrentUser extension
├── models/
│   ├── portfolio.rs   Portfolio struct (sqlx::FromRow)
│   └── repository.rs  Repository struct + GithubRepoInfo
├── db/
│   ├── portfolios.rs  upsert, find_by_username, set_published, update_mdx
│   └── repositories.rs  upsert, find_by_portfolio
├── services/
│   ├── ast.rs         tree-sitter parsing + framework detection
│   ├── ai.rs          LLM repo summary + portfolio MDX assembly
│   └── worker.rs      Async pipeline: AST → AI → DB → Redis
└── routes/
    ├── health.rs      GET /health
    ├── generate.rs    POST /api/generate, GET /api/generate/:id
    └── portfolio.rs   Public + authenticated portfolio routes
```

## Dev commands

```bash
# Run API (applies migrations on startup)
cargo run

# Unit tests (no DB required)
cargo test --lib

# All tests (requires running Postgres from docker compose)
cargo test

# Type-check without building
cargo check

# Lint
cargo clippy -- -D warnings

# Format
cargo fmt
```

## Environment variables

Copy `api/.env.example` to `api/.env` and fill in:

```env
PORT=8080
ENVIRONMENT=development
DATABASE_URL=postgres://astra:astra_dev@localhost:5432/astra
REDIS_URL=redis://localhost:6379
JWT_SECRET=<must-match-web-env-local>
FRONTEND_URL=http://localhost:3000
GROQ_API_KEY=gsk_...
OPENAI_MODEL=llama-3.3-70b-versatile
# OPENAI_BASE_URL=https://api.groq.com/openai/v1  (this is the default)
```

## Endpoints

```
GET  /health                      Health check
GET  /api/portfolio/:username     Public portfolio (Redis cached, 24h TTL)

POST /api/generate                Start generation job  [JWT]
GET  /api/generate/:job_id        Poll job status       [JWT]
GET  /api/portfolio               User's own portfolio  [JWT]
PATCH /api/portfolio              Edit MDX / theme      [JWT]
POST /api/portfolio/publish       Go live               [JWT]
POST /api/portfolio/unpublish     Revert to draft       [JWT]
```

## Adding a language to AST parsing

1. Add the grammar crate to `Cargo.toml`:
   ```toml
   tree-sitter-ruby = "0.21"
   ```
2. Add a variant to `Language` enum in `services/ast.rs`
3. Map the extension in `Language::from_extension`
4. Add the `ts_lang` branch in `AstService::analyze`
5. Add a language name match in `worker.rs`

## JWT contract

The Rust API validates but never issues JWTs. Next.js signs tokens using the shared `JWT_SECRET`:

```json
{
  "sub": "<better-auth-user-id>",
  "username": "navinraj",
  "iat": 1234567890,
  "exp": 1234568490
}
```

Tokens have a 10-minute expiry. The API rejects anything outside that window.
