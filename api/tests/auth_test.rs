use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use sqlx::PgPool;
use tower::ServiceExt;
use wiremock::{
    matchers::{method, path},
    Mock, MockServer, ResponseTemplate,
};

mod common;

#[sqlx::test(migrations = "migrations")]
async fn test_protected_route_without_token_returns_401(pool: PgPool) {
    let (app, _state) = common::test_app(pool).await;

    let response = app
        .oneshot(Request::builder().uri("/api/me").body(Body::empty()).unwrap())
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(migrations = "migrations")]
async fn test_protected_route_with_valid_token_returns_200(pool: PgPool) {
    let (app, _state) = common::test_app(pool.clone()).await;
    let (_, token) = common::create_test_user(&pool).await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/me")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[sqlx::test(migrations = "migrations")]
async fn test_github_callback_with_invalid_code_returns_401(pool: PgPool) {
    let mock_server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/login/oauth/access_token"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "error": "bad_verification_code",
            "error_description": "The code passed is incorrect or expired."
        })))
        .mount(&mock_server)
        .await;

    let (app, _state) = common::test_app(pool).await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/auth/github/callback?code=bad_code")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(migrations = "migrations")]
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
