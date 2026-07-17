-- StateOfFinances — initial schema for budget_tracker
-- Apply with: docker exec -i n8n-automation-budget-db-1 psql -U budget_app -d budget_tracker -f - < 001_init.sql

BEGIN;

CREATE TABLE IF NOT EXISTS categories (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          TEXT NOT NULL UNIQUE,
    type          TEXT NOT NULL CHECK (type IN ('true_fixed', 'recurring_variable', 'flexible')),
    budget_amount NUMERIC(12, 2),
    period        TEXT CHECK (period IN ('weekly', 'monthly')),
    keyword_hints TEXT[] NOT NULL DEFAULT '{}',
    created_by    TEXT NOT NULL DEFAULT 'system' CHECK (created_by IN ('system', 'user')),
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS income (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pay_date       DATE NOT NULL,
    type           TEXT NOT NULL CHECK (type IN ('variable', 'fixed')),
    expected_usd   NUMERIC(12, 2),
    confirmed_zar  NUMERIC(12, 2),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    amount          NUMERIC(12, 2) NOT NULL,
    category_id     INTEGER REFERENCES categories(id),
    source          TEXT NOT NULL CHECK (source IN ('manual', 'slip')),
    raw_ocr_text    TEXT,
    note            TEXT,
    telegram_msg_id BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budgets (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    month           DATE NOT NULL,             -- first day of the month this budget covers
    income_total    NUMERIC(12, 2) NOT NULL,
    savings_10pct   NUMERIC(12, 2) NOT NULL,
    slush_5pct      NUMERIC(12, 2) NOT NULL,
    weekly_budget   NUMERIC(12, 2) NOT NULL,   -- weekday pool for the given week_number
    weekend_budget  NUMERIC(12, 2) NOT NULL,   -- carved-out weekend pool for the given week_number
    week_number     INTEGER NOT NULL,          -- 1-based week within the month
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (month, week_number)
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_income_pay_date ON income(pay_date);
CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);

INSERT INTO categories (name, type, keyword_hints, created_by) VALUES
    ('Rent',          'true_fixed', ARRAY['rent', 'landlord'],              'system'),
    ('Electricity',   'true_fixed', ARRAY['electricity', 'eskom', 'prepaid electricity'], 'system'),
    ('Water',         'true_fixed', ARRAY['water', 'municipal'],            'system'),
    ('Internet',      'true_fixed', ARRAY['internet', 'fibre', 'wifi', 'isp'], 'system'),
    ('Debt',          'true_fixed', ARRAY['debt', 'loan', 'repayment', 'instalment'], 'system'),
    ('Minette',       'true_fixed', ARRAY['minette'],                       'system'),
    ('Subscriptions', 'true_fixed', ARRAY['subscription', 'netflix', 'spotify', 'chatgpt', 'openai'], 'system'),
    ('Groceries',     'recurring_variable', ARRAY['groceries', 'checkers', 'woolworths', 'pick n pay', 'spar', 'shoprite'], 'system'),
    ('Petrol',        'recurring_variable', ARRAY['petrol', 'fuel', 'garage', 'shell', 'engen', 'sasol', 'bp'], 'system'),
    ('Sigarettes',    'recurring_variable', ARRAY['sigarettes', 'cigarettes', 'cigs'], 'system')
ON CONFLICT (name) DO NOTHING;

COMMIT;
