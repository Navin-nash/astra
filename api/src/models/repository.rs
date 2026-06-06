use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Repository {
    pub id: Uuid,
    pub portfolio_id: Uuid,
    pub github_repo_id: String,
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub html_url: Option<String>,
    pub homepage: Option<String>,
    pub primary_language: Option<String>,
    pub topics: Value,
    pub stars_count: i32,
    pub forks_count: i32,
    pub ast_metadata: Option<Value>,
    pub ai_summary: Option<String>,
    pub readme_content: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GithubRepoInfo {
    pub github_repo_id: String,
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub html_url: String,
    pub homepage: Option<String>,
    pub primary_language: Option<String>,
    pub topics: Vec<String>,
    pub stars_count: i32,
    pub forks_count: i32,
}
