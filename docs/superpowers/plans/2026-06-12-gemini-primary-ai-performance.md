# Gemini Primary AI Provider + Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Gemini 2.5 Flash Lite as the primary AI provider, reduce portfolio generation time via Redis repo-summary caching, and eliminate per-job HttpClient construction.

**Architecture:** Gemini uses the OpenAI-compatible `generativelanguage.googleapis.com/v1beta/openai` endpoint with `GOOGLE_API_KEY` as a Bearer token — no SDK needed, slots into the existing `Provider` struct. `AiService` moves from per-job construction into `AppState` so one HTTP client pool is shared across all concurrent jobs. A Redis cache keyed by SHA-256 of repo content signals eliminates AI calls for unchanged repos on re-generation.

**Tech Stack:** Rust, Axum, `reqwest 0.12`, `redis 0.26`, `sha2 0.10` (new), `sqlx 0.8`, `tokio`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `api/Cargo.toml` | Modify | Add `sha2` dependency |
| `api/.env.example` | Modify | Document new env vars |
| `api/src/config.rs` | Modify | Add `google_api_key`, `google_base_url` |
| `api/src/services/cache.rs` | **Create** | Redis repo-summary cache helpers |
| `api/src/services/mod.rs` | Modify | Export `cache` module |
| `api/src/services/ast.rs` | Modify | Convert `metadata_to_json` to free function |
| `api/src/services/ai.rs` | Modify | Gemini Tier 0; reorder providers; tune timeouts/delays |
| `api/src/state.rs` | Modify | Add `ai: Arc<AiService>` field |
| `api/src/services/worker.rs` | Modify | Use `state.ai`; cache in Phase 2; semaphore → 8 |

---

## Task 1: Add sha2 dependency

**Files:**
- Modify: `api/Cargo.toml`

- [ ] **Step 1: Add the dependency**

Run from `api/` directory:
```bash
cargo add sha2
```

- [ ] **Step 2: Verify it compiles**

```bash
cargo check
```

Expected: `Finished` with no errors.

- [ ] **Step 3: Commit**

```bash
git add api/Cargo.toml api/Cargo.lock
git commit -m "chore(api): add sha2 for stable cache key hashing"
```

---

## Task 2: Update Config with Google API key

**Files:**
- Modify: `api/src/config.rs`
- Modify: `api/.env.example`

- [ ] **Step 1: Write the failing test**

At the bottom of `api/src/config.rs`, add:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_fails_without_google_api_key() {
        // Temporarily unset to isolate this test — runs in a subprocess-safe way
        // by checking the error message pattern only when the var is absent.
        // In CI all vars are set; this test documents the requirement.
        if std::env::var("GOOGLE_API_KEY").is_err() {
            let result = Config::from_env();
            assert!(result.is_err());
            let msg = result.unwrap_err().to_string();
            assert!(msg.contains("GOOGLE_API_KEY"), "Expected GOOGLE_API_KEY in error, got: {msg}");
        }
    }
}
```

- [ ] **Step 2: Run test to verify it fails (or is skipped if var is set)**

```bash
cargo test -p astra-api config -- --nocapture
```

Expected: either FAIL (var absent) or PASS/skip (var present in env).

- [ ] **Step 3: Add constant and struct fields**

In `api/src/config.rs`, after the existing base URL constants add:

```rust
const GOOGLE_BASE_URL: &str = "https://generativelanguage.googleapis.com/v1beta/openai";
```

Add two fields to the `Config` struct after `openrouter_base_url`:

```rust
/// Primary AI provider — Gemini 2.5 Flash Lite (1000 RPM, API-key auth)
pub google_api_key: String,
pub google_base_url: String,
```

- [ ] **Step 4: Load from env**

In `Config::from_env()`, inside the `Ok(Self { ... })` block, after `openrouter_base_url`, add:

```rust
google_api_key: std::env::var("GOOGLE_API_KEY")
    .context("GOOGLE_API_KEY must be set (Gemini primary AI provider)")?,
google_base_url: std::env::var("GOOGLE_BASE_URL")
    .unwrap_or_else(|_| GOOGLE_BASE_URL.into()),
```

- [ ] **Step 5: Update .env.example**

Open `api/.env.example` and add after the existing AI provider vars:

```bash
# Primary AI — Gemini 2.5 Flash Lite (Google AI Studio)
GOOGLE_API_KEY=your_google_api_key_here
# Optional — defaults to Google AI Studio endpoint
# GOOGLE_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
```

- [ ] **Step 6: Verify build**

```bash
cargo check
```

Expected: `Finished` with no errors.

- [ ] **Step 7: Commit**

```bash
git add api/src/config.rs api/.env.example
git commit -m "feat(api): add GOOGLE_API_KEY config for Gemini primary provider"
```

---

## Task 3: Create Redis repo-summary cache service

**Files:**
- Create: `api/src/services/cache.rs`
- Modify: `api/src/services/mod.rs`

- [ ] **Step 1: Write the failing test (pure cache key function)**

Create `api/src/services/cache.rs` with just the test first:

```rust
use sha2::{Sha256, Digest};
use redis::AsyncCommands;

use crate::services::ast::AstMetadata;

const CACHE_TTL_SECS: u64 = 86400;

#[cfg(test)]
mod tests {
    use super::*;

    fn make_meta(language: &str, file_count: usize, function_count: usize) -> AstMetadata {
        AstMetadata {
            language: language.to_owned(),
            file_count,
            function_count,
            ..Default::default()
        }
    }

    #[test]
    fn cache_key_is_deterministic() {
        let meta = make_meta("rust", 5, 20);
        let k1 = repo_summary_cache_key("my-repo", Some("readme content"), &meta);
        let k2 = repo_summary_cache_key("my-repo", Some("readme content"), &meta);
        assert_eq!(k1, k2);
    }

    #[test]
    fn cache_key_differs_on_language_change() {
        let meta_rs = make_meta("rust", 5, 20);
        let meta_ts = make_meta("typescript", 5, 20);
        let k1 = repo_summary_cache_key("my-repo", None, &meta_rs);
        let k2 = repo_summary_cache_key("my-repo", None, &meta_ts);
        assert_ne!(k1, k2);
    }

    #[test]
    fn cache_key_differs_on_readme_change() {
        let meta = make_meta("rust", 5, 20);
        let k1 = repo_summary_cache_key("my-repo", Some("v1 readme"), &meta);
        let k2 = repo_summary_cache_key("my-repo", Some("v2 readme"), &meta);
        assert_ne!(k1, k2);
    }

    #[test]
    fn cache_key_has_expected_prefix() {
        let meta = make_meta("go", 3, 10);
        let key = repo_summary_cache_key("awesome-go", None, &meta);
        assert!(key.starts_with("repo_summary:v1:awesome-go:"), "unexpected key: {key}");
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cargo test -p astra-api cache -- --nocapture
```

Expected: FAIL — `repo_summary_cache_key` not defined.

- [ ] **Step 3: Implement the full cache module**

Replace the contents of `api/src/services/cache.rs` with:

```rust
use sha2::{Sha256, Digest};
use redis::AsyncCommands;

use crate::services::ast::AstMetadata;

const CACHE_TTL_SECS: u64 = 86400;

/// Deterministic cache key for a repo summary.
/// Input: repo name + first 500 chars of README + language + file/function counts.
/// Uses SHA-256 so the key is stable across Rust versions.
pub fn repo_summary_cache_key(repo_name: &str, readme: Option<&str>, ast: &AstMetadata) -> String {
    let readme_prefix: String = readme.unwrap_or("").chars().take(500).collect();
    let input = format!(
        "{}|{}|{}|{}|{}",
        repo_name, readme_prefix, ast.language, ast.file_count, ast.function_count
    );
    let hash = format!("{:x}", Sha256::digest(input.as_bytes()));
    format!("repo_summary:v1:{}:{}", repo_name, &hash[..16])
}

/// Returns a cached repo summary, or `None` on miss or error.
/// Errors are non-fatal: logged as warnings, caller falls back to AI.
pub async fn get_repo_summary(client: &redis::Client, key: &str) -> Option<String> {
    let mut conn = match client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(e) => {
            tracing::warn!(cache_key = key, error = %e, "Redis connect failed on cache GET");
            return None;
        }
    };
    match conn.get::<_, Option<String>>(key).await {
        Ok(val) => val,
        Err(e) => {
            tracing::warn!(cache_key = key, error = %e, "cache GET failed");
            None
        }
    }
}

/// Writes a repo summary to Redis with a 24h TTL.
/// Errors are non-fatal: logged as warnings, caller continues normally.
pub async fn set_repo_summary(client: &redis::Client, key: &str, summary: &str) {
    let mut conn = match client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(e) => {
            tracing::warn!(cache_key = key, error = %e, "Redis connect failed on cache SET");
            return;
        }
    };
    if let Err(e) = conn.set_ex::<_, _, ()>(key, summary, CACHE_TTL_SECS).await {
        tracing::warn!(cache_key = key, error = %e, "cache SET failed");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_meta(language: &str, file_count: usize, function_count: usize) -> AstMetadata {
        AstMetadata {
            language: language.to_owned(),
            file_count,
            function_count,
            ..Default::default()
        }
    }

    #[test]
    fn cache_key_is_deterministic() {
        let meta = make_meta("rust", 5, 20);
        let k1 = repo_summary_cache_key("my-repo", Some("readme content"), &meta);
        let k2 = repo_summary_cache_key("my-repo", Some("readme content"), &meta);
        assert_eq!(k1, k2);
    }

    #[test]
    fn cache_key_differs_on_language_change() {
        let meta_rs = make_meta("rust", 5, 20);
        let meta_ts = make_meta("typescript", 5, 20);
        let k1 = repo_summary_cache_key("my-repo", None, &meta_rs);
        let k2 = repo_summary_cache_key("my-repo", None, &meta_ts);
        assert_ne!(k1, k2);
    }

    #[test]
    fn cache_key_differs_on_readme_change() {
        let meta = make_meta("rust", 5, 20);
        let k1 = repo_summary_cache_key("my-repo", Some("v1 readme"), &meta);
        let k2 = repo_summary_cache_key("my-repo", Some("v2 readme"), &meta);
        assert_ne!(k1, k2);
    }

    #[test]
    fn cache_key_has_expected_prefix() {
        let meta = make_meta("go", 3, 10);
        let key = repo_summary_cache_key("awesome-go", None, &meta);
        assert!(key.starts_with("repo_summary:v1:awesome-go:"), "unexpected key: {key}");
    }
}
```

- [ ] **Step 4: Export the cache module**

Replace `api/src/services/mod.rs` contents with:

```rust
pub mod ai;
pub mod ast;
pub mod cache;
pub mod worker;
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cargo test -p astra-api cache -- --nocapture
```

Expected: 4 tests PASS.

- [ ] **Step 6: Verify build**

```bash
cargo check
```

Expected: `Finished` with no errors.

- [ ] **Step 7: Commit**

```bash
git add api/src/services/cache.rs api/src/services/mod.rs
git commit -m "feat(api): add Redis repo-summary cache with SHA-256 keying"
```

---

## Task 4: Convert `metadata_to_json` to a free function

**Files:**
- Modify: `api/src/services/ast.rs` line 618
- Modify: `api/src/services/worker.rs` line 279

- [ ] **Step 1: Write the failing test**

Add to `api/src/services/ast.rs` (at the very end, inside an existing or new `#[cfg(test)]` block):

```rust
#[cfg(test)]
mod json_tests {
    use super::*;

    #[test]
    fn ast_metadata_to_json_round_trips() {
        let meta = AstMetadata {
            language: "rust".to_owned(),
            file_count: 3,
            function_count: 12,
            ..Default::default()
        };
        let val = ast_metadata_to_json(&meta);
        assert_eq!(val["language"], "rust");
        assert_eq!(val["file_count"], 3);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cargo test -p astra-api ast_metadata_to_json -- --nocapture
```

Expected: FAIL — `ast_metadata_to_json` not defined.

- [ ] **Step 3: Add the free function**

In `api/src/services/ast.rs`, directly after the closing brace of `impl AstService` (after line 619), add:

```rust
/// Serializes `AstMetadata` to a JSON value for database storage.
/// Free function — does not require an `AstService` instance.
pub fn ast_metadata_to_json(meta: &AstMetadata) -> serde_json::Value {
    serde_json::to_value(meta).unwrap_or(serde_json::Value::Null)
}
```

Keep the original `metadata_to_json` method in place for now — it will be removed in Step 5 after the call site is updated.

- [ ] **Step 4: Run test to verify it passes**

```bash
cargo test -p astra-api ast_metadata_to_json -- --nocapture
```

Expected: PASS.

- [ ] **Step 5: Update the call site in worker.rs**

In `api/src/services/worker.rs`, find line 279:

```rust
let ast_json = AstService::new().metadata_to_json(&ast_meta);
```

Replace with:

```rust
let ast_json = ast::ast_metadata_to_json(&ast_meta);
```

Also add `ast` to the import block at the top of worker.rs. Find:

```rust
use crate::{
    db,
    error::Result,
    models::repository::GithubRepoInfo,
    services::{
        ai::{AiService, ContributionInput, RepoSummaryInput},
        ast::{AstMetadata, AstService, SourceFile},
    },
    state::AppState,
};
```

Change to:

```rust
use crate::{
    db,
    error::Result,
    models::repository::GithubRepoInfo,
    services::{
        ai::{AiService, ContributionInput, RepoSummaryInput},
        ast::{self, AstMetadata, AstService, SourceFile},
    },
    state::AppState,
};
```

- [ ] **Step 6: Remove the now-unused method from AstService**

In `api/src/services/ast.rs`, delete the `metadata_to_json` method (lines 618–620):

```rust
pub fn metadata_to_json(&self, meta: &AstMetadata) -> Value {
    serde_json::to_value(meta).unwrap_or(Value::Null)
}
```

- [ ] **Step 7: Verify build**

```bash
cargo check
```

Expected: `Finished` with no errors.

- [ ] **Step 8: Commit**

```bash
git add api/src/services/ast.rs api/src/services/worker.rs
git commit -m "refactor(api): convert metadata_to_json to a free function"
```

---

## Task 5: Add Gemini Tier 0 to AiService and tune providers

**Files:**
- Modify: `api/src/services/ai.rs`

- [ ] **Step 1: Add GEMINI_MODELS constant**

In `api/src/services/ai.rs`, add after the existing comment block at the top (before `NIM_MODELS`):

Replace the entire model constants section (lines 11–43) with:

```rust
// ── Model fallback chains ──────────────────────────────────────────────────────
//
// Provider routing order (fastest/highest-quota first):
//   Tier 0: Gemini     — 1000 RPM, no daily cap  → PRIMARY
//   Tier 1: NVIDIA NIM — 40 RPM, no daily cap    → secondary
//   Tier 2: OpenRouter — 1K RPD free tier         → tertiary
//   Tier 3: Groq       — 30 RPM, 12K TPM, 1K RPD → last resort (TPM cap kills large prompts)
//
// Within each tier, models are tried index-0 first.

/// Gemini chain — Flash Lite is sub-5s and 1000 RPM; Flash is the tier fallback.
const GEMINI_MODELS: &[&str] = &[
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
];

/// NVIDIA NIM chain — ordered fastest-first.
const NIM_MODELS: &[&str] = &[
    "deepseek-ai/deepseek-v4-flash",
    "qwen/qwen3-next-80b-a3b-instruct",
    "mistralai/mistral-nemotron",
    "moonshotai/kimi-k2.6",
    "z-ai/glm-5.1",
    "nvidia/nemotron-3-ultra-550b-a55b",
];

/// Groq chain — last resort; 12K TPM cap saturated by large repo prompts.
const GROQ_MODELS: &[&str] = &["llama-3.3-70b-versatile"];

/// OpenRouter free-tier chain — tertiary to preserve 1K RPD daily budget.
const OR_MODELS: &[&str] = &[
    "moonshotai/kimi-k2.6:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "z-ai/glm-4.5-air:free",
    "qwen/qwen3-coder:free",
    "meta-llama/llama-3.3-70b-instruct:free",
];
```

- [ ] **Step 2: Add gemini field to AiService struct**

Find the `AiService` struct (around line 170) and replace it with:

```rust
pub struct AiService {
    gemini: Provider,
    nim: Provider,
    openrouter: Provider,
    groq: Provider,
}
```

- [ ] **Step 3: Update AiService::new to build all four providers**

Replace the `AiService::new` impl with:

```rust
pub fn new(config: &Config) -> Self {
    Self {
        // Gemini Flash Lite: 1000 RPM, sub-5s for repo summaries; 30s is generous
        gemini: Provider::new("gemini", &config.google_base_url, &config.google_api_key, 30),
        // NIM: 40 RPM, no daily cap; reduced to 90s (nemotron-550B is last resort now)
        nim: Provider::new("nvidia-nim", &config.nvidia_nim_base_url, &config.nvidia_nim_api_key, 90),
        // OpenRouter free tier — variable latency; 90s covers slow queues
        openrouter: Provider::new("openrouter", &config.openrouter_base_url, &config.openrouter_api_key, 90),
        // Groq: fast but 12K TPM; 60s is plenty
        groq: Provider::new("groq", &config.groq_base_url, &config.groq_api_key, 60),
    }
}
```

- [ ] **Step 4: Replace call_ai with the four-tier implementation**

Find the `call_ai` method and replace it entirely with:

```rust
/// Four-tier ordered-fallback dispatcher.
///
/// Tier 0: Gemini (1000 RPM) → Tier 1: NIM (40 RPM) → Tier 2: OpenRouter (1K RPD) → Tier 3: Groq (30 RPM, 12K TPM)
/// Within each tier, models are tried from index 0 downward.
async fn call_ai(
    &self,
    messages: &[ChatMsg],
    max_tokens: u32,
    temperature: f32,
) -> Result<String> {
    // ── Tier 0: Gemini — primary, fastest, 1000 RPM ───────────────────────
    for (i, &model) in GEMINI_MODELS.iter().enumerate() {
        match self.gemini.chat(model, messages, max_tokens, temperature).await {
            Ok(text) => {
                let preview: String = text.chars().take(120).collect();
                tracing::info!(provider = "gemini", model, preview = %preview, "AI call succeeded");
                return Ok(text);
            }
            Err(e) => {
                tracing::warn!(
                    provider = "gemini", model, position = i + 1,
                    total = GEMINI_MODELS.len(), error = %e,
                    "Gemini model failed, trying next"
                );
                if i < GEMINI_MODELS.len() - 1 {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
            }
        }
    }

    // ── Tier 1: NVIDIA NIM — 40 RPM, no daily cap ────────────────────────
    tracing::warn!("Gemini exhausted, switching to NVIDIA NIM");
    for (i, &model) in NIM_MODELS.iter().enumerate() {
        match self.nim.chat(model, messages, max_tokens, temperature).await {
            Ok(text) => {
                let preview: String = text.chars().take(120).collect();
                tracing::info!(provider = "nvidia-nim", model, preview = %preview, "NIM fallback succeeded");
                return Ok(text);
            }
            Err(e) => {
                tracing::warn!(
                    provider = "nvidia-nim", model, position = i + 1,
                    total = NIM_MODELS.len(), error = %e,
                    "NIM model failed, trying next"
                );
                if i < NIM_MODELS.len() - 1 {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
            }
        }
    }

    // ── Tier 2: OpenRouter — tertiary; preserve 1K RPD budget ────────────
    tracing::warn!("NIM exhausted, switching to OpenRouter");
    for (i, &model) in OR_MODELS.iter().enumerate() {
        match self.openrouter.chat(model, messages, max_tokens, temperature).await {
            Ok(text) => {
                let preview: String = text.chars().take(120).collect();
                tracing::info!(provider = "openrouter", model, preview = %preview, "OpenRouter fallback succeeded");
                return Ok(text);
            }
            Err(e) => {
                tracing::warn!(
                    provider = "openrouter", model, position = i + 1,
                    total = OR_MODELS.len(), error = %e,
                    "OpenRouter model failed"
                );
                if i < OR_MODELS.len() - 1 {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
            }
        }
    }

    // ── Tier 3: Groq — last resort; 12K TPM can be saturated ────────────
    tracing::warn!("OpenRouter exhausted, switching to Groq (last resort — 12K TPM cap)");
    let mut last_err: Option<AppError> = None;

    for (i, &model) in GROQ_MODELS.iter().enumerate() {
        match self.groq.chat(model, messages, max_tokens, temperature).await {
            Ok(text) => {
                let preview: String = text.chars().take(120).collect();
                tracing::info!(provider = "groq", model, preview = %preview, "Groq last-resort succeeded");
                return Ok(text);
            }
            Err(e) => {
                tracing::warn!(
                    provider = "groq", model, position = i + 1,
                    total = GROQ_MODELS.len(), error = %e,
                    "Groq model failed"
                );
                last_err = Some(AppError::Ai(e.to_string()));
                if i < GROQ_MODELS.len() - 1 {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
            }
        }
    }

    tracing::error!("all four AI tiers exhausted (Gemini → NIM → OpenRouter → Groq)");
    Err(last_err.unwrap_or_else(|| AppError::Ai("all AI providers exhausted".into())))
}
```

- [ ] **Step 5: Verify build**

```bash
cargo check
```

Expected: `Finished` with no errors. If `config.google_api_key` or `config.google_base_url` are missing, the error will point to the Config struct — verify Task 2 completed correctly.

- [ ] **Step 6: Commit**

```bash
git add api/src/services/ai.rs
git commit -m "feat(api): add Gemini 2.5 Flash Lite as Tier 0 AI provider; reorder NIM→OR→Groq fallback"
```

---

## Task 6: Move AiService into AppState

**Files:**
- Modify: `api/src/state.rs`

- [ ] **Step 1: Add `ai` field to AppState**

In `api/src/state.rs`, add the import at the top of the use block:

```rust
use crate::{
    auth::jwt::JwtService,
    config::Config,
    error::{AppError, Result},
    services::{ai::AiService, worker::GenerationJob},  // ← add ai::AiService
};
```

Add `ai: Arc<AiService>` to the struct:

```rust
pub struct AppState {
    pub db: PgPool,
    pub redis: RedisClient,
    pub config: Arc<Config>,
    pub jwt: JwtService,
    pub jobs: Arc<DashMap<Uuid, GenerationJob>>,
    pub ai: Arc<AiService>,
}
```

- [ ] **Step 2: Construct AiService in from_pool**

Replace `from_pool` with:

```rust
pub async fn from_pool(db: PgPool, config: Config) -> Result<Self> {
    let redis = RedisClient::open(config.redis_url.as_str()).map_err(AppError::Redis)?;
    let jwt = JwtService::new(&config.jwt_secret);
    let ai = Arc::new(AiService::new(&config));
    let config = Arc::new(config);

    Ok(Self {
        db,
        redis,
        jwt,
        config,
        jobs: Arc::new(DashMap::new()),
        ai,
    })
}
```

Note: `AiService::new(&config)` is called before `Arc::new(config)` so we can pass a reference. The function only reads string fields, so no ownership conflict.

- [ ] **Step 3: Verify build**

```bash
cargo check
```

Expected: `Finished`. If `AiService` is not `Send + Sync`, the compiler will error on the `Arc` — it will be because `reqwest::Client` is both, so this should pass cleanly.

- [ ] **Step 4: Commit**

```bash
git add api/src/state.rs
git commit -m "refactor(api): move AiService into AppState to share HTTP client pool across jobs"
```

---

## Task 7: Integrate cache and use state.ai in worker.rs

**Files:**
- Modify: `api/src/services/worker.rs`

- [ ] **Step 1: Update imports**

At the top of `api/src/services/worker.rs`, update the `use crate::services` import block:

```rust
use crate::{
    db,
    error::Result,
    models::repository::GithubRepoInfo,
    services::{
        ai::{ContributionInput, RepoSummaryInput},
        ast::{self, AstMetadata, AstService, SourceFile},
        cache,
    },
    state::AppState,
};
```

Note: `AiService` is removed from the import — it's now accessed via `state.ai`.

- [ ] **Step 2: Remove per-job AiService construction and use state.ai**

In `run_generation`, find and delete this line (around line 140):

```rust
let ai_svc = Arc::new(AiService::new(&state.config));
```

Replace it with:

```rust
let ai_svc = state.ai.clone();
```

- [ ] **Step 3: Replace Phase 2 block with cache-first + raised concurrency**

Replace the entire Phase 2 closure (the `join_all(analyses.iter().map(...))` block) with:

```rust
let t2 = Instant::now();
let ai_sem = Arc::new(Semaphore::new(8));
let summaries: Vec<String> = join_all(analyses.iter().map(|(repo, ast_meta)| {
    let ai_svc = ai_svc.clone();
    let sem = ai_sem.clone();
    let redis_client = state.redis.clone();
    async move {
        // ── Cache-first: skip AI entirely if summary is unchanged ───────
        let cache_key = cache::repo_summary_cache_key(&repo.name, repo.readme.as_deref(), ast_meta);
        if let Some(cached) = cache::get_repo_summary(&redis_client, &cache_key).await {
            tracing::info!(job_id = %job_id, repo = %repo.name, "repo summary cache hit");
            return cached;
        }

        // ── Cache miss: acquire semaphore then call AI ───────────────────
        let _permit = sem.acquire_owned().await.expect("semaphore closed");
        let t = Instant::now();
        tracing::info!(job_id = %job_id, repo = %repo.name, "AI summary started");
        match ai_svc
            .generate_repo_summary(
                &repo.name,
                repo.description.as_deref(),
                repo.readme.as_deref(),
                ast_meta,
                repo.package_json.as_deref().or(repo.dependency_file.as_deref()),
                &repo.topics,
                repo.forks_count,
            )
            .await
        {
            Ok(s) => {
                tracing::info!(
                    job_id = %job_id,
                    repo = %repo.name,
                    elapsed_ms = t.elapsed().as_millis(),
                    chars = s.len(),
                    "AI summary succeeded"
                );
                cache::set_repo_summary(&redis_client, &cache_key, &s).await;
                s
            }
            Err(e) => {
                tracing::warn!(
                    job_id = %job_id,
                    repo = %repo.name,
                    elapsed_ms = t.elapsed().as_millis(),
                    "AI summary failed, using description fallback: {e}"
                );
                repo.description.clone().unwrap_or_else(|| repo.name.clone())
            }
        }
    }
}))
.await;
```

Replace from `let t2 = Instant::now();` through the closing `.await;` of the Phase 2 `join_all` with the block above. The new block includes the semaphore at `Semaphore::new(8)` — delete the old `Semaphore::new(3)` line as part of this replacement.

- [ ] **Step 4: Verify build**

```bash
cargo check
```

Expected: `Finished` with no errors.

- [ ] **Step 5: Run all tests**

```bash
cargo test -p astra-api -- --nocapture
```

Expected: all existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add api/src/services/worker.rs
git commit -m "perf(api): cache repo summaries in Redis, use shared AiService, concurrency 3→8"
```

---

## Task 8: Final verification

**Files:** none changed

- [ ] **Step 1: Full release build**

```bash
cargo build --release
```

Expected: `Finished release` with no errors or warnings.

- [ ] **Step 2: Run all tests**

```bash
cargo test -p astra-api
```

Expected: all tests pass.

- [ ] **Step 3: Confirm env is wired up**

Open `api/.env` and verify `GOOGLE_API_KEY` is set to a real value. If not, add it now. The server will refuse to start without it (by design).

- [ ] **Step 4: Smoke test against the running server**

```bash
cargo run
```

Then in another terminal:
```bash
curl -s http://localhost:8080/health | jq .
```

Expected: `{"status":"ok"}` or similar healthy response.

- [ ] **Step 5: Final commit if any minor cleanup was done**

```bash
git status
# Only commit if there are leftover changes; otherwise skip
```
