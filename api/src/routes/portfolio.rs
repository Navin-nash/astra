use std::sync::Arc;

use axum::{
    extract::{Path, State},
    Extension, Json,
};
use redis::AsyncCommands;
use serde_json::json;

use crate::{
    db,
    error::{AppError, Result},
    middleware::auth::CurrentUser,
    models::portfolio::{Portfolio, UpdatePortfolioBody},
    state::AppState,
};

const PUBLIC_CACHE_TTL: u64 = 86_400; // 24 hours — published portfolios
const PRIVATE_CACHE_TTL: u64 = 30; // 30 seconds — authenticated dashboard reads

pub async fn get_public(
    State(state): State<Arc<AppState>>,
    Path(username): Path<String>,
) -> Result<Json<serde_json::Value>> {
    let cache_key = format!("portfolio:{username}");

    if let Ok(mut conn) = state.redis_conn().await {
        if let Ok(cached) = conn.get::<_, String>(&cache_key).await {
            if let Ok(value) = serde_json::from_str::<serde_json::Value>(&cached) {
                return Ok(Json(value));
            }
        }
    }

    let portfolio = db::portfolios::find_by_username(&state.db, &username)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("no published portfolio for '{username}'")))?;

    let repos = db::repositories::find_by_portfolio(&state.db, portfolio.id).await?;

    let payload = json!({
        "username": portfolio.username,
        "avatar_url": portfolio.avatar_url,
        "mdx_content": portfolio.mdx_content,
        "theme_config": portfolio.theme_config,
        "last_synced_at": portfolio.last_synced_at,
        "repositories": repos,
    });

    if let Ok(mut conn) = state.redis_conn().await {
        if let Ok(serialized) = serde_json::to_string(&payload) {
            let _: redis::RedisResult<()> =
                conn.set_ex(&cache_key, serialized, PUBLIC_CACHE_TTL).await;
        }
    }

    Ok(Json(payload))
}

pub async fn get_mine(
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
) -> Result<Json<Portfolio>> {
    let cache_key = format!("portfolio:private:{}", current_user.id);

    // Short-lived cache to reduce DB load on rapid dashboard refreshes
    if let Ok(mut conn) = state.redis_conn().await {
        if let Ok(cached) = conn.get::<_, String>(&cache_key).await {
            if let Ok(portfolio) = serde_json::from_str::<Portfolio>(&cached) {
                return Ok(Json(portfolio));
            }
        }
    }

    let portfolio = db::portfolios::find_by_user_id(&state.db, &current_user.id)
        .await?
        .ok_or_else(|| {
            AppError::NotFound("no portfolio yet — trigger a generation first".into())
        })?;

    if let Ok(mut conn) = state.redis_conn().await {
        if let Ok(serialized) = serde_json::to_string(&portfolio) {
            let _: redis::RedisResult<()> =
                conn.set_ex(&cache_key, serialized, PRIVATE_CACHE_TTL).await;
        }
    }

    Ok(Json(portfolio))
}

pub async fn update(
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
    Json(body): Json<UpdatePortfolioBody>,
) -> Result<Json<Portfolio>> {
    let portfolio = db::portfolios::update_content(
        &state.db,
        &current_user.id,
        body.mdx_content.as_deref(),
        body.theme_config.as_ref(),
    )
    .await?;

    state
        .invalidate_portfolio_cache(&current_user.username, Some(&current_user.id))
        .await;
    Ok(Json(portfolio))
}

pub async fn publish(
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
) -> Result<Json<serde_json::Value>> {
    db::portfolios::set_published(&state.db, &current_user.id, true).await?;
    state
        .invalidate_portfolio_cache(&current_user.username, Some(&current_user.id))
        .await;
    Ok(Json(json!({ "published": true })))
}

pub async fn unpublish(
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
) -> Result<Json<serde_json::Value>> {
    db::portfolios::set_published(&state.db, &current_user.id, false).await?;
    state
        .invalidate_portfolio_cache(&current_user.username, Some(&current_user.id))
        .await;
    Ok(Json(json!({ "published": false })))
}
