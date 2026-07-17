-- Goals: user-defined savings/spend targets shown on the Overview dashboard.
-- No CRUD UI yet (Phase 2 is read-only) — create/update rows via psql for now.

BEGIN;

CREATE TABLE IF NOT EXISTS goals (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           TEXT NOT NULL,
    icon           TEXT,                         -- lucide-react icon name, e.g. 'plane', 'home'
    target_amount  NUMERIC(12, 2) NOT NULL,
    current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    target_date    DATE,
    active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_active ON goals(active);

COMMIT;
