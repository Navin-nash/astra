use anyhow::{Context, Result};

const OPENROUTER_BASE_URL: &str = "https://openrouter.ai/api/v1";
const GROQ_BASE_URL: &str = "https://api.groq.com/openai/v1";
const NVIDIA_NIM_BASE_URL: &str = "https://integrate.api.nvidia.com/v1";
const GOOGLE_BASE_URL: &str = "https://generativelanguage.googleapis.com/v1beta/openai";

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
    /// Primary AI provider — Gemini 2.5 Flash Lite (1000 RPM, API-key auth)
    pub google_api_key: String,
    pub google_base_url: String,
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
            google_api_key: std::env::var("GOOGLE_API_KEY")
                .context("GOOGLE_API_KEY must be set (Gemini primary AI provider)")?,
            google_base_url: std::env::var("GOOGLE_BASE_URL")
                .unwrap_or_else(|_| GOOGLE_BASE_URL.into()),
        })
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
        // from_env() must fail when the environment is incomplete (as in CI without .env).
        // We only assert on the error type, not the exact missing key, because the first
        // missing key (DATABASE_URL, GOOGLE_API_KEY, etc.) depends on load order.
        if std::env::var("DATABASE_URL").is_err() || std::env::var("GOOGLE_API_KEY").is_err() {
            assert!(
                Config::from_env().is_err(),
                "Config::from_env() must fail when required env vars are absent"
            );
        }
    }
}
