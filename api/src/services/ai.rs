use std::time::Duration;

use reqwest::{header, Client as HttpClient};

use crate::{
    config::Config,
    error::{AppError, Result},
    services::ast::AstMetadata,
};

// ── Model fallback chains ──────────────────────────────────────────────────────
//
// Provider routing order (fastest/highest-quota first):
//   Tier 0: Gemini     — 1000 RPM, no daily cap  → PRIMARY
//   Tier 1: NVIDIA NIM — 40 RPM, no daily cap    → secondary
//   Tier 2: OpenRouter — 1K RPD free tier         → tertiary
//   Tier 3: Groq       — 30 RPM, 12K TPM, 1K RPD → last resort (TPM cap kills large prompts)

/// Gemini chain — Flash Lite is sub-5s at 1000 RPM; Flash is the tier fallback.
const GEMINI_MODELS: &[&str] = &[
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
];

/// NVIDIA NIM chain — ordered fastest-first to minimise latency.
const NIM_MODELS: &[&str] = &[
    "deepseek-ai/deepseek-v4-flash",
    "qwen/qwen3-next-80b-a3b-instruct",
    "mistralai/mistral-nemotron",
    "moonshotai/kimi-k2.6",
    "z-ai/glm-5.1",
    "nvidia/nemotron-3-ultra-550b-a55b",
];

/// Groq chain — last resort; 12K TPM saturated by large repo prompts.
const GROQ_MODELS: &[&str] = &["llama-3.3-70b-versatile"];

/// OpenRouter free-tier chain — tertiary; preserves 1K RPD daily budget.
const OR_MODELS: &[&str] = &[
    "moonshotai/kimi-k2.6:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "z-ai/glm-4.5-air:free",
    "qwen/qwen3-coder:free",
    "meta-llama/llama-3.3-70b-instruct:free",
];

// ── Wire types ─────────────────────────────────────────────────────────────────

/// A single chat message sent in a request.
#[derive(Clone, serde::Serialize)]
struct ChatMsg {
    role: String,
    content: String,
}

impl ChatMsg {
    fn system(content: impl Into<String>) -> Self {
        Self { role: "system".into(), content: content.into() }
    }

    fn user(content: impl Into<String>) -> Self {
        Self { role: "user".into(), content: content.into() }
    }
}

/// Minimal request body — only the fields every OpenAI-compat endpoint accepts.
#[derive(serde::Serialize)]
struct ChatRequest<'a> {
    model: &'a str,
    messages: &'a [ChatMsg],
    max_tokens: u32,
    temperature: f32,
}

/// We only pull out the first choice's content; all other fields are ignored,
/// which sidesteps the `code`-as-integer and `service_tier`-unknown-variant
/// errors that `async_openai`'s strict deserializer triggered.
#[derive(serde::Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(serde::Deserialize)]
struct Choice {
    message: ChoiceMessage,
}

#[derive(serde::Deserialize)]
struct ChoiceMessage {
    content: Option<String>,
}

// ── Domain types ───────────────────────────────────────────────────────────────

/// A merged open-source PR contributed to an external repository.
#[derive(Debug, serde::Deserialize)]
pub struct ContributionInput {
    pub title: String,
    pub html_url: String,
    pub repo_full_name: String,
    pub repo_html_url: String,
    pub merged_at: String,
    pub labels: Vec<String>,
}

// ── Provider context ───────────────────────────────────────────────────────────

struct Provider {
    client: HttpClient,
    base_url: String,
    api_key: String,
    name: &'static str,
}

impl Provider {
    fn new(
        name: &'static str,
        base_url: impl Into<String>,
        api_key: impl Into<String>,
        timeout_secs: u64,
    ) -> Self {
        let client = HttpClient::builder()
            .timeout(Duration::from_secs(timeout_secs))
            .build()
            .expect("failed to build HTTP client");
        Self { client, base_url: base_url.into(), api_key: api_key.into(), name }
    }

    async fn chat(
        &self,
        model: &str,
        messages: &[ChatMsg],
        max_tokens: u32,
        temperature: f32,
    ) -> Result<String> {
        let url = format!("{}/chat/completions", self.base_url.trim_end_matches('/'));
        let body = ChatRequest { model, messages, max_tokens, temperature };

        let resp = self
            .client
            .post(&url)
            .header(header::AUTHORIZATION, format!("Bearer {}", self.api_key))
            .header(header::CONTENT_TYPE, "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::Ai(format!("{}: request failed: {e}", self.name)))?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AppError::Ai(format!("{}: HTTP {status}: {text}", self.name)));
        }

        let parsed: ChatResponse = resp
            .json()
            .await
            .map_err(|e| AppError::Ai(format!("{}: response parse error: {e}", self.name)))?;

        parsed
            .choices
            .into_iter()
            .next()
            .and_then(|c| c.message.content)
            .filter(|s| !s.is_empty())
            .ok_or_else(|| AppError::Ai(format!("{}: empty content in response", self.name)))
    }
}

// ── Service ────────────────────────────────────────────────────────────────────

pub struct AiService {
    gemini: Provider,
    nim: Provider,
    openrouter: Provider,
    groq: Provider,
}

impl AiService {
    pub fn new(config: &Config) -> Self {
        Self {
            // Gemini Flash Lite: 1000 RPM, sub-5s for repo summaries; 30s is generous.
            gemini: Provider::new("gemini", &config.google_base_url, &config.google_api_key, 30),
            // NIM: 40 RPM, no daily cap; reduced to 90s (nemotron-550B is now last within tier).
            nim: Provider::new("nvidia-nim", &config.nvidia_nim_base_url, &config.nvidia_nim_api_key, 90),
            // OpenRouter free tier — variable latency; 90s covers slow queues.
            openrouter: Provider::new("openrouter", &config.openrouter_base_url, &config.openrouter_api_key, 90),
            // Groq: fast but 12K TPM cap; 60s is plenty.
            groq: Provider::new("groq", &config.groq_base_url, &config.groq_api_key, 60),
        }
    }

    pub async fn generate_repo_summary(
        &self,
        repo_name: &str,
        description: Option<&str>,
        readme: Option<&str>,
        ast_meta: &AstMetadata,
        dep_file: Option<&str>,
        topics: &[String],
        forks: i32,
    ) -> Result<String> {
        // Single-call path: summary prompt incorporates all signals; no separate classify call.
        let prompt = self.build_repo_prompt(
            repo_name, description, readme, ast_meta, dep_file, topics, forks,
        );
        let messages = vec![
            ChatMsg::system(REPO_SUMMARY_PROMPT),
            ChatMsg::user(prompt),
        ];
        self.call_ai(&messages, 1200, 0.35).await
    }

    pub async fn assemble_portfolio_mdx(
        &self,
        username: &str,
        avatar_url: Option<&str>,
        repo_summaries: &[RepoSummaryInput],
        contributions: &[ContributionInput],
        github_profile: Option<&serde_json::Value>,
    ) -> Result<String> {
        let prompt = build_portfolio_prompt(username, avatar_url, repo_summaries, contributions, github_profile);
        let messages = vec![
            ChatMsg::system(PORTFOLIO_SYSTEM_PROMPT),
            ChatMsg::user(prompt),
        ];
        self.call_ai(&messages, 6000, 0.3).await
    }

    // ── Internal helpers ───────────────────────────────────────────────────────

    /// Four-tier ordered-fallback dispatcher.
    ///
    /// Tier 0: Gemini (1000 RPM) → Tier 1: NIM (40 RPM) → Tier 2: OpenRouter (1K RPD) → Tier 3: Groq (30 RPM, 12K TPM)
    /// Within each tier models are tried from index 0 downward.
    async fn call_ai(
        &self,
        messages: &[ChatMsg],
        max_tokens: u32,
        temperature: f32,
    ) -> Result<String> {
        // ── Tier 0: Gemini — primary, 1000 RPM, sub-5s ───────────────────────
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

        // ── Tier 2: OpenRouter — tertiary; preserve 1K RPD daily budget ──────
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

        // ── Tier 3: Groq — last resort; 12K TPM saturated by large prompts ───
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

    fn build_repo_prompt(
        &self,
        name: &str,
        description: Option<&str>,
        readme: Option<&str>,
        ast: &AstMetadata,
        dep_file: Option<&str>,
        topics: &[String],
        forks: i32,
    ) -> String {
        let readme_section = readme
            .map(|r| {
                let truncated = truncate_at_boundary(r, 3000);
                format!("## README\n{truncated}")
            })
            .unwrap_or_else(|| "## README\n(not available)".into());

        let dep_section = dep_file
            .map(|p| {
                let truncated = truncate_at_boundary(p, 1000);
                format!("## Dependencies\n{truncated}")
            })
            .unwrap_or_default();

        let key_deps: Vec<&str> = ast.imports.iter().take(12).map(String::as_str).collect();

        format!(
            r#"## Repository Metadata
Name: {name}
Description: {desc}
Language: {lang} | Forks: {forks}
Topics: {topics}
Frameworks: {frameworks}
Code signals: {signals}
Files analyzed: {files} | Functions: {fns} | Classes: {classes} | Lines: {lines} | Complexity: {complexity}/100
Key imports: {deps}
Exported symbols: {exports}

{readme_section}
{dep_section}

Write a 2-paragraph technical summary (plain prose, no headers, no bullets, no emojis)."#,
            name = name,
            desc = description.unwrap_or("(none)"),
            lang = ast.language,
            forks = forks,
            topics = if topics.is_empty() { "(none)".into() } else { topics.join(", ") },
            frameworks = if ast.frameworks.is_empty() { "(none detected)".to_owned() } else { ast.frameworks.join(", ") },
            signals = if ast.signals.is_empty() { "(none)".into() } else { ast.signals.join(", ") },
            files = ast.file_count,
            fns = ast.function_count,
            classes = ast.class_count,
            lines = ast.line_count,
            complexity = ast.complexity_score,
            deps = if key_deps.is_empty() { "(none)".into() } else { key_deps.join(", ") },
            exports = if ast.exported_symbols.is_empty() { "(none)".into() } else { ast.exported_symbols.join(", ") },
        )
    }
}

#[derive(Debug)]
pub struct RepoSummaryInput {
    pub name: String,
    pub language: String,
    pub stars: i32,
    pub forks: i32,
    pub topics: Vec<String>,
    pub homepage: Option<String>,
    pub frameworks: Vec<String>,
    pub summary: String,
    pub html_url: String,
}

fn build_portfolio_prompt(
    username: &str,
    avatar_url: Option<&str>,
    repos: &[RepoSummaryInput],
    contributions: &[ContributionInput],
    github_profile: Option<&serde_json::Value>,
) -> String {
    let total_stars: i32 = repos.iter().map(|r| r.stars).sum();
    let total_forks: i32 = repos.iter().map(|r| r.forks).sum();

    let mut lang_counts: std::collections::HashMap<&str, usize> = std::collections::HashMap::new();
    for repo in repos {
        *lang_counts.entry(repo.language.as_str()).or_insert(0) += 1;
    }
    let mut lang_pairs: Vec<(&str, usize)> = lang_counts.into_iter().collect();
    lang_pairs.sort_by(|a, b| b.1.cmp(&a.1));
    let lang_distribution = lang_pairs
        .iter()
        .map(|(lang, count)| {
            let pct = (*count as f32 / repos.len() as f32 * 100.0).round() as u32;
            format!("{lang} ({pct}%)")
        })
        .collect::<Vec<_>>()
        .join(", ");

    let mut all_frameworks: Vec<&str> = repos
        .iter()
        .flat_map(|r| r.frameworks.iter().map(String::as_str))
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();
    all_frameworks.sort();
    let frameworks_seen = if all_frameworks.is_empty() {
        "(none detected)".to_owned()
    } else {
        all_frameworks.join(", ")
    };

    let all_topics: Vec<&str> = {
        let mut seen = std::collections::HashSet::new();
        repos
            .iter()
            .flat_map(|r| r.topics.iter().map(String::as_str))
            .filter(|t| seen.insert(*t))
            .collect()
    };
    let topics_seen = if all_topics.is_empty() {
        "(none)".to_owned()
    } else {
        all_topics.join(", ")
    };

    let mut sorted_repos: Vec<&RepoSummaryInput> = repos.iter().collect();
    sorted_repos.sort_by(|a, b| b.stars.cmp(&a.stars).then(b.forks.cmp(&a.forks)));

    let repos_text = sorted_repos
        .iter()
        .map(|r| {
            let meta_parts: Vec<String> = [
                format!("Language: {}", r.language),
                format!("Stars: {} | Forks: {}", r.stars, r.forks),
                if !r.frameworks.is_empty() {
                    format!("Stack: {}", r.frameworks.join(", "))
                } else {
                    String::new()
                },
                if !r.topics.is_empty() {
                    format!("Topics: {}", r.topics.join(", "))
                } else {
                    String::new()
                },
                if let Some(url) = &r.homepage {
                    if !url.is_empty() { format!("Live: {url}") } else { String::new() }
                } else {
                    String::new()
                },
            ]
            .into_iter()
            .filter(|s| !s.is_empty())
            .collect();

            format!(
                "### [{name}]({url})\n{meta}\n\n{summary}",
                name = r.name,
                url = r.html_url,
                meta = meta_parts.join(" | "),
                summary = r.summary,
            )
        })
        .collect::<Vec<_>>()
        .join("\n\n---\n\n");

    let contributions_section = if contributions.is_empty() {
        String::new()
    } else {
        let items = contributions
            .iter()
            .map(|c| {
                let date = c.merged_at.get(..10).unwrap_or(&c.merged_at);
                let label_str = if c.labels.is_empty() {
                    String::new()
                } else {
                    format!(" [{}]", c.labels.join(", "))
                };
                format!(
                    "- [{repo}]({repo_url}) — [{title}]({pr_url}){labels} (merged {date})",
                    repo = c.repo_full_name,
                    repo_url = c.repo_html_url,
                    title = c.title,
                    pr_url = c.html_url,
                    labels = label_str,
                    date = date,
                )
            })
            .collect::<Vec<_>>()
            .join("\n");

        format!(
            "\n## Merged External Contributions ({count} PRs)\n{items}",
            count = contributions.len(),
            items = items,
        )
    };

    // Optionally pull followers + total_contributions from the GitHub profile blob.
    let (followers_line, total_contributions_line) = github_profile
        .and_then(|p| p.as_object())
        .map(|obj| {
            let followers = obj.get("followers").and_then(|v| v.as_i64()).unwrap_or(0);
            let total = obj.get("total_contributions").and_then(|v| v.as_i64()).unwrap_or(0);
            (
                format!("Followers: {followers}"),
                format!("Total GitHub contributions (last year): {total}"),
            )
        })
        .unwrap_or_default();

    format!(
        r#"## Developer Profile
Username: {username}
Avatar: {avatar}
Total repositories provided: {repo_count}
Total stars: {stars} | Total forks: {forks}
{followers_line}
{total_contributions_line}
Language distribution: {lang_dist}
Frameworks/libraries seen across repos: {frameworks}
Topic signals across repos: {topics}

## Repository Summaries (pre-sorted by stars descending)

{repos_text}
{contributions}

---

Generate focused MDX for this developer's portfolio. Project cards are rendered from structured repository data separately, so do NOT include a featured projects section.

Output exactly these sections, in this order:

1. **Tagline paragraph** — place this FIRST, with NO heading before it (no # H1). One or two sentences distilling technical identity from the language distribution, frameworks, topics, and project domains above. No job titles. No fabricated claims.

2. **## About** — 2-3 sentences of technical bio derived only from the observable signals above: language mix, framework choices, project domains, and recurring patterns. Prohibited: job titles, employers, years of experience, educational credentials, location.

3. **## Open Source Contributions** — include ONLY if contribution data is provided above and non-empty. One framing sentence, then a concise list of merged PRs as provided.

Do NOT generate: a # H1 heading, ## Featured Projects, ### project blocks, ## Experience, ## Skills, or any other sections.
Output raw MDX only."#,
        username = username,
        avatar = avatar_url.unwrap_or("(none)"),
        repo_count = repos.len(),
        stars = total_stars,
        forks = total_forks,
        followers_line = followers_line,
        total_contributions_line = total_contributions_line,
        lang_dist = lang_distribution,
        frameworks = frameworks_seen,
        topics = topics_seen,
        repos_text = repos_text,
        contributions = contributions_section,
    )
}

// ── Utilities ──────────────────────────────────────────────────────────────────

fn truncate_at_boundary(text: &str, max_chars: usize) -> &str {
    if text.len() <= max_chars {
        return text;
    }
    let boundary = text.floor_char_boundary(max_chars);
    let slice = &text[..boundary];
    if let Some(pos) = slice.rfind("\n\n") {
        return &text[..pos];
    }
    if let Some(pos) = slice.rfind(". ") {
        return &text[..pos + 1];
    }
    if let Some(pos) = slice.rfind('\n') {
        return &text[..pos];
    }
    slice
}

// ── Prompt constants ───────────────────────────────────────────────────────────

const REPO_SUMMARY_PROMPT: &str = r#"You are a principal engineer writing technically precise summaries of open-source projects for a developer portfolio. A pre-classification is provided when available — use it to calibrate the depth and angle of your summary.

## Category writing guide

Use the pre-classification `category` to decide what to emphasize:

**library / sdk**
Lead with the problem domain and API surface. What abstraction does it introduce? How does a caller compose it with other tools? What are the performance characteristics or correctness guarantees? Reference exported symbols or key types when available.

**api / backend-service**
Lead with the data model and transport contract. Discuss auth strategy, consistency semantics, rate limiting, and what scalability decisions are visible in the code. Reference the framework where it shapes the architecture.

**web-app / frontend**
Lead with the user problem and rendering strategy (SSR, SPA, islands). Discuss data fetching approach, state management pattern, and what UX trade-offs are baked into the architecture.

**cli / devtool**
Lead with the developer workflow being improved or replaced. Discuss flag design, composability with pipes or other tools, configuration surface, and distribution. Is throughput or latency relevant? Does it handle large inputs?

**ml / ai**
Lead with the task definition, dataset, and objective. Discuss model architecture, training pipeline, evaluation methodology, and inference path. Avoid vague claims; name specific techniques or frameworks.

**data-pipeline / etl**
Lead with throughput, reliability, and idempotency guarantees. Discuss partitioning, failure modes, backpressure handling, and how data quality is enforced.

**infrastructure / platform**
Lead with the operational guarantees it provides. Discuss observability, failure isolation, configuration surface, and what it enables downstream consumers to do.

**other**
Describe the concrete problem, the proposed solution, and one thing that makes the implementation technically interesting.

## Scale calibration

Match your confidence and depth to the evidence:
- **prototype** (small/experimental): Describe the technical approach clearly and proportionally. Do not imply production scale or wide adoption.
- **active-oss** (community traction): Reference community signals if meaningful. Highlight what users find valuable and what real-world usage reveals about the design.
- **production** (serious infrastructure): Treat as load-bearing code. Discuss tradeoffs and failure modes at full depth.

## Output format

Two paragraphs. Plain prose only — no markdown headers, no bullet points, no numbered lists, no emojis, no bold.

**Paragraph 1 — Problem and solution:** What concrete problem does this solve? Who needs it solved? What is the key mechanism, abstraction, or API it introduces? Reference specific module names, exported symbols, or algorithms when the data supports it.

**Paragraph 2 — Architecture and tradeoffs:** The dominant structural pattern, the key engineering decisions visible in the code, any interesting tradeoffs, and what distinguishes this from a simpler implementation. If data is sparse, be brief rather than speculative.

Accuracy over completeness. If the data does not support a claim, do not make it. Zero filler. Zero buzzwords."#;

const PORTFOLIO_SYSTEM_PROMPT: &str = r#"You are a principal engineer assembling a technical portfolio for a developer. Your output is rendered directly as MDX in a React application.

## Hard constraints

- Output raw MDX only. No import statements. No frontmatter. No export statements. No triple-dash fence blocks. No HTML tags.
- Every factual claim must be grounded in the repository data provided. Do not invent job titles, employers, years of experience, education, location, or personal facts.
- No marketing language: prohibit "passionate", "driven", "innovative", "leverages", "utilizes", "cutting-edge", "revolutionize", "game-changing", or any buzzword not grounded in code evidence.
- Do not hedge with "seems to" or "appears to be" — if the data supports a statement, make it directly. If it does not, omit the claim.
- Do not shorten or substantially rephrase the provided technical summaries — they contain precise technical content that must be preserved.

## Document structure

The user message specifies the exact sections to generate. Follow it precisely.

Do NOT output:
- A `#` H1 heading of any kind
- A `## Featured Projects` section or any project blocks — project cards are rendered from structured repo data by the UI layer
- Any section not explicitly requested in the user message

Required output (in order):
1. **Tagline paragraph** — no heading before it; 1–2 sentences distilling technical identity
2. **## About** — 2–3 sentences from observable signals only
3. **## Open Source Contributions** — only if contribution data is provided and non-empty

**STRICT CONSTRAINT:** No job titles, company names, years of experience, educational background, location, courses, certifications, or any biographical fact not directly derivable from code signals.

## MDX formatting

- `##` — H2, major sections only
- Inline code — `\`package-name\`` for libraries, tools, APIs, languages
- Standard paragraphs for all prose content
- Lists acceptable only in the Contributions section
- Short paragraphs with white space between them"#;