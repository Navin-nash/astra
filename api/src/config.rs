use anyhow::{Context, Result};

const OPENROUTER_BASE_URL: &str = "https://openrouter.ai/api/v1";
const GROQ_BASE_URL: &str = "https://api.groq.com/openai/v1";
const NVIDIA_NIM_BASE_URL: &str = "https://integrate.api.nvidia.com/v1";
/// Fallback endpoint used when ADC is not configured (Gemini API / AI Studio).
const GOOGLE_AI_STUDIO_URL: &str = "https://generativelanguage.googleapis.com/v1beta/openai";

#[derive(Debug, Clone)]
pub struct Config {
    pub port: u16,
    pub environment: Environment,
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub frontend_url: String,
    /// Primary AI provider — NVIDIA NIM (40 RPM, no daily cap)
    pub nvidia_nim_api_key: String,
    pub nvidia_nim_base_url: String,
    /// Secondary AI provider — Groq (30 RPM, 12K TPM, 1K RPD)
    pub groq_api_key: String,
    pub groq_base_url: String,
    /// Last-resort AI provider — OpenRouter free tier (1K RPD — preserve daily budget)
    pub openrouter_api_key: String,
    pub openrouter_base_url: String,
    /// Gemini API key (AI Studio). Used only when ADC credentials are absent.
    pub google_api_key: Option<String>,
    /// Resolved OpenAI-compatible base URL for Gemini.
    /// Auto-set to the Agent Platform (aiplatform.googleapis.com) URL when ADC is configured;
    /// falls back to the AI Studio endpoint otherwise.
    pub google_base_url: String,
    /// Google ADC credentials (authorized_user type — from `gcloud auth application-default login`).
    /// When all three are present, the AI service exchanges the refresh_token for a Bearer
    /// access token and routes requests through the Agent Platform endpoint.
    pub google_client_id: Option<String>,
    pub google_client_secret: Option<String>,
    pub google_refresh_token: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Environment {
    Development,
    Production,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let environment = match std::env::var("ENVIRONMENT")
            .unwrap_or_else(|_| "development".into())
            .as_str()
        {
            "production" => Environment::Production,
            _ => Environment::Development,
        };

        let google_client_id = std::env::var("GOOGLE_CLIENT_ID").ok();
        let google_client_secret = std::env::var("GOOGLE_CLIENT_SECRET").ok();
        let google_refresh_token = std::env::var("GOOGLE_REFRESH_TOKEN").ok();
        let has_adc = google_client_id.is_some()
            && google_client_secret.is_some()
            && google_refresh_token.is_some();

        // Resolve Gemini base URL. Priority order:
        //   1. Explicit GOOGLE_BASE_URL env var (always wins)
        //   2. Agent Platform URL constructed from GOOGLE_CLOUD_PROJECT / GOOGLE_CLOUD_LOCATION /
        //      API_ENDPOINT when ADC credentials are present (migrated path)
        //   3. AI Studio endpoint fallback (legacy API-key path)
        let google_base_url = std::env::var("GOOGLE_BASE_URL").unwrap_or_else(|_| {
            if has_adc {
                let project = std::env::var("GOOGLE_CLOUD_PROJECT").unwrap_or_default();
                let location = std::env::var("GOOGLE_CLOUD_LOCATION")
                    .unwrap_or_else(|_| "global".into())
                    .trim_matches('"')
                    .to_owned();
                let api_endpoint = std::env::var("API_ENDPOINT")
                    .unwrap_or_else(|_| "https://aiplatform.googleapis.com".into())
                    .trim_matches('"')
                    .to_owned();
                format!(
                    "{}/v1/projects/{}/locations/{}/endpoints/openapi",
                    api_endpoint, project, location
                )
            } else {
                GOOGLE_AI_STUDIO_URL.into()
            }
        });

        Ok(Self {
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "8080".into())
                .parse()
                .context("PORT must be a valid port number")?,
            environment,
            database_url: std::env::var("DATABASE_URL").context("DATABASE_URL must be set")?,
            redis_url: std::env::var("REDIS_URL").context("REDIS_URL must be set")?,
            jwt_secret: std::env::var("JWT_SECRET").context("JWT_SECRET must be set")?,
            frontend_url: std::env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:3000".into()),
            nvidia_nim_api_key: std::env::var("NVIDIA_NIM_API_KEY")
                .context("NVIDIA_NIM_API_KEY must be set (NVIDIA NIM primary AI provider)")?,
            nvidia_nim_base_url: std::env::var("NVIDIA_NIM_BASE_URL")
                .unwrap_or_else(|_| NVIDIA_NIM_BASE_URL.into()),
            groq_api_key: std::env::var("GROQ_API_KEY")
                .context("GROQ_API_KEY must be set (Groq secondary AI provider)")?,
            groq_base_url: std::env::var("GROQ_BASE_URL")
                .unwrap_or_else(|_| GROQ_BASE_URL.into()),
            openrouter_api_key: std::env::var("OPENROUTER_API_KEY")
                .context("OPENROUTER_API_KEY must be set (OpenRouter fallback AI provider)")?,
            openrouter_base_url: std::env::var("OPENAI_BASE_URL")
                .unwrap_or_else(|_| OPENROUTER_BASE_URL.into()),
            google_api_key: std::env::var("GOOGLE_API_KEY").ok(),
            google_base_url,
            google_client_id,
            google_client_secret,
            google_refresh_token,
        })
    }

    /// Returns true if OAuth2 ADC credentials are fully configured.
    pub fn has_google_adc(&self) -> bool {
        self.google_client_id.is_some()
            && self.google_client_secret.is_some()
            && self.google_refresh_token.is_some()
    }

    pub fn is_production(&self) -> bool {
        self.environment == Environment::Production
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_fails_without_required_env() {
        // from_env() must fail when DATABASE_URL or other required keys are absent.
        if std::env::var("DATABASE_URL").is_err() {
            assert!(
                Config::from_env().is_err(),
                "Config::from_env() must fail when required env vars are absent"
            );
        }
    }
}
