use std::sync::Arc;

use axum::{extract::State, Extension, Json};

use crate::{
    error::{AppError, Result},
    middleware::auth::CurrentUser,
    services::ast::{AstService, Language, ScoredFile, TreeEntry},
    state::AppState,
};

#[derive(Debug, serde::Deserialize)]
pub struct SelectFilesRequest {
    /// GitHub-reported primary language (e.g. "TypeScript", "Rust"). Optional.
    pub language: Option<String>,
    /// Flat list of blobs from the GitHub Trees API (path + size).
    pub file_tree: Vec<TreeEntry>,
    /// How many files to return. Defaults to 6, capped at 20.
    #[serde(default = "default_max_files")]
    pub max_files: usize,
}

fn default_max_files() -> usize {
    6
}

#[derive(Debug, serde::Serialize)]
pub struct SelectFilesResponse {
    pub selected: Vec<ScoredFile>,
}

pub async fn select_files(
    State(_state): State<Arc<AppState>>,
    Extension(_current_user): Extension<CurrentUser>,
    Json(body): Json<SelectFilesRequest>,
) -> Result<Json<SelectFilesResponse>> {
    if body.file_tree.len() > 10_000 {
        return Err(AppError::BadRequest("file_tree too large (max 10 000 entries)".into()));
    }
    let max_files = body.max_files.clamp(1, 20);

    let lang = body.language.as_deref().and_then(Language::from_str_loose);
    let svc = AstService::new();
    let selected = svc.score_file_tree(&body.file_tree, lang, max_files);

    Ok(Json(SelectFilesResponse { selected }))
}
