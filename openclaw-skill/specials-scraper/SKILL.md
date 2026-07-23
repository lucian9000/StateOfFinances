---
name: specials-scraper
description: Fetch current South African grocery-store specials, parse them into structured rows, and upsert them into the `specials` table (with a real scraped_at timestamp). Used by the StateOfGroceries bot's scheduled weekly scrape and its /refresh command. Trigger for grocery specials/deals refresh only — not general web search.
metadata: { "openclaw": { "emoji": "🛒", "requires": { "bins": ["node"] } } }
---

# Specials Scraper

One script, two triggers (scheduled + `/refresh`) — never duplicate the scrape
logic across workflows; both call this.

```bash
node scripts/scrape.js
```

Prints a single JSON line:
```json
{ "ok": true, "stale": false, "scraped_count": 12,
  "last_scraped_at": "2026-07-23T...Z", "message": "Scraped 12 specials...", "errors": [] }
```

## Source

Primary source is **ScrapingBee `fast_search`** (a Google-search API), one query
per store in `STORE_QUERIES` (Checkers, Pick n Pay, Shoprite, Woolworths — edit
that array to change coverage). Results are Google snippets, so specials are
**approximate** (snippet-level, not a full catalogue). That's why every row
carries a real `scraped_at` and all downstream copy says "prices as of [date]".

An LLM (`openclaw infer model run`) turns the noisy snippets into structured rows
and is instructed to extract **only** items/prices actually present in the text —
it does not invent prices. Rows upsert on `(store, item_keyword, valid_until)`.

A structured second source (e.g. the Apify "Checkers Scraper" actor) can be
added later — the parse/upsert path is source-agnostic; only the fetch differs.

## Failure policy (hard requirement)

On scrape/parse failure or zero fresh rows, the script does **not** return empty
and does **not** present old data as fresh. It returns the most recent stored
specials with `stale: true`, the real `last_scraped_at`, and a message like
"Refresh failed — showing last successful fetch from 2026-07-18." The bot/dashboard
must surface that wording verbatim.

## Secrets

`SCRAPINGBEE_API_KEY` (and optional `APIFY_TOKEN`) live in this skill's `.env`
(gitignored) — never in the repo or workflow JSON. Rotate them if they leak.

## Tuning

- Coverage/cost: each store query is one ScrapingBee call. Add/remove stores in
  `STORE_QUERIES`.
- Upsert key `(store, item_keyword, valid_until)` — change in `006_groceries.sql`
  and `upsertSpecial()` together if you need finer de-duplication.
