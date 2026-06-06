use std::sync::Arc;

use axum::Router;
use sqlx::PgPool;
use wiremock::MockServer;

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
        encryption_key: [42u8; 32],
        github_client_id: "test_client_id".into(),
        github_client_secret: "test_client_secret".into(),
        github_redirect_uri: "http://localhost:8080/auth/github/callback".into(),
        frontend_url: "http://localhost:3000".into(),
        openai_api_key: "test_key".into(),
        openai_model: "gpt-4o-mini".into(),
        openai_base_url: None,
    }
}

pub async fn create_test_user(pool: &PgPool) -> (astra_api::models::user::User, String) {
    use astra_api::{db, services::crypto::CryptoService};

    let crypto = CryptoService::new(&[42u8; 32]);
    let encrypted_token = crypto.encrypt(b"test_github_token").unwrap();

    let user = db::users::upsert(
        pool,
        "test_github_id",
        "testuser",
        Some("Test User"),
        Some("https://avatars.github.com/test"),
        Some("test@example.com"),
        &encrypted_token,
    )
    .await
    .unwrap();

    let jwt = astra_api::auth::jwt::JwtService::new(
        "test-jwt-secret-that-is-long-enough-for-hmac-sha256",
    );
    let token = jwt.create_token(user.id, &user.username).unwrap();

    (user, token)
}
