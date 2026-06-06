-- Waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT        UNIQUE NOT NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    source     TEXT        NOT NULL DEFAULT 'landing'
);

CREATE INDEX IF NOT EXISTS idx_waitlist_email     ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created   ON waitlist(created_at DESC);
