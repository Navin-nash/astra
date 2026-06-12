use sha2::{Sha256, Digest};
use redis::AsyncCommands;

use crate::services::ast::AstMetadata;

const CACHE_TTL_SECS: u64 = 86400;

/// Deterministic cache key for a repo summary.
/// Input: repo name + first 500 chars of README + language + file/function counts.
/// Uses SHA-256 so the key is stable across Rust versions.
pub fn repo_summary_cache_key(repo_name: &str, readme: Option<&str>, ast: &AstMetadata) -> String {
    let readme_prefix: String = readme.unwrap_or("").chars().take(500).collect();
    let input = format!(
        "{}|{}|{}|{}|{}",
        repo_name, readme_prefix, ast.language, ast.file_count, ast.function_count
    );
    let digest = Sha256::digest(input.as_bytes());
    let hash: String = digest.iter().map(|b| format!("{b:02x}")).collect();
    format!("repo_summary:v1:{}:{}", repo_name, &hash[..16])
}

/// Returns a cached repo summary, or `None` on miss or error.
/// Errors are non-fatal: logged as warnings, caller falls back to AI.
pub async fn get_repo_summary(client: &redis::Client, key: &str) -> Option<String> {
    let mut conn = match client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(e) => {
            tracing::warn!(cache_key = key, error = %e, "Redis connect failed on cache GET");
            return None;
        }
    };
    match conn.get::<_, Option<String>>(key).await {
        Ok(val) => val,
        Err(e) => {
            tracing::warn!(cache_key = key, error = %e, "cache GET failed");
            None
        }
    }
}

/// Writes a repo summary to Redis with a 24h TTL.
/// Errors are non-fatal: logged as warnings, caller continues normally.
pub async fn set_repo_summary(client: &redis::Client, key: &str, summary: &str) {
    let mut conn = match client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(e) => {
            tracing::warn!(cache_key = key, error = %e, "Redis connect failed on cache SET");
            return;
        }
    };
    if let Err(e) = conn.set_ex::<_, _, ()>(key, summary, CACHE_TTL_SECS).await {
        tracing::warn!(cache_key = key, error = %e, "cache SET failed");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_meta(language: &str, file_count: usize, function_count: usize) -> AstMetadata {
        AstMetadata {
            language: language.to_owned(),
            file_count,
            function_count,
            ..Default::default()
        }
    }

    #[test]
    fn cache_key_is_deterministic() {
        let meta = make_meta("rust", 5, 20);
        let k1 = repo_summary_cache_key("my-repo", Some("readme content"), &meta);
        let k2 = repo_summary_cache_key("my-repo", Some("readme content"), &meta);
        assert_eq!(k1, k2);
    }

    #[test]
    fn cache_key_differs_on_language_change() {
        let meta_rs = make_meta("rust", 5, 20);
        let meta_ts = make_meta("typescript", 5, 20);
        let k1 = repo_summary_cache_key("my-repo", None, &meta_rs);
        let k2 = repo_summary_cache_key("my-repo", None, &meta_ts);
        assert_ne!(k1, k2);
    }

    #[test]
    fn cache_key_differs_on_readme_change() {
        let meta = make_meta("rust", 5, 20);
        let k1 = repo_summary_cache_key("my-repo", Some("v1 readme"), &meta);
        let k2 = repo_summary_cache_key("my-repo", Some("v2 readme"), &meta);
        assert_ne!(k1, k2);
    }

    #[test]
    fn cache_key_has_expected_prefix() {
        let meta = make_meta("go", 3, 10);
        let key = repo_summary_cache_key("awesome-go", None, &meta);
        assert!(key.starts_with("repo_summary:v1:awesome-go:"), "unexpected key: {key}");
    }
}
