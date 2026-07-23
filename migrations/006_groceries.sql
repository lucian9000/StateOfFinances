-- Phase 3: StateOfGroceries — grocery list, specials, and slip-OCR match learning.
-- Additive only; no changes to existing tables. All three bots/dashboard share
-- the same budget_tracker DB.
-- Apply with: docker exec -i n8n-automation-budget-db-1 psql -U budget_app -d budget_tracker -f - < 006_groceries.sql

BEGIN;

-- Items a family member has asked to buy. status flips pending -> bought when a
-- slip OCR reconciles it or the dashboard/bot marks it purchased (which also
-- writes a real transactions row and links it here).
CREATE TABLE IF NOT EXISTS grocery_items (
    id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    item_name         TEXT NOT NULL,
    quantity          TEXT NOT NULL DEFAULT '1',          -- free text: "2", "500g", "a dozen"
    requested_by      BIGINT,                             -- telegram_user_id (BIGINT: can exceed int32)
    requested_by_name TEXT,
    estimated_price   NUMERIC(12, 2),                     -- nullable; family may not know the price
    actual_price      NUMERIC(12, 2),                     -- nullable until bought
    status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'bought')),
    transaction_id    INTEGER REFERENCES transactions(id),-- set when bought
    matched_via       TEXT CHECK (matched_via IN ('manual', 'slip_ocr')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    bought_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_grocery_items_status ON grocery_items(status);
CREATE INDEX IF NOT EXISTS idx_grocery_items_transaction ON grocery_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_name_trgm ON grocery_items USING gin (item_name gin_trgm_ops);

-- Scraped/entered store specials. scraped_at is ALWAYS set so the bot/dashboard
-- can show "prices as of [date]" and detect stale data on a failed refresh.
-- The UNIQUE key drives the scraper's upsert (tunable — see the reconciliation doc).
CREATE TABLE IF NOT EXISTS specials (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store        TEXT NOT NULL,
    item_keyword TEXT NOT NULL,
    description  TEXT,
    price        NUMERIC(12, 2),
    valid_from   DATE,
    valid_until  DATE,
    source_url   TEXT,
    scraped_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (store, item_keyword, valid_until)
);

CREATE INDEX IF NOT EXISTS idx_specials_item_keyword ON specials(item_keyword);
CREATE INDEX IF NOT EXISTS idx_specials_keyword_trgm ON specials USING gin (item_keyword gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_specials_scraped_at ON specials(scraped_at DESC);

-- Feedback loop for the slip-OCR -> grocery reconciliation matcher. Every time an
-- "uncertain" match is resolved by the user (yes/no/different), the resolved pair
-- is recorded here and fed back into future LLM match prompts as examples.
CREATE TABLE IF NOT EXISTS match_learnings (
    id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ocr_text          TEXT NOT NULL,
    matched_item_name TEXT NOT NULL,
    confirmed         BOOLEAN NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_learnings_ocr_trgm ON match_learnings USING gin (ocr_text gin_trgm_ops);

COMMIT;
