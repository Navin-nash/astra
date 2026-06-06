use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::Result,
    models::repository::{GithubRepoInfo, Repository},
};

pub async fn upsert(
    pool: &PgPool,
    portfolio_id: Uuid,
    info: &GithubRepoInfo,
    readme_content: Option<&str>,
    ast_metadata: Option<&Value>,
    ai_summary: Option<&str>,
) -> Result<Repository> {
    let topics = serde_json::to_value(&info.topics).unwrap_or(Value::Array(vec![]));

    Ok(sqlx::query_as::<_, Repository>(
        r#"
        INSERT INTO repositories (
            portfolio_id, github_repo_id, name, full_name, description,
            html_url, homepage, primary_language, topics,
            stars_count, forks_count, ast_metadata, ai_summary, readme_content
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (portfolio_id, github_repo_id) DO UPDATE SET
            name             = EXCLUDED.name,
            description      = EXCLUDED.description,
            primary_language = EXCLUDED.primary_language,
            topics           = EXCLUDED.topics,
            stars_count      = EXCLUDED.stars_count,
            forks_count      = EXCLUDED.forks_count,
            ast_metadata     = EXCLUDED.ast_metadata,
            ai_summary       = EXCLUDED.ai_summary,
            readme_content   = EXCLUDED.readme_content,
            updated_at       = NOW()
        RETURNING id, portfolio_id, github_repo_id, name, full_name, description,
                  html_url, homepage, primary_language, topics, stars_count, forks_count,
                  ast_metadata, ai_summary, readme_content, created_at, updated_at
        "#,
    )
    .bind(portfolio_id)
    .bind(&info.github_repo_id)
    .bind(&info.name)
    .bind(&info.full_name)
    .bind(&info.description)
    .bind(&info.html_url)
    .bind(&info.homepage)
    .bind(&info.primary_language)
    .bind(topics)
    .bind(info.stars_count)
    .bind(info.forks_count)
    .bind(ast_metadata)
    .bind(ai_summary)
    .bind(readme_content)
    .fetch_one(pool)
    .await?)
}

pub async fn find_by_portfolio(pool: &PgPool, portfolio_id: Uuid) -> Result<Vec<Repository>> {
    Ok(sqlx::query_as::<_, Repository>(
        r#"
        SELECT id, portfolio_id, github_repo_id, name, full_name, description,
               html_url, homepage, primary_language, topics, stars_count, forks_count,
               ast_metadata, ai_summary, readme_content, created_at, updated_at
        FROM repositories WHERE portfolio_id = $1
        ORDER BY stars_count DESC
        "#,
    )
    .bind(portfolio_id)
    .fetch_all(pool)
    .await?)
}
