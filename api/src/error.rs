use axum::{http::StatusCode, response::{IntoResponse, Response}, Json};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("redis error: {0}")]
    Redis(#[from] redis::RedisError),

    #[error("authentication error: {0}")]
    Auth(String),

    #[error("authorization error: {0}")]
    Forbidden(String),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("conflict: {0}")]
    Conflict(String),

    #[error("bad request: {0}")]
    BadRequest(String),

    #[error("github api error: {0}")]
    GitHub(String),

    #[error("ai service error: {0}")]
    Ai(String),

    #[error("crypto error: {0}")]
    Crypto(String),

    #[error("job not found: {0}")]
    JobNotFound(uuid::Uuid),

    #[error("internal error: {0}")]
    Internal(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::Database(e) => {
                tracing::error!("database error: {e}");
                (StatusCode::INTERNAL_SERVER_ERROR, "database error".to_owned())
            }
            AppError::Redis(e) => {
                tracing::error!("redis error: {e}");
                (StatusCode::INTERNAL_SERVER_ERROR, "cache error".to_owned())
            }
            AppError::Auth(msg) => (StatusCode::UNAUTHORIZED, msg.clone()),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg.clone()),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg.clone()),
            AppError::BadRequest(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg.clone()),
            AppError::GitHub(msg) => {
                tracing::error!("github api error: {msg}");
                (StatusCode::BAD_GATEWAY, "github api error".to_owned())
            }
            AppError::Ai(msg) => {
                tracing::error!("ai service error: {msg}");
                (StatusCode::BAD_GATEWAY, "ai service error".to_owned())
            }
            AppError::Crypto(msg) => {
                tracing::error!("crypto error: {msg}");
                (StatusCode::INTERNAL_SERVER_ERROR, "encryption error".to_owned())
            }
            AppError::JobNotFound(id) => (StatusCode::NOT_FOUND, format!("job {id} not found")),
            AppError::Internal(e) => {
                tracing::error!("internal error: {e}");
                (StatusCode::INTERNAL_SERVER_ERROR, "internal server error".to_owned())
            }
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}

pub type Result<T, E = AppError> = std::result::Result<T, E>;
