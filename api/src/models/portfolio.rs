use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Portfolio {
    pub id: Uuid,
    pub user_id: String,
    pub username: String,
    pub avatar_url: Option<String>,
    pub mdx_content: String,
    pub theme_config: Value,
    pub is_published: bool,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePortfolioBody {
    pub mdx_content: Option<String>,
    pub theme_config: Option<Value>,
}
