# Gemini Primary AI Provider + Performance Design

**Date:** 2026-06-12  
**Status:** Approved  
**Scope:** `api/` Rust engine only

---

## Problem

Portfolio generation is too slow. Two root causes:

1. **No fast primary AI provider.** NVIDIA NIM is the current Tier 1, but flash-class models are absent and NIM's large models (nemotron-550B) can take 72s. Every generation pays full AI latency for every repo.
2. **No caching.** Repo summaries are regenerated from scratch on every job, even when the repo hasn't changed. For users iterating on theme selection or re-generating after minor changes, this is wasted work.

Additionally: `AiService` is reconstructed per-job (4 new HTTP clients per generation), the concurrency semaphore (3) was sized for Groq's 30 RPM limit, and 400ms artificial delays exist between fallback retries.

---

## Goals

- Gemini 2.5 Flash Lite as the primary AI provider (fast, high-quota, API-key auth)
- New provider fallback order: **Gemini → NIM → OpenRouter → Groq**
- Redis repo-summary cache to eliminate redundant AI calls
- Shared `AiService` in `AppState` (single HTTP client pool for all jobs)
- Concurrency raised to 8; retry delays reduced to 100ms

---

## Non-Goals

- Streaming responses (SSE)
- Google Cloud service account / Vertex AI endpoint (using Google AI Studio API key instead)
- Changes to the Next.js frontend or data fetching layer
- New language support in the AST service

---

## Architecture

### Provider Layer (`services/ai.rs`)

Add a `gemini` field to `AiService`. The Gemini provider uses the OpenAI-compatible endpoint:

```
Base URL: https://generativelanguage.googleapis.com/v1beta/openai
Auth:     Authorization: Bearer $GOOGLE_API_KEY
Timeout:  30s
```

Model chain within Gemini tier (Tier 0):
```
gemini-2.5-flash-lite   ← primary (sub-5s, 1000 RPM)
gemini-2.5-flash        ← fallback within tier
```

Updated four-tier fallback in `call_ai`:
```
Tier 0: Gemini     — 1000 RPM, no daily cap   → PRIMARY
Tier 1: NIM        — 40 RPM, no daily cap      → secondary
Tier 2: OpenRouter — 1K RPD free tier          → tertiary
Tier 3: Groq       — 30 RPM, 12K TPM, 1K RPD  → last resort
```

Groq moves to last resort (was secondary) because its tight TPM cap gets saturated by large repo prompts.

### Config (`config.rs`)

Add:
```rust
pub google_api_key: String,
pub google_base_url: String,  // default: https://generativelanguage.googleapis.com/v1beta/openai
```

`GOOGLE_API_KEY` is required at startup. The three existing keys remain required (graceful degradation depends on all tiers being available).

### AiService in AppState (`state.rs`)

Move `AiService` construction from inside `run_generation` to `AppState::new`. All jobs share one `Arc<AiService>` via `state.ai`. This eliminates 4 `reqwest::Client` constructions per job.

```rust
pub struct AppState {
    pub db: sqlx::PgPool,
    pub redis: redis::aio::ConnectionManager,
    pub config: Config,
    pub jobs: DashMap<Uuid, GenerationJob>,
    pub ai: Arc<AiService>,  // ← new
}
```

`worker.rs` changes: remove `let ai_svc = Arc::new(AiService::new(&state.config));`, use `state.ai.clone()`.

### Redis Repo-Summary Cache (`services/cache.rs` — new file)

Cache key derivation:

```
key:   repo_summary:v1:{repo_name}:{hash(readme_prefix + language + file_count)}
TTL:   86400s (24h)
value: the summary string (plain text)
```

Hash input: SHA-256 of `"{repo_name}|{readme[..500]}|{language}|{file_count}|{function_count}"`, hex-encoded.  
Uses the `sha2` crate (added to `Cargo.toml`). This is stable across Rust versions and cheap to compute.

Cache interface:
```rust
pub async fn get_repo_summary(redis: &ConnectionManager, key: &str) -> Option<String>
pub async fn set_repo_summary(redis: &ConnectionManager, key: &str, summary: &str)
```

In Phase 2 of `worker.rs`, check cache before calling AI. On hit, log `cache_hit = true` and skip the semaphore/AI entirely.

### Concurrency + Retry Tuning (`worker.rs`)

| Parameter | Before | After |
|-----------|--------|-------|
| `Semaphore::new(N)` | 3 | 8 |
| Inter-model retry delay | 400ms | 100ms |
| Gemini timeout | — | 30s |
| NIM timeout | 120s | 90s |

The semaphore governs peak concurrent AI calls. With Gemini at 1000 RPM and typical repo summaries at ~300 tokens output, 8 concurrent requests still leaves headroom. NIM timeout reduced from 120s to 90s — the 120s was observed on nemotron-550B which is no longer in the primary chain.

### AstService Parser Reuse

`AstService::new()` on line 279 of `worker.rs` (inside the Phase 3 map) re-creates parsers unnecessarily. `metadata_to_json` does not use the parser — convert it to a standalone `pub fn ast_metadata_to_json(meta: &AstMetadata) -> serde_json::Value` free function in `ast.rs`. The call site in `worker.rs` calls the free function directly with no `AstService` construction.

---

## Data Flow (updated)

```
Phase 1: AST parse       — join_all, CPU-bound, spawn_blocking per repo
Phase 2: AI summaries    — join_all w/ semaphore(8), cache-first
            ↓ cache hit  → Redis lookup ~1ms
            ↓ cache miss → Gemini call ~2-5s → write to cache
Phase 3: DB upserts      — join_all, parallel
Phase 4: MDX assembly    — single AI call (Gemini primary)
```

Expected Phase 2 latency (10 repos, all cache misses):
- Before: ~40s (3 concurrent × NIM latency)
- After:  ~8s  (8 concurrent × Gemini Flash Lite ~2s)

Expected Phase 2 latency (10 repos, all cache hits):
- After: ~50ms (10 × Redis lookup)

---

## Files Changed

| File | Change |
|------|--------|
| `api/src/config.rs` | Add `google_api_key`, `google_base_url` fields |
| `api/src/services/ai.rs` | Add Gemini as Tier 0; reorder fallback; update semaphore/delays |
| `api/src/services/cache.rs` | New: Redis cache helpers for repo summaries |
| `api/src/services/mod.rs` | Export `cache` module |
| `api/src/services/ast.rs` | Convert `metadata_to_json` to free function `ast_metadata_to_json(meta: &AstMetadata)` |
| `api/Cargo.toml` | `cargo add sha2` — stable SHA-256 for cache key hashing |
| `api/src/state.rs` | Add `ai: Arc<AiService>` field |
| `api/src/services/worker.rs` | Use `state.ai`; add cache lookups in Phase 2; raise semaphore |
| `api/.env.example` | Add `GOOGLE_API_KEY`, `GOOGLE_BASE_URL` |
| `api/Cargo.toml` | No new deps (reqwest already present; Redis already present) |

---

## Error Handling

- Cache read failure is non-fatal: log a warning, proceed to AI call.
- Cache write failure is non-fatal: log a warning, return the summary normally.
- If `GOOGLE_API_KEY` is missing at startup, the server refuses to start (same pattern as other keys).
- Gemini 429 (rate limit) triggers immediate fallback to NIM, same as any other HTTP error.

---

## Environment Variables

```bash
# Required (new)
GOOGLE_API_KEY=...

# Optional (new) — defaults shown
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
```

All existing variables (`NVIDIA_NIM_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`) remain required for full fallback coverage.
