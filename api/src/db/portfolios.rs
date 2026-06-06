use sqlx::PgPool;
use uuid::Uuid;

use crate::{error::Result, models::portfolio::Portfolio};

pub async fn upsert(
    pool: &PgPool,
    user_id: &str,
    username: &str,
    avatar_url: Option<&str>,
    theme_config: &serde_json::Value,
) -> Result<Portfolio> {
    Ok(sqlx::query_as::<_, Portfolio>(
        r#"
        INSERT INTO portfolios (user_id, username, avatar_url, theme_config)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO UPDATE
            SET username     = EXCLUDED.username,
                avatar_url   = COALESCE(EXCLUDED.avatar_url, portfolios.avatar_url),
                theme_config = EXCLUDED.theme_config,
                updated_at   = NOW()
        RETURNING id, user_id, username, avatar_url, mdx_content, theme_config,
                  is_published, last_synced_at, created_at, updated_at
        "#,
    )
    .bind(user_id)
    .bind(username)
    .bind(avatar_url)
    .bind(theme_config)
    .fetch_one(pool)
    .await?)
}

pub async fn find_by_username(pool: &PgPool, username: &str) -> Result<Option<Portfolio>> {
    Ok(sqlx::query_as::<_, Portfolio>(
        r#"
        SELECT id, user_id, username, avatar_url, mdx_content, theme_config,
               is_published, last_synced_at, created_at, updated_at
        FROM portfolios
        WHERE username = $1 AND is_published = true
        "#,
    )
    .bind(username)
    .fetch_optional(pool)
    .await?)
}

pub async fn find_by_user_id(pool: &PgPool, user_id: &str) -> Result<Option<Portfolio>> {
    Ok(sqlx::query_as::<_, Portfolio>(
        r#"
        SELECT id, user_id, username, avatar_url, mdx_content, theme_config,
               is_published, last_synced_at, created_at, updated_at
        FROM portfolios WHERE user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?)
}

pub async fn update_mdx(pool: &PgPool, portfolio_id: Uuid, mdx: &str) -> Result<()> {
    sqlx::query(
        "UPDATE portfolios SET mdx_content = $1, last_synced_at = NOW(), updated_at = NOW()
         WHERE id = $2",
    )
    .bind(mdx)
    .bind(portfolio_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn set_published(pool: &PgPool, user_id: &str, published: bool) -> Result<()> {
    sqlx::query(
        "UPDATE portfolios SET is_published = $1, updated_at = NOW() WHERE user_id = $2",
    )
    .bind(published)
    .bind(user_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn update_content(
    pool: &PgPool,
    user_id: &str,
    mdx_content: Option<&str>,
    theme_config: Option<&serde_json::Value>,
) -> Result<Portfolio> {
    Ok(sqlx::query_as::<_, Portfolio>(
        r#"
        UPDATE portfolios
        SET mdx_content  = COALESCE($1, mdx_content),
            theme_config = COALESCE($2, theme_config),
            updated_at   = NOW()
        WHERE user_id = $3
        RETURNING id, user_id, username, avatar_url, mdx_content, theme_config,
                  is_published, last_synced_at, created_at, updated_at
        "#,
    )
    .bind(mdx_content)
    .bind(theme_config)
    .bind(user_id)
    .fetch_one(pool)
    .await?)
}
