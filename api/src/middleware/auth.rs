use std::sync::Arc;

use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};

use crate::{error::AppError, state::AppState};

#[derive(Debug, Clone)]
pub struct CurrentUser {
    pub id: String,
    pub username: String,
}

pub async fn require_auth(
    State(state): State<Arc<AppState>>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let token = extract_bearer(req.headers())
        .ok_or_else(|| AppError::Auth("missing Authorization header".into()))?;

    let claims = state.jwt.validate_token(token)?;

    req.extensions_mut().insert(CurrentUser {
        id: claims.sub,
        username: claims.username,
    });

    Ok(next.run(req).await)
}

fn extract_bearer(headers: &axum::http::HeaderMap) -> Option<&str> {
    headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderMap;

    #[test]
    fn extracts_bearer_token() {
        let mut headers = HeaderMap::new();
        headers.insert("authorization", "Bearer mytoken123".parse().unwrap());
        assert_eq!(extract_bearer(&headers), Some("mytoken123"));
    }

    #[test]
    fn returns_none_for_missing_header() {
        assert!(extract_bearer(&HeaderMap::new()).is_none());
    }

    #[test]
    fn returns_none_for_non_bearer() {
        let mut headers = HeaderMap::new();
        headers.insert("authorization", "Basic abc123".parse().unwrap());
        assert!(extract_bearer(&headers).is_none());
    }
}
