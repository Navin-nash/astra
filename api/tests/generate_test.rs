use axum::{
    body::{to_bytes, Body},
    http::{Request, StatusCode},
};
use sqlx::PgPool;
use tower::ServiceExt;

mod common;

#[sqlx::test(migrations = "migrations")]
async fn test_generate_without_auth_returns_401(pool: PgPool) {
    let (app, _state) = common::test_app(pool).await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/generate")
                .header("Content-Type", "application/json")
                .body(Body::from(r#"{"repo_ids": ["12345"]}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(migrations = "migrations")]
async fn test_generate_with_empty_repos_returns_422(pool: PgPool) {
    let (app, _state) = common::test_app(pool.clone()).await;
    let (_, token) = common::create_test_user(&pool).await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/generate")
                .header("Authorization", format!("Bearer {token}"))
                .header("Content-Type", "application/json")
                .body(Body::from(r#"{"repo_ids": []}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[sqlx::test(migrations = "migrations")]
async fn test_generate_returns_job_id(pool: PgPool) {
    let (app, _state) = common::test_app(pool.clone()).await;
    let (_, token) = common::create_test_user(&pool).await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/generate")
                .header("Authorization", format!("Bearer {token}"))
                .header("Content-Type", "application/json")
                .body(Body::from(r#"{"repo_ids": ["12345678"]}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(json["id"].is_string(), "response must include a job id");
    assert_eq!(json["status"], "pending");
}

#[sqlx::test(migrations = "migrations")]
async fn test_job_status_for_unknown_id_returns_404(pool: PgPool) {
    let (app, _state) = common::test_app(pool.clone()).await;
    let (_, token) = common::create_test_user(&pool).await;
    let unknown_id = uuid::Uuid::new_v4();

    let response = app
        .oneshot(
            Request::builder()
                .uri(format!("/api/generate/{unknown_id}"))
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
