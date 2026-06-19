use std::time::{Duration, Instant};

use anyhow::{Context, Result};
use reqwest::Client;
use serde::Deserialize;
use tokio::sync::RwLock;

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: u64,
}

struct CachedToken {
    access_token: String,
    expires_at: Instant,
}

/// Manages Google OAuth2 access tokens obtained by exchanging a refresh token.
/// Caches the current token and transparently refreshes it 60 s before expiry.
pub struct GoogleTokenManager {
    client: Client,
    client_id: String,
    client_secret: String,
    refresh_token: String,
    cached: RwLock<Option<CachedToken>>,
}

impl GoogleTokenManager {
    pub fn new(client_id: String, client_secret: String, refresh_token: String) -> Self {
        Self {
            client: Client::new(),
            client_id,
            client_secret,
            refresh_token,
            cached: RwLock::new(None),
        }
    }

    /// Returns a valid access token, refreshing if necessary.
    pub async fn get_access_token(&self) -> Result<String> {
        {
            let cache = self.cached.read().await;
            if let Some(ref t) = *cache {
                if t.expires_at > Instant::now() + Duration::from_secs(60) {
                    return Ok(t.access_token.clone());
                }
            }
        }
        self.refresh().await
    }

    async fn refresh(&self) -> Result<String> {
        let resp = self
            .client
            .post("https://oauth2.googleapis.com/token")
            .form(&[
                ("client_id", self.client_id.as_str()),
                ("client_secret", self.client_secret.as_str()),
                ("refresh_token", self.refresh_token.as_str()),
                ("grant_type", "refresh_token"),
            ])
            .send()
            .await
            .context("Google OAuth2 token request failed")?;

        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            anyhow::bail!("Google token refresh HTTP error: {text}");
        }

        let tr: TokenResponse =
            resp.json().await.context("failed to parse Google token response")?;

        let expires_at = Instant::now() + Duration::from_secs(tr.expires_in);
        let mut cache = self.cached.write().await;
        *cache = Some(CachedToken { access_token: tr.access_token.clone(), expires_at });

        tracing::info!(expires_in = tr.expires_in, "Google ADC token refreshed");
        Ok(tr.access_token)
    }
}
