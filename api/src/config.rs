use anyhow::{Context, Result};

const GROQ_BASE_URL: &str = "https://api.groq.com/openai/v1";
const GROQ_DEFAULT_MODEL: &str = "llama-3.3-70b-versatile";

#[derive(Debug, Clone)]
pub struct Config {
    pub port: u16,
    pub environment: Environment,
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub frontend_url: String,
    pub groq_api_key: String,
    pub ai_model: String,
    pub ai_base_url: String,
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
            groq_api_key: std::env::var("GROQ_API_KEY").context("GROQ_API_KEY must be set")?,
            ai_model: std::env::var("OPENAI_MODEL")
                .unwrap_or_else(|_| GROQ_DEFAULT_MODEL.into()),
            // OPENAI_BASE_URL overrides the default Groq endpoint, allowing any
            // OpenAI-compatible provider (Anthropic, Ollama, Together, etc.)
            ai_base_url: std::env::var("OPENAI_BASE_URL")
                .unwrap_or_else(|_| GROQ_BASE_URL.into()),
        })
    }

    pub fn is_production(&self) -> bool {
        self.environment == Environment::Production
    }
}
