CREATE TABLE "teams" (
  "id" BIGSERIAL PRIMARY KEY,
  "settings" JSONB NOT NULL DEFAULT '{}'::jsonb
);
