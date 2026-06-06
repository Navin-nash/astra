ALTER TABLE "user" ADD COLUMN IF NOT EXISTS github_username text;

CREATE UNIQUE INDEX IF NOT EXISTS user_github_username_idx
  ON "user" (github_username)
  WHERE github_username IS NOT NULL;
