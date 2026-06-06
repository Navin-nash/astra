-- Performance indexes for the Astra application tables.

-- Repositories: ordered by stars on every portfolio load
CREATE INDEX IF NOT EXISTS repos_stars_idx
    ON repositories (portfolio_id, stars_count DESC);

-- Repositories: language filtering / display grouping
CREATE INDEX IF NOT EXISTS repos_language_idx
    ON repositories (primary_language)
    WHERE primary_language IS NOT NULL;

-- Portfolios: user_id lookup (used by every authenticated API call)
CREATE INDEX IF NOT EXISTS portfolios_user_id_idx
    ON portfolios (user_id);
