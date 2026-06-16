use sqlx::PgPool;

use astra_api::db::portfolios;

#[sqlx::test]
async fn test_portfolio_upsert_creates_new(pool: PgPool) {
    let p = portfolios::upsert(
        &pool,
        "user-001",
        "alice",
        None,
        &serde_json::Value::Object(Default::default()),
    )
    .await
    .unwrap();

    assert_eq!(p.user_id, "user-001");
    assert_eq!(p.username, "alice");
    assert!(!p.is_published);
}

#[sqlx::test]
async fn test_portfolio_upsert_idempotent(pool: PgPool) {
    portfolios::upsert(
        &pool,
        "user-002",
        "bob",
        None,
        &serde_json::Value::Object(Default::default()),
    )
    .await
    .unwrap();

    let updated = portfolios::upsert(
        &pool,
        "user-002",
        "bob_v2",
        None,
        &serde_json::Value::Object(Default::default()),
    )
    .await
    .unwrap();

    assert_eq!(updated.username, "bob_v2");
}

#[sqlx::test]
async fn test_portfolio_upsert_and_publish(pool: PgPool) {
    let p = portfolios::upsert(
        &pool,
        "user-003",
        "carol",
        None,
        &serde_json::Value::Object(Default::default()),
    )
    .await
    .unwrap();
    assert!(!p.is_published);

    portfolios::set_published(&pool, "user-003", true).await.unwrap();

    let updated = portfolios::find_by_user_id(&pool, "user-003")
        .await
        .unwrap()
        .unwrap();

    assert!(updated.is_published);
}

#[sqlx::test]
async fn test_unpublished_portfolio_invisible_publicly(pool: PgPool) {
    portfolios::upsert(
        &pool,
        "user-004",
        "dave",
        None,
        &serde_json::Value::Object(Default::default()),
    )
    .await
    .unwrap();

    let result = portfolios::find_by_username(&pool, "dave").await.unwrap();
    assert!(result.is_none(), "draft portfolio must not be publicly visible");
}

#[sqlx::test]
async fn test_portfolio_mdx_update(pool: PgPool) {
    let p = portfolios::upsert(
        &pool,
        "user-005",
        "eve",
        None,
        &serde_json::Value::Object(Default::default()),
    )
    .await
    .unwrap();

    portfolios::update_mdx(&pool, p.id, "# My Portfolio").await.unwrap();

    let fetched = portfolios::find_by_user_id(&pool, "user-005")
        .await
        .unwrap()
        .unwrap();

    assert_eq!(fetched.mdx_content, "# My Portfolio");
}

#[sqlx::test]
async fn test_published_portfolio_visible_publicly(pool: PgPool) {
    let p = portfolios::upsert(
        &pool,
        "user-006",
        "frank",
        None,
        &serde_json::Value::Object(Default::default()),
    )
    .await
    .unwrap();

    portfolios::update_mdx(&pool, p.id, "# Hello").await.unwrap();
    portfolios::set_published(&pool, "user-006", true).await.unwrap();

    let result = portfolios::find_by_username(&pool, "frank").await.unwrap();
    assert!(result.is_some());
    assert_eq!(result.unwrap().mdx_content, "# Hello");
}
