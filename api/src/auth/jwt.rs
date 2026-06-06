use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::error::{AppError, Result};

/// Claims embedded in JWTs issued by Next.js (Better Auth layer).
/// `sub` is the Better Auth user ID (TEXT, not UUID).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub username: String,
    pub exp: i64,
    pub iat: i64,
}

pub struct JwtService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
}

impl JwtService {
    pub fn new(secret: &str) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_bytes()),
            decoding_key: DecodingKey::from_secret(secret.as_bytes()),
        }
    }

    pub fn create_token(&self, user_id: &str, username: &str) -> Result<String> {
        let now = Utc::now();
        let claims = Claims {
            sub: user_id.to_owned(),
            username: username.to_owned(),
            exp: (now + chrono::Duration::minutes(10)).timestamp(),
            iat: now.timestamp(),
        };
        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| AppError::Auth(format!("token creation failed: {e}")))
    }

    pub fn validate_token(&self, token: &str) -> Result<Claims> {
        decode::<Claims>(token, &self.decoding_key, &Validation::default())
            .map(|data| data.claims)
            .map_err(|e| AppError::Auth(format!("invalid token: {e}")))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn jwt() -> JwtService {
        JwtService::new("test-secret-that-is-long-enough-for-hmac-sha256")
    }

    #[test]
    fn roundtrip_token() {
        let svc = jwt();
        let token = svc.create_token("user_abc123", "alice").unwrap();
        let claims = svc.validate_token(&token).unwrap();
        assert_eq!(claims.sub, "user_abc123");
        assert_eq!(claims.username, "alice");
    }

    #[test]
    fn rejects_tampered_token() {
        let svc = jwt();
        let token = svc.create_token("user_abc123", "alice").unwrap();
        assert!(svc.validate_token(&format!("{token}x")).is_err());
    }

    #[test]
    fn rejects_wrong_secret() {
        let svc1 = jwt();
        let svc2 = JwtService::new("completely-different-secret-value-that-is-long");
        let token = svc1.create_token("user_abc123", "alice").unwrap();
        assert!(svc2.validate_token(&token).is_err());
    }
}
