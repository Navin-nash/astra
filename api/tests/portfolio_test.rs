use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use sqlx::PgPool;
use tower::ServiceExt;

mod common;

#[sqlx::test(migrations = "migrations")]
async fn test_get_nonexistent_portfolio_returns_404(pool: PgPool) {
    let (app, _state) = common::test_app(pool).await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/portfolio/nobody")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(migrations = "migrations")]
async fn test_unpublished_portfolio_not_publicly_accessible(pool: PgPool) {
    use astra_api::db;

    let (app, state) = common::test_app(pool.clone()).await;
    let (user, _token) = common::create_test_user(&pool).await;

    db::portfolios::upsert(&pool, user.id).await.unwrap();

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/portfolio/testuser")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "unpublished portfolio should not be accessible"
    );

    drop(state);
}

#[sqlx::test(migrations = "migrations")]
async fn test_publish_then_portfolio_is_accessible(pool: PgPool) {
    use astra_api::db;
    use axum::body::to_bytes;

    let (app, _state) = common::test_app(pool.clone()).await;
    let (user, token) = common::create_test_user(&pool).await;

    let portfolio = db::portfolios::upsert(&pool, user.id).await.unwrap();
    db::portfolios::update_mdx(&pool, portfolio.id, "# Hello World").await.unwrap();
    db::portfolios::set_published(&pool, user.id, true).await.unwrap();

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/portfolio/testuser")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["mdx_content"], "# Hello World");
}

#[sqlx::test(migrations = "migrations")]
async fn test_update_portfolio_content(pool: PgPool) {
    use astra_api::db;
    use axum::body::to_bytes;

    let (app, _state) = common::test_app(pool.clone()).await;
    let (user, token) = common::create_test_user(&pool).await;

    db::portfolios::upsert(&pool, user.id).await.unwrap();

    let response = app
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri("/api/portfolio")
                .header("Authorization", format!("Bearer {token}"))
                .header("Content-Type", "application/json")
                .body(Body::from(r#"{"mdx_content": "# Updated Portfolio"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["mdx_content"], "# Updated Portfolio");
}
