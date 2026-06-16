use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use sqlx::PgPool;
use tower::ServiceExt;

mod common;

#[sqlx::test]
async fn test_protected_route_without_token_returns_401(pool: PgPool) {
    let (app, _state) = common::test_app(pool).await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/portfolio")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test]
async fn test_protected_route_with_valid_token_passes_auth(pool: PgPool) {
    let (app, _state) = common::test_app(pool.clone()).await;
    let (_, token) = common::create_test_user(&pool).await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/portfolio")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // 404 is expected (no portfolio yet); 401 would mean auth failed.
    assert_ne!(
        response.status(),
        StatusCode::UNAUTHORIZED,
        "valid token should pass auth"
    );
}

#[sqlx::test]
async fn test_health_endpoint(pool: PgPool) {
    let (app, _state) = common::test_app(pool).await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}
