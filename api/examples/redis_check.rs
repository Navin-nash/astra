use redis::AsyncCommands;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let url = std::env::var("REDIS_URL").expect("REDIS_URL not set in api/.env");
    let masked = url.splitn(3, ':').next().unwrap_or("rediss");
    println!("Connecting to {masked}://***:***@...");

    let client = redis::Client::open(url.as_str())?;
    let mut conn = client.get_multiplexed_async_connection().await?;

    // PING
    let pong: String = redis::cmd("PING")
        .arg("astra-check")
        .query_async(&mut conn)
        .await?;
    println!("PING → {pong}");

    // SET / GET / DEL
    let _: () = conn.set_ex("astra:schema-check", "ok", 10).await?;
    let val: String = conn.get("astra:schema-check").await?;
    let _: () = conn.del("astra:schema-check").await?;
    println!("R/W  → {val}");

    println!("\n✓ Redis is reachable and ready.");

    println!("\nCache key schema:");
    println!("  repo_summary:v1:{{name}}:{{sha256[:16]}}   TTL 86400s  AI repo summaries");
    println!("  job:{{uuid}}                                TTL  3600s  Generation job state");
    println!("  portfolio:{{username}}                      no TTL     Public portfolio cache");
    println!("  portfolio:private:{{user_id}}               no TTL     Private portfolio cache");

    Ok(())
}
