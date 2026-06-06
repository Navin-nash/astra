use std::sync::Arc;

use axum::{
    extract::{Path, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    middleware::auth::CurrentUser,
    services::worker::{spawn_generation, GenerateRequest, GenerationJob},
    state::AppState,
};

pub async fn start(
    State(state): State<Arc<AppState>>,
    Extension(current_user): Extension<CurrentUser>,
    Json(body): Json<GenerateRequest>,
) -> Result<Json<GenerationJob>> {
    if body.repos.is_empty() {
        return Err(AppError::BadRequest("repos must not be empty".into()));
    }
    if body.repos.len() > 10 {
        return Err(AppError::BadRequest("maximum 10 repositories per generation".into()));
    }
    if body.user_id != current_user.id {
        return Err(AppError::Forbidden("user_id mismatch".into()));
    }

    let job_id = Uuid::new_v4();
    let job = GenerationJob::new(job_id);
    state.jobs.insert(job_id, job.clone());

    // Persist initial job state so clients can poll even if the API restarts
    state.persist_job(&job).await;

    spawn_generation(state.clone(), job_id, body);

    Ok(Json(job))
}

pub async fn status(
    State(state): State<Arc<AppState>>,
    Extension(_current_user): Extension<CurrentUser>,
    Path(job_id): Path<Uuid>,
) -> Result<Json<GenerationJob>> {
    // Check in-memory first (covers actively running jobs)
    if let Some(job) = state.jobs.get(&job_id) {
        return Ok(Json(job.clone()));
    }

    // Fall back to Redis — covers completed/failed jobs that survived an API restart
    state
        .get_persisted_job(job_id)
        .await
        .map(Json)
        .ok_or(AppError::JobNotFound(job_id))
}
