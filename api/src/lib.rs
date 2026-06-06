pub mod auth;
pub mod config;
pub mod db;
pub mod error;
pub mod middleware;
pub mod models;
pub mod routes;
pub mod services;
pub mod state;

use std::sync::Arc;

use axum::{
    routing::{get, patch, post},
    Router,
};
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use state::AppState;

pub fn build_router(state: Arc<AppState>) -> Router {
    let frontend_url = state.config.frontend_url.clone();

    let cors = CorsLayer::new()
        .allow_origin(
            frontend_url
                .parse::<axum::http::HeaderValue>()
                .unwrap_or(axum::http::HeaderValue::from_static("http://localhost:3000")),
        )
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PATCH,
            axum::http::Method::DELETE,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
        ])
        .allow_credentials(true);

    let protected = Router::new()
        .route("/api/generate", post(routes::generate::start))
        .route("/api/generate/:job_id", get(routes::generate::status))
        .route("/api/portfolio", get(routes::portfolio::get_mine))
        .route("/api/portfolio", patch(routes::portfolio::update))
        .route("/api/portfolio/publish", post(routes::portfolio::publish))
        .route(
            "/api/portfolio/unpublish",
            post(routes::portfolio::unpublish),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::middleware::auth::require_auth,
        ));

    let public = Router::new()
        .route("/health", get(routes::health::handler))
        .route(
            "/api/portfolio/:username",
            get(routes::portfolio::get_public),
        );

    Router::new()
        .merge(public)
        .merge(protected)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
