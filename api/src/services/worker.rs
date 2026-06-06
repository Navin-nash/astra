use std::sync::Arc;

use futures::future::join_all;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    db,
    error::Result,
    models::repository::GithubRepoInfo,
    services::{
        ai::{AiService, RepoSummaryInput},
        ast::{AstService, SourceFile},
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
    pub theme_config: serde_json::Value,
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
    let update = |status: JobStatus, progress: u8| {
        let updated = {
            if let Some(mut job) = state.jobs.get_mut(&job_id) {
                job.status = status;
                job.progress = progress;
                Some(job.clone())
            } else {
                None
            }
        };
        if let Some(job) = updated {
            let state = state.clone();
            tokio::spawn(async move { state.persist_job(&job).await });
        }
    };

    let fail = |error: String| {
        let updated = {
            if let Some(mut job) = state.jobs.get_mut(&job_id) {
                job.status = JobStatus::Failed;
                job.error = Some(error);
                Some(job.clone())
            } else {
                None
            }
        };
        if let Some(job) = updated {
            let state = state.clone();
            tokio::spawn(async move { state.persist_job(&job).await });
        }
    };

    let ast_svc = AstService::new();
    let ai_svc = Arc::new(AiService::new(&state.config));

    let portfolio = match db::portfolios::upsert(
        &state.db,
        &req.user_id,
        &req.username,
        req.avatar_url.as_deref(),
        &req.theme_config,
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

    // Parse AST for all repos in parallel — multi-file analysis when source_files are present
    let analyses: Vec<_> = join_all(req.repos.iter().map(|repo| {
        let ast_svc = &ast_svc;
        async move {
            let mut ast_meta = if !repo.source_files.is_empty() {
                ast_svc.analyze_multi(&repo.source_files)
            } else {
                crate::services::ast::AstMetadata::default()
            };

            // Fall back to GitHub-reported language if AST couldn't detect one
            if ast_meta.language.is_empty() {
                if let Some(lang) = &repo.primary_language {
                    ast_meta.language = lang.clone();
                }
            }

            let dep_content = repo
                .package_json
                .as_deref()
                .or(repo.dependency_file.as_deref());
            ast_meta.frameworks = ast_svc.infer_frameworks(&ast_meta.imports, dep_content);

            (repo, ast_meta)
        }
    }))
    .await;

    update(JobStatus::GeneratingContent, 40);

    // Generate AI summaries in parallel — each repo is independent
    let summary_futures = analyses.iter().map(|(repo, ast_meta)| {
        let ai_svc = ai_svc.clone();
        async move {
            match ai_svc
                .generate_repo_summary(
                    &repo.name,
                    repo.description.as_deref(),
                    repo.readme.as_deref(),
                    ast_meta,
                    repo.package_json
                        .as_deref()
                        .or(repo.dependency_file.as_deref()),
                    &repo.topics,
                    repo.forks_count,
                )
                .await
            {
                Ok(s) => s,
                Err(e) => {
                    tracing::warn!(repo = %repo.name, "AI summary failed: {e}");
                    repo.description.clone().unwrap_or_else(|| repo.name.clone())
                }
            }
        }
    });

    let summaries: Vec<String> = join_all(summary_futures).await;

    let mut repo_summaries: Vec<RepoSummaryInput> = Vec::new();

    for ((repo, ast_meta), summary) in analyses.iter().zip(summaries.into_iter()) {
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

        let ast_json = ast_svc.metadata_to_json(ast_meta);

        if let Err(e) = db::repositories::upsert(
            &state.db,
            portfolio.id,
            &info,
            repo.readme.as_deref(),
            Some(&ast_json),
            Some(&summary),
        )
        .await
        {
            tracing::error!(repo = %repo.name, "failed to save repository: {e}");
        }

        repo_summaries.push(RepoSummaryInput {
            name: repo.name.clone(),
            language: repo
                .primary_language
                .clone()
                .unwrap_or_else(|| "Unknown".into()),
            stars: repo.stars_count,
            forks: repo.forks_count,
            topics: repo.topics.clone(),
            homepage: repo.homepage.clone(),
            frameworks: ast_meta.frameworks.clone(),
            summary,
            html_url: repo.html_url.clone(),
        });
    }

    update(JobStatus::AssemblingPortfolio, 75);

    let mdx = match ai_svc
        .assemble_portfolio_mdx(&req.username, req.avatar_url.as_deref(), &repo_summaries)
        .await
    {
        Ok(m) => m,
        Err(e) => {
            fail(e.to_string());
            return Err(e);
        }
    };

    if let Err(e) = db::portfolios::update_mdx(&state.db, portfolio.id, &mdx).await {
        fail(e.to_string());
        return Err(e);
    }

    state
        .invalidate_portfolio_cache(&req.username, Some(&req.user_id))
        .await;
    update(JobStatus::Completed, 100);

    tracing::info!(job_id = %job_id, username = %req.username, "generation completed");
    Ok(())
}

