-- Performance indexes for Better Auth tables.
-- Run AFTER: npm run auth:migrate (which creates the user/session/account/verification tables).

-- account: used on every request that fetches the GitHub token (getGithubToken hot path)
CREATE INDEX IF NOT EXISTS account_user_provider_idx
    ON account (user_id, provider_id);

-- account: used by OAuth callback lookups
CREATE INDEX IF NOT EXISTS account_provider_account_idx
    ON account (provider_id, account_id);

-- session: Better Auth looks up sessions by token on every request
CREATE INDEX IF NOT EXISTS session_user_id_idx
    ON session (user_id);
