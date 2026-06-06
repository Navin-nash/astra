CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Portfolios are owned by a Better Auth user ID (TEXT).
-- The Rust API never manages its own users table.
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    mdx_content TEXT NOT NULL DEFAULT '',
    theme_config JSONB NOT NULL DEFAULT '{}',
    is_published BOOLEAN NOT NULL DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portfolios_username_idx ON portfolios (username);
CREATE INDEX IF NOT EXISTS portfolios_published_idx ON portfolios (is_published) WHERE is_published = true;

CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    github_repo_id TEXT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    description TEXT,
    html_url TEXT,
    homepage TEXT,
    primary_language TEXT,
    topics JSONB NOT NULL DEFAULT '[]',
    stars_count INTEGER NOT NULL DEFAULT 0,
    forks_count INTEGER NOT NULL DEFAULT 0,
    ast_metadata JSONB,
    ai_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (portfolio_id, github_repo_id)
);

CREATE INDEX IF NOT EXISTS repos_portfolio_id_idx ON repositories (portfolio_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'portfolios_updated_at') THEN
        CREATE TRIGGER portfolios_updated_at BEFORE UPDATE ON portfolios
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'repositories_updated_at') THEN
        CREATE TRIGGER repositories_updated_at BEFORE UPDATE ON repositories
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;
