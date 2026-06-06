use async_openai::{
    config::OpenAIConfig,
    types::{
        ChatCompletionRequestMessage, ChatCompletionRequestSystemMessage,
        ChatCompletionRequestUserMessage, CreateChatCompletionRequestArgs,
    },
    Client,
};

use crate::{
    config::Config,
    error::{AppError, Result},
    services::ast::AstMetadata,
};

/// Structured classification produced by the first AI pass.
/// Used as context for the richer second-pass summary.
#[derive(Debug, Default, serde::Serialize, serde::Deserialize)]
pub struct RepoClassification {
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub purpose: String,
    #[serde(default)]
    pub primary_tech: Vec<String>,
    #[serde(default)]
    pub architecture: String,
    #[serde(default)]
    pub notable: Vec<String>,
}

pub struct AiService {
    client: Client<OpenAIConfig>,
    model: String,
}

impl AiService {
    pub fn new(config: &Config) -> Self {
        let openai_config = OpenAIConfig::new()
            .with_api_key(&config.groq_api_key)
            .with_api_base(&config.ai_base_url);

        Self {
            client: Client::with_config(openai_config),
            model: config.ai_model.clone(),
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
        // Pass 1: fast classifier (~300 tokens) — builds structured context for the summarizer
        let classification = self
            .classify_repo(repo_name, description, readme, ast_meta, topics)
            .await
            .unwrap_or_else(|e| {
                tracing::warn!(repo = repo_name, "classifier failed (using fallback): {e}");
                RepoClassification::default()
            });

        // Pass 2: rich summarizer using classifier context + full metadata
        let prompt = self.build_repo_prompt(
            repo_name,
            description,
            readme,
            ast_meta,
            dep_file,
            topics,
            forks,
            &classification,
        );
        let messages = vec![
            ChatCompletionRequestMessage::System(ChatCompletionRequestSystemMessage::from(
                SYSTEM_PROMPT,
            )),
            ChatCompletionRequestMessage::User(ChatCompletionRequestUserMessage::from(
                prompt.as_str(),
            )),
        ];
        self.call_ai(messages, 1024, 0.4).await
    }

    /// First-pass classifier: produces a compact RepoClassification from minimal context.
    /// Uses low temperature and a strict JSON prompt for reliable structured output.
    async fn classify_repo(
        &self,
        name: &str,
        description: Option<&str>,
        readme: Option<&str>,
        ast_meta: &AstMetadata,
        topics: &[String],
    ) -> Result<RepoClassification> {
        let readme_excerpt = readme
            .map(|r| truncate_at_boundary(r, 1500))
            .unwrap_or("(none)");

        let prompt = format!(
            r#"Classify this repository. Return ONLY a JSON object — no markdown fences, no extra text:
{{
  "category": "web-app|api|library|cli|data-pipeline|ml|devtool|mobile|game|other",
  "purpose": "one sentence: what it does and for whom",
  "primary_tech": ["key", "technologies"],
  "architecture": "dominant pattern: REST|MVC|event-driven|functional|library|CLI|pipeline|monolith|other",
  "notable": ["up to 3 technically interesting aspects"]
}}

Name: {name}
Language: {lang}
Description: {desc}
Frameworks: {frameworks}
Topics: {topics}
Code signals: {signals}
README: {readme}"#,
            name = name,
            lang = ast_meta.language,
            desc = description.unwrap_or("(none)"),
            frameworks = if ast_meta.frameworks.is_empty() {
                "(none)".into()
            } else {
                ast_meta.frameworks.join(", ")
            },
            topics = if topics.is_empty() {
                "(none)".into()
            } else {
                topics.join(", ")
            },
            signals = if ast_meta.signals.is_empty() {
                "(none)".into()
            } else {
                ast_meta.signals.join(", ")
            },
            readme = readme_excerpt,
        );

        let messages = vec![
            ChatCompletionRequestMessage::System(ChatCompletionRequestSystemMessage::from(
                "You are a code analyzer. Output ONLY valid JSON. No markdown. No extra text.",
            )),
            ChatCompletionRequestMessage::User(ChatCompletionRequestUserMessage::from(
                prompt.as_str(),
            )),
        ];

        let json_text = self.call_ai(messages, 300, 0.1).await?;
        let extracted = extract_json(&json_text)
            .ok_or_else(|| AppError::Ai("classifier returned no JSON object".into()))?;
        serde_json::from_str::<RepoClassification>(extracted)
            .map_err(|e| AppError::Ai(format!("classifier JSON parse error: {e}")))
    }

    pub async fn assemble_portfolio_mdx(
        &self,
        username: &str,
        avatar_url: Option<&str>,
        repo_summaries: &[RepoSummaryInput],
    ) -> Result<String> {
        let prompt = build_portfolio_prompt(username, avatar_url, repo_summaries);
        let messages = vec![
            ChatCompletionRequestMessage::System(ChatCompletionRequestSystemMessage::from(
                PORTFOLIO_SYSTEM_PROMPT,
            )),
            ChatCompletionRequestMessage::User(ChatCompletionRequestUserMessage::from(
                prompt.as_str(),
            )),
        ];
        self.call_ai(messages, 4096, 0.3).await
    }

    /// Sends a chat request with up to 3 attempts and exponential backoff on failure.
    async fn call_ai(
        &self,
        messages: Vec<ChatCompletionRequestMessage>,
        max_tokens: u32,
        temperature: f32,
    ) -> Result<String> {
        let mut last_err: Option<AppError> = None;

        for attempt in 0u32..3 {
            let request = CreateChatCompletionRequestArgs::default()
                .model(&self.model)
                .max_tokens(max_tokens)
                .temperature(temperature)
                .messages(messages.clone())
                .build()
                .map_err(|e| AppError::Ai(e.to_string()))?;

            match self.client.chat().create(request).await {
                Ok(resp) => {
                    return resp
                        .choices
                        .into_iter()
                        .next()
                        .and_then(|c| c.message.content)
                        .ok_or_else(|| AppError::Ai("empty response from AI".into()));
                }
                Err(e) => {
                    tracing::warn!(attempt = attempt + 1, error = %e, "AI call failed");
                    last_err = Some(AppError::Ai(e.to_string()));
                    if attempt < 2 {
                        let delay = std::time::Duration::from_secs(2u64.pow(attempt));
                        tokio::time::sleep(delay).await;
                    }
                }
            }
        }

        Err(last_err.unwrap_or_else(|| AppError::Ai("AI call failed after 3 attempts".into())))
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
        classification: &RepoClassification,
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

        // Pre-analysis classification section — enriches the summarizer's context
        let classification_section = if !classification.category.is_empty() {
            let notable_str = if classification.notable.is_empty() {
                String::new()
            } else {
                format!("\nNotable: {}", classification.notable.join("; "))
            };
            format!(
                "## Pre-Analysis\nCategory: {} | Architecture: {}\nPurpose: {}\nKey tech: {}{}",
                classification.category,
                classification.architecture,
                classification.purpose,
                if classification.primary_tech.is_empty() {
                    "(see frameworks below)".into()
                } else {
                    classification.primary_tech.join(", ")
                },
                notable_str,
            )
        } else {
            String::new()
        };

        format!(
            r#"{classification}

## Repository Metadata
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

Write a 2-paragraph technical summary. No markdown headers. Plain prose only."#,
            classification = classification_section,
            name = name,
            desc = description.unwrap_or("(none)"),
            lang = ast.language,
            forks = forks,
            topics = if topics.is_empty() { "(none)".into() } else { topics.join(", ") },
            frameworks = if ast.frameworks.is_empty() {
                "(none detected)".to_owned()
            } else {
                ast.frameworks.join(", ")
            },
            signals = if ast.signals.is_empty() {
                "(none)".into()
            } else {
                ast.signals.join(", ")
            },
            files = ast.file_count,
            fns = ast.function_count,
            classes = ast.class_count,
            lines = ast.line_count,
            complexity = ast.complexity_score,
            deps = if key_deps.is_empty() { "(none)".into() } else { key_deps.join(", ") },
            exports = if ast.exported_symbols.is_empty() {
                "(none)".into()
            } else {
                ast.exported_symbols.join(", ")
            },
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
) -> String {
    let repos_text = repos
        .iter()
        .map(|r| {
            let meta = [
                format!("**Language:** {}", r.language),
                format!("**Stars:** {} | **Forks:** {}", r.stars, r.forks),
                if !r.frameworks.is_empty() {
                    format!("**Stack:** {}", r.frameworks.join(", "))
                } else {
                    String::new()
                },
                if !r.topics.is_empty() {
                    format!("**Topics:** {}", r.topics.join(", "))
                } else {
                    String::new()
                },
                if let Some(url) = &r.homepage {
                    if !url.is_empty() {
                        format!("**Live:** {url}")
                    } else {
                        String::new()
                    }
                } else {
                    String::new()
                },
            ]
            .into_iter()
            .filter(|s| !s.is_empty())
            .collect::<Vec<_>>()
            .join(" | ");

            format!(
                "### [{name}]({url})\n{meta}\n\n{summary}",
                name = r.name,
                url = r.html_url,
                meta = meta,
                summary = r.summary,
            )
        })
        .collect::<Vec<_>>()
        .join("\n\n");

    format!(
        r#"Developer: {username}
Avatar: {avatar}

Featured projects:
{repos_text}

Generate a complete MDX portfolio for this developer.
Include: hero section with name and a precise 1-2 sentence technical tagline, featured projects, and a 2-3 sentence technical bio.
Output raw MDX only."#,
        username = username,
        avatar = avatar_url.unwrap_or(""),
        repos_text = repos_text,
    )
}

/// Extracts the outermost JSON object from a string that may contain markdown or extra text.
fn extract_json(text: &str) -> Option<&str> {
    let start = text.find('{')?;
    let mut depth = 0usize;
    let mut end = start;
    for (i, c) in text[start..].char_indices() {
        match c {
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    end = start + i;
                    break;
                }
            }
            _ => {}
        }
    }
    if depth == 0 { Some(&text[start..=end]) } else { None }
}

/// Truncates text at a sentence or paragraph boundary near `max_chars`.
fn truncate_at_boundary(text: &str, max_chars: usize) -> &str {
    if text.len() <= max_chars {
        return text;
    }
    let slice = &text[..max_chars];
    // Prefer cutting at a paragraph break
    if let Some(pos) = slice.rfind("\n\n") {
        return &text[..pos];
    }
    // Fall back to sentence boundary
    if let Some(pos) = slice.rfind(". ") {
        return &text[..pos + 1];
    }
    // Last resort: newline
    if let Some(pos) = slice.rfind('\n') {
        return &text[..pos];
    }
    slice
}

const SYSTEM_PROMPT: &str = r#"You are a senior staff engineer writing portfolio descriptions for a developer's open-source projects.
A pre-analysis classification is provided when available — use it to anchor your writing.
Write a 2-paragraph technical summary in plain prose (no markdown headers, no bullets, no emojis):
- Paragraph 1: what concrete problem this project solves and for whom. Reference specific implementation details, key abstractions, or APIs.
- Paragraph 2: the architectural pattern, key technical decisions, interesting tradeoffs, and what makes this project technically noteworthy.
Be precise and specific. Treat the reader as a senior engineer. Zero filler, zero buzzwords."#;

const PORTFOLIO_SYSTEM_PROMPT: &str = r#"You are a technical portfolio writer helping developers present their open-source work professionally.
Generate a complete, compelling MDX document that showcases genuine technical depth.
- Tone: confident, technically precise — not a marketing brochure
- Structure: hero section → featured projects → brief bio
- Hero: developer name + a sharp 1-2 sentence tagline inferred from their projects
- Projects: highlight architecture decisions, interesting tradeoffs, scale, or unique approaches
- Bio: 2-3 sentences capturing their technical identity and expertise areas
- Use MDX: headings (#, ##, ###), paragraphs, inline code (`code`), and code blocks where useful
- No import statements, no frontmatter, no export statements
- Output only raw MDX content"#;
