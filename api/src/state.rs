use std::sync::Arc;

use dashmap::DashMap;
use redis::AsyncCommands;
use redis::Client as RedisClient;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    auth::jwt::JwtService,
    config::Config,
    error::{AppError, Result},
    services::{ai::AiService, worker::GenerationJob},
};

pub struct AppState {
    pub db: PgPool,
    pub redis: RedisClient,
    pub config: Arc<Config>,
    pub jwt: JwtService,
    pub jobs: Arc<DashMap<Uuid, GenerationJob>>,
    pub ai: Arc<AiService>,
}

impl AppState {
    pub async fn new(config: Config) -> Result<Self> {
        let db = sqlx::postgres::PgPoolOptions::new()
            .max_connections(20)
            .acquire_timeout(std::time::Duration::from_secs(5))
            .connect(&config.database_url)
            .await
            .map_err(AppError::Database)?;

        Self::from_pool(db, config).await
    }

    pub async fn from_pool(db: PgPool, config: Config) -> Result<Self> {
        let redis = RedisClient::open(config.redis_url.as_str()).map_err(AppError::Redis)?;
        let jwt = JwtService::new(&config.jwt_secret);
        let ai = Arc::new(AiService::new(&config));
        let config = Arc::new(config);

        Ok(Self {
            db,
            redis,
            jwt,
            config,
            jobs: Arc::new(DashMap::new()),
            ai,
        })
    }

    pub async fn redis_conn(&self) -> Result<redis::aio::MultiplexedConnection> {
        self.redis
            .get_multiplexed_async_connection()
            .await
            .map_err(AppError::Redis)
    }

    /// Writes a job's current state to Redis so it survives API restarts.
    /// TTL: 1 hour — long enough to poll for completed/failed jobs.
    pub async fn persist_job(&self, job: &GenerationJob) {
        let Ok(json) = serde_json::to_string(job) else {
            return;
        };
        if let Ok(mut conn) = self.redis_conn().await {
            let key = format!("job:{}", job.id);
            let _: redis::RedisResult<()> = conn.set_ex(&key, json, 3600).await;
        }
    }

    /// Reads a job from Redis — used as fallback when not in DashMap.
    pub async fn get_persisted_job(&self, job_id: Uuid) -> Option<GenerationJob> {
        let key = format!("job:{job_id}");
        let mut conn = self.redis_conn().await.ok()?;
        let json: String = conn.get(&key).await.ok()?;
        serde_json::from_str(&json).ok()
    }

    /// Invalidates all Redis cache keys for a portfolio.
    /// Call on: generation complete, publish, unpublish, manual update.
    pub async fn invalidate_portfolio_cache(&self, username: &str, user_id: Option<&str>) {
        let mut keys: Vec<String> = vec![format!("portfolio:{username}")];
        if let Some(uid) = user_id {
            keys.push(format!("portfolio:private:{uid}"));
        }
        if let Ok(mut conn) = self.redis_conn().await {
            let _: redis::RedisResult<i64> = conn.del(keys).await;
        }
    }
}
