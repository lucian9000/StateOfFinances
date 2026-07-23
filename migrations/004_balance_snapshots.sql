-- StateOfFinances — manual balance snapshots (corrections/reference points for the
-- dashboard's computed balance, so a "my balance is X" chat message doesn't have to
-- be force-parsed as a transaction).
-- Apply with: docker exec -i n8n-automation-budget-db-1 psql -U budget_app -d budget_tracker -f - < 004_balance_snapshots.sql

BEGIN;

CREATE TABLE IF NOT EXISTS balance_snapshots (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    amount          NUMERIC(12, 2) NOT NULL,
    note            TEXT,
    telegram_msg_id BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_balance_snapshots_created_at ON balance_snapshots(created_at);

COMMIT;
