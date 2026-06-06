use sqlx::PgPool;

use astra_api::db::{portfolios, users};

#[sqlx::test(migrations = "migrations")]
async fn test_user_upsert_creates_new(pool: PgPool) {
    let user = users::upsert(&pool, "gh_100", "alice", Some("Alice"), None, None, b"tok")
        .await
        .unwrap();

    assert_eq!(user.github_id, "gh_100");
    assert_eq!(user.username, "alice");
    assert_eq!(user.name, Some("Alice".into()));
}

#[sqlx::test(migrations = "migrations")]
async fn test_user_upsert_idempotent(pool: PgPool) {
    users::upsert(&pool, "gh_101", "bob", None, None, None, b"t1")
        .await
        .unwrap();

    let updated = users::upsert(&pool, "gh_101", "bob_v2", None, None, None, b"t2")
        .await
        .unwrap();

    assert_eq!(updated.username, "bob_v2");
}

#[sqlx::test(migrations = "migrations")]
async fn test_find_by_username_returns_correct_user(pool: PgPool) {
    users::upsert(&pool, "gh_102", "carol", None, None, None, b"t")
        .await
        .unwrap();

    let found = users::find_by_username(&pool, "carol").await.unwrap();
    assert!(found.is_some());
    assert_eq!(found.unwrap().github_id, "gh_102");

    let missing = users::find_by_username(&pool, "nobody").await.unwrap();
    assert!(missing.is_none());
}

#[sqlx::test(migrations = "migrations")]
async fn test_portfolio_upsert_and_publish(pool: PgPool) {
    let user = users::upsert(&pool, "gh_200", "dev1", None, None, None, b"t")
        .await
        .unwrap();

    let p = portfolios::upsert(&pool, user.id).await.unwrap();
    assert!(!p.is_published);

    portfolios::set_published(&pool, user.id, true).await.unwrap();

    let updated = portfolios::find_by_user_id(&pool, user.id)
        .await
        .unwrap()
        .unwrap();

    assert!(updated.is_published);
}

#[sqlx::test(migrations = "migrations")]
async fn test_unpublished_portfolio_invisible_publicly(pool: PgPool) {
    let user = users::upsert(&pool, "gh_201", "dev2", None, None, None, b"t")
        .await
        .unwrap();

    portfolios::upsert(&pool, user.id).await.unwrap();

    let result = portfolios::find_by_username(&pool, "dev2").await.unwrap();
    assert!(result.is_none(), "draft portfolio must not be publicly visible");
}

#[sqlx::test(migrations = "migrations")]
async fn test_portfolio_mdx_update(pool: PgPool) {
    let user = users::upsert(&pool, "gh_202", "dev3", None, None, None, b"t")
        .await
        .unwrap();

    let p = portfolios::upsert(&pool, user.id).await.unwrap();
    portfolios::update_mdx(&pool, p.id, "# My Portfolio").await.unwrap();

    let fetched = portfolios::find_by_user_id(&pool, user.id)
        .await
        .unwrap()
        .unwrap();

    assert_eq!(fetched.mdx_content, "# My Portfolio");
}

#[sqlx::test(migrations = "migrations")]
async fn test_published_portfolio_visible_publicly(pool: PgPool) {
    let user = users::upsert(&pool, "gh_203", "dev4", None, None, None, b"t")
        .await
        .unwrap();

    let p = portfolios::upsert(&pool, user.id).await.unwrap();
    portfolios::update_mdx(&pool, p.id, "# Hello").await.unwrap();
    portfolios::set_published(&pool, user.id, true).await.unwrap();

    let result = portfolios::find_by_username(&pool, "dev4").await.unwrap();
    assert!(result.is_some());
    assert_eq!(result.unwrap().mdx_content, "# Hello");
}
