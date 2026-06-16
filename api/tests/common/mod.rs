use std::sync::Arc;

use axum::Router;
use sqlx::PgPool;

use astra_api::{config::Config, state::AppState};

pub async fn test_app(pool: PgPool) -> (Router, Arc<AppState>) {
    let config = test_config();
    let state = Arc::new(AppState::from_pool(pool, config).await.unwrap());
    let app = astra_api::build_router(state.clone());
    (app, state)
}

pub fn test_config() -> Config {
    Config {
        port: 0,
        environment: astra_api::config::Environment::Development,
        database_url: std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://astra:astra_dev@localhost:5432/astra_test".into()),
        redis_url: std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379/1".into()),
        jwt_secret: "test-jwt-secret-that-is-long-enough-for-hmac-sha256".into(),
        frontend_url: "http://localhost:3000".into(),
        google_api_key: "test_google_key".into(),
        google_base_url: "https://generativelanguage.googleapis.com/v1beta/openai".into(),
        nvidia_nim_api_key: "test_nim_key".into(),
        nvidia_nim_base_url: "https://integrate.api.nvidia.com/v1".into(),
        groq_api_key: "test_groq_key".into(),
        groq_base_url: "https://api.groq.com/openai/v1".into(),
        openrouter_api_key: "test_or_key".into(),
        openrouter_base_url: "https://openrouter.ai/api/v1".into(),
    }
}

pub struct TestUser {
    pub id: String,
    pub username: String,
}

/// Creates a test JWT for a synthetic user. No DB insertion — the Rust API
/// does not manage users (Better Auth on the Next.js side owns that).
pub async fn create_test_user(_pool: &PgPool) -> (TestUser, String) {
    let user = TestUser {
        id: "test-better-auth-user-id".to_string(),
        username: "testuser".to_string(),
    };

    let jwt = astra_api::auth::jwt::JwtService::new(
        "test-jwt-secret-that-is-long-enough-for-hmac-sha256",
    );
    let token = jwt.create_token(&user.id, &user.username).unwrap();

    (user, token)
}
