use std::{sync::Arc, time::Instant};

use futures::future::join_all;
use tokio::sync::Semaphore;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

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

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum JobStatus {
    Pending,
    ParsingAst,
    GeneratingContent,
    AssemblingPortfolio,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationJob {
    pub id: Uuid,
    pub status: JobStatus,
    pub progress: u8,
    pub error: Option<String>,
}

impl GenerationJob {
    pub fn new(id: Uuid) -> Self {
        Self {
            id,
            status: JobStatus::Pending,
            progress: 0,
            error: None,
        }
    }
}

/// Pre-fetched repository content sent from Next.js.
/// Next.js owns GitHub API access; Rust only processes content.
#[derive(Debug, Deserialize)]
pub struct RepoInput {
    pub id: String,
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub html_url: String,
    pub homepage: Option<String>,
    pub primary_language: Option<String>,
    pub topics: Vec<String>,
    pub stars_count: i32,
    pub forks_count: i32,
    pub readme: Option<String>,
    pub package_json: Option<String>,
    /// Language-specific dependency file (Cargo.toml, requirements.txt, go.mod, etc.)
    pub dependency_file: Option<String>,
    /// Key source files pre-fetched by Next.js (up to 3, selected by priority scoring).
    #[serde(default)]
    pub source_files: Vec<SourceFile>,
}

#[derive(Debug, Deserialize)]
pub struct GenerateRequest {
    pub user_id: String,
    pub username: String,
    pub avatar_url: Option<String>,
    pub repos: Vec<RepoInput>,
    #[serde(default)]
    pub contributions: Vec<ContributionInput>,
    #[serde(default)]
    pub theme_config: serde_json::Value,
    /// GitHub profile stats + contribution calendar fetched by Next.js.
    pub github_profile: Option<serde_json::Value>,
}

pub fn spawn_generation(state: Arc<AppState>, job_id: Uuid, request: GenerateRequest) {
    tokio::spawn(async move {
        if let Err(e) = run_generation(state, job_id, request).await {
            tracing::error!(job_id = %job_id, "generation failed: {e}");
        }
    });
}

async fn run_generation(
    state: Arc<AppState>,
    job_id: Uuid,
    req: GenerateRequest,
) -> Result<()> {
    // Destructure upfront so later futures can take ownership of individual fields.
    let GenerateRequest { user_id, username, avatar_url, repos, contributions, mut theme_config, github_profile } = req;

    // Clone github_profile for the AI prompt before moving it into theme_config.
    let github_profile_for_ai = github_profile.clone();

    // Embed github_profile inside theme_config so it persists without a schema migration.
    if let Some(profile) = github_profile {
        if let serde_json::Value::Object(ref mut map) = theme_config {
            map.insert("github_profile".into(), profile);
        }
    }

    let job_start = Instant::now();
    tracing::info!(
        job_id = %job_id,
        username = %username,
        repo_count = repos.len(),
        "generation job started"
    );

    let update = |status: JobStatus, progress: u8| {
        if let Some(mut job) = state.jobs.get_mut(&job_id) {
            job.status = status;
            job.progress = progress;
            let job = job.clone();
            let state = state.clone();
            tokio::spawn(async move { state.persist_job(&job).await });
        }
    };

    let fail = |error: String| {
        if let Some(mut job) = state.jobs.get_mut(&job_id) {
            job.status = JobStatus::Failed;
            job.error = Some(error);
            let job = job.clone();
            let state = state.clone();
            tokio::spawn(async move { state.persist_job(&job).await });
        }
    };

    let ai_svc = Arc::new(AiService::new(&state.config));

    let portfolio = match db::portfolios::upsert(
        &state.db,
        &user_id,
        &username,
        avatar_url.as_deref(),
        &theme_config,
    )
    .await
    {
        Ok(p) => p,
        Err(e) => {
            fail(e.to_string());
            return Err(e);
        }
    };

    update(JobStatus::ParsingAst, 20);

    // ── Phase 1: AST parsing — parallel, CPU-bound ───────────────────────────
    // repos is consumed here so downstream futures can own their (RepoInput, AstMetadata).
    let t1 = Instant::now();
    let analyses: Vec<(RepoInput, AstMetadata)> = join_all(repos.into_iter().map(|repo| {
        async move {
            tracing::debug!(job_id = %job_id, repo = %repo.name, "AST parse started");
            let source_files = repo.source_files.clone();
            let mut ast_meta = if !source_files.is_empty() {
                tokio::task::spawn_blocking(move || AstService::new().analyze_multi(&source_files))
                    .await
                    .unwrap_or_default()
            } else {
                AstMetadata::default()
            };

            if ast_meta.language.is_empty() {
                if let Some(lang) = &repo.primary_language {
                    ast_meta.language = lang.clone();
                }
            }

            let dep_content = repo.package_json.as_deref().or(repo.dependency_file.as_deref());
            ast_meta.frameworks = AstService::new().infer_frameworks(&ast_meta.imports, dep_content);

            tracing::debug!(
                job_id = %job_id,
                repo = %repo.name,
                language = %ast_meta.language,
                files = ast_meta.file_count,
                functions = ast_meta.function_count,
                frameworks = ?ast_meta.frameworks,
                "AST parse completed"
            );
            (repo, ast_meta)
        }
    }))
    .await;
    tracing::info!(
        job_id = %job_id,
        repo_count = analyses.len(),
        elapsed_ms = t1.elapsed().as_millis(),
        "phase 1 (AST) completed"
    );

    update(JobStatus::GeneratingContent, 40);

    // ── Phase 2: AI repo summaries — serialized with semaphore ───────────────
    // Cap concurrent AI calls at 3 to avoid cascading 429s on free-tier models.
    let t2 = Instant::now();
    let ai_sem = Arc::new(Semaphore::new(3));
    let summaries: Vec<String> = join_all(analyses.iter().map(|(repo, ast_meta)| {
        let ai_svc = ai_svc.clone();
        let sem = ai_sem.clone();
        async move {
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
    tracing::info!(
        job_id = %job_id,
        elapsed_ms = t2.elapsed().as_millis(),
        "phase 2 (AI summaries) completed"
    );

    update(JobStatus::AssemblingPortfolio, 75);

    // ── Phase 3: DB upserts + build repo summaries — parallel ────────────────
    // analyses is consumed here; each future owns its (RepoInput, AstMetadata, summary).
    let portfolio_id = portfolio.id;
    let repo_summaries: Vec<RepoSummaryInput> = join_all(
        analyses.into_iter().zip(summaries.into_iter()).map(|((repo, ast_meta), summary)| {
            let state = state.clone();
            async move {
                let info = GithubRepoInfo {
                    github_repo_id: repo.id.clone(),
                    name: repo.name.clone(),
                    full_name: repo.full_name.clone(),
                    description: repo.description.clone(),
                    html_url: repo.html_url.clone(),
                    homepage: repo.homepage.clone(),
                    primary_language: repo.primary_language.clone(),
                    topics: repo.topics.clone(),
                    stars_count: repo.stars_count,
                    forks_count: repo.forks_count,
                };
                let ast_json = ast::ast_metadata_to_json(&ast_meta);

                if let Err(e) = db::repositories::upsert(
                    &state.db,
                    portfolio_id,
                    &info,
                    repo.readme.as_deref(),
                    Some(&ast_json),
                    Some(&summary),
                )
                .await
                {
                    tracing::error!(repo = %repo.name, "failed to save repository: {e}");
                }

                RepoSummaryInput {
                    name: repo.name,
                    language: repo.primary_language.unwrap_or_else(|| "Unknown".into()),
                    stars: repo.stars_count,
                    forks: repo.forks_count,
                    topics: repo.topics,
                    homepage: repo.homepage,
                    frameworks: ast_meta.frameworks,
                    summary,
                    html_url: repo.html_url,
                }
            }
        }),
    )
    .await;

    // ── Phase 4: Portfolio MDX assembly ──────────────────────────────────────
    let t4 = Instant::now();
    tracing::info!(
        job_id = %job_id,
        repo_count = repo_summaries.len(),
        contributions = contributions.len(),
        "phase 4 (portfolio MDX assembly) started"
    );
    let mdx = match ai_svc
        .assemble_portfolio_mdx(&username, avatar_url.as_deref(), &repo_summaries, &contributions, github_profile_for_ai.as_ref())
        .await
    {
        Ok(m) => {
            tracing::info!(
                job_id = %job_id,
                elapsed_ms = t4.elapsed().as_millis(),
                mdx_chars = m.len(),
                "phase 4 (portfolio MDX assembly) succeeded"
            );
            m
        }
        Err(e) => {
            tracing::error!(job_id = %job_id, "phase 4 (portfolio MDX assembly) failed: {e}");
            fail(e.to_string());
            return Err(e);
        }
    };

    if let Err(e) = db::portfolios::update_mdx(&state.db, portfolio.id, &mdx).await {
        tracing::error!(job_id = %job_id, "failed to persist MDX: {e}");
        fail(e.to_string());
        return Err(e);
    }

    // Auto-publish on every successful generation so the public URL is immediately live.
    if let Err(e) = db::portfolios::set_published(&state.db, &user_id, true).await {
        tracing::warn!(job_id = %job_id, "failed to auto-publish portfolio: {e}");
        // Non-fatal — MDX is saved; user can publish manually from the dashboard.
    }

    state.invalidate_portfolio_cache(&username, Some(&user_id)).await;
    update(JobStatus::Completed, 100);

    tracing::info!(
        job_id = %job_id,
        username = %username,
        total_elapsed_ms = job_start.elapsed().as_millis(),
        "generation job completed"
    );
    Ok(())
}

