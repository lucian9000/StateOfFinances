-- Subcategories: categories can now have a parent (one level deep — a
-- subcategory cannot itself have a parent, enforced in application code,
-- not the DB). Also adds pg_trgm so category-creation scripts can warn on
-- near-duplicate names before inserting (e.g. "Grocery" vs "Groceries").
-- Apply with: docker exec -i n8n-automation-budget-db-1 psql -U budget_app -d budget_tracker -f - < 005_subcategories.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES categories(id);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_name_trgm ON categories USING gin (name gin_trgm_ops);

COMMIT;
