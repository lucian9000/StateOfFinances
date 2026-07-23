#!/usr/bin/env node
// Usage: node scrape.js
// Fetches current SA grocery specials, LLM-parses them into structured rows,
// upserts into the `specials` table with scraped_at = now(), and prints a JSON
// summary. Shared by both the "Scrape Specials — Scheduled" and
// "Scrape Specials — Manual" (/refresh) n8n workflows — same logic, two triggers.
//
// SOURCE: ScrapingBee `fast_search` (Google search API), one query per store in
// STORE_QUERIES. Snippet-level, so specials are approximate — every row keeps a
// real scraped_at so downstream can always show "prices as of [date]".
// (An Apify structured-scraper source can be added in fetchViaApify() later; the
// parse/upsert path below is source-agnostic.)
//
// FAILURE POLICY (spec requirement): never serve stale data as fresh, never
// return nothing. If the fetch/parse yields no fresh rows, we return the most
// recent previously-stored specials with their real scraped_at and stale:true.

const { execFileSync } = require('child_process');
const { pool, env } = require('./db');

const STORE_QUERIES = [
  { store: 'Checkers', query: 'Checkers specials this week' },
  { store: 'Pick n Pay', query: 'Pick n Pay specials this week' },
  { store: 'Shoprite', query: 'Shoprite specials this week' },
  { store: 'Woolworths', query: 'Woolworths food specials this week' },
];

function extractJson(raw) {
  try { return JSON.parse(raw); } catch (e) { /* fall through */ }
  const firstArr = raw.indexOf('[');
  const firstObj = raw.indexOf('{');
  const start = firstArr !== -1 && (firstObj === -1 || firstArr < firstObj) ? firstArr : firstObj;
  const end = raw.lastIndexOf(start === firstArr ? ']' : '}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`no JSON found in output: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(raw.slice(start, end + 1));
}

async function scrapingBeeSearch(query) {
  const key = env.SCRAPINGBEE_API_KEY;
  if (!key) throw new Error('SCRAPINGBEE_API_KEY not set');
  const url = `https://app.scrapingbee.com/api/v1/fast_search?search=${encodeURIComponent(query)}&country_code=za`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`ScrapingBee ${res.status} for "${query}"`);
  const data = await res.json();
  return (data.organic || []).map((o) => ({
    title: o.title, description: o.description, link: o.link,
  }));
}

// LLM turns noisy search snippets into structured specials rows. We ask ONLY for
// items actually visible in the snippet text — no inventing prices.
function parseSnippets(store, results) {
  const blob = results
    .map((r, i) => `[${i}] ${r.title}\n${r.description}\n${r.link}`)
    .join('\n\n');
  const prompt = `These are Google search snippets about grocery specials at ${store} in South Africa. `
    + `Extract ONLY concrete specials that are explicitly visible in the snippet text (an item with a price, and/or a validity date range). `
    + `Do NOT invent prices or items that aren't in the text. Prices are in ZAR. Dates as YYYY-MM-DD if a year is present, else leave null.\n\n`
    + `Snippets:\n${blob}\n\n`
    + `Respond with ONLY a JSON array, no markdown:\n`
    + `[{"item_keyword":"<short item name, lowercase>","description":"<the deal text>","price":<number or null>,"valid_from":"<YYYY-MM-DD or null>","valid_until":"<YYYY-MM-DD or null>","source_url":"<the link it came from>"}]\n`
    + `Return [] if nothing concrete is present.`;
  const stdout = execFileSync('openclaw', [
    '--log-level', 'silent', 'infer', 'model', 'run',
    '--model', 'openai/gpt-5.4', '--prompt', prompt, '--json',
  ], { encoding: 'utf8', timeout: 90000 });
  const envelope = extractJson(stdout);
  const text = envelope.outputs && envelope.outputs[0] && envelope.outputs[0].text;
  if (!text) return [];
  const rows = extractJson(text);
  return Array.isArray(rows) ? rows : [];
}

async function upsertSpecial(store, r) {
  await pool.query(
    `INSERT INTO specials (store, item_keyword, description, price, valid_from, valid_until, source_url, scraped_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (store, item_keyword, valid_until)
     DO UPDATE SET description = EXCLUDED.description, price = EXCLUDED.price,
                   valid_from = EXCLUDED.valid_from, source_url = EXCLUDED.source_url,
                   scraped_at = now()`,
    [store, String(r.item_keyword || '').toLowerCase().trim() || 'special',
      r.description || null, r.price ?? null, r.valid_from || null,
      r.valid_until || null, r.source_url || null]
  );
}

async function latestStale() {
  const { rows } = await pool.query(
    `SELECT store, item_keyword, description, price, valid_from, valid_until, source_url, scraped_at
     FROM specials ORDER BY scraped_at DESC LIMIT 50`
  );
  const last = rows.length ? rows[0].scraped_at : null;
  return { rows, last };
}

async function main() {
  let scraped = 0;
  const errors = [];
  for (const { store, query } of STORE_QUERIES) {
    try {
      const results = await scrapingBeeSearch(query);
      const parsed = parseSnippets(store, results);
      for (const r of parsed) {
        if (!r.item_keyword) continue;
        await upsertSpecial(store, r);
        scraped += 1;
      }
    } catch (e) {
      errors.push(`${store}: ${e.message}`);
    }
  }

  if (scraped === 0) {
    // Never return empty-handed: fall back to the last successful data, flagged.
    const { rows, last } = await latestStale();
    console.log(JSON.stringify({
      ok: false,
      stale: true,
      scraped_count: 0,
      last_scraped_at: last,
      items: rows,
      message: last
        ? `Refresh failed — showing last successful fetch from ${new Date(last).toISOString().slice(0, 10)}.`
        : 'Refresh failed and no previous specials exist yet.',
      errors,
    }));
  } else {
    console.log(JSON.stringify({
      ok: true,
      stale: false,
      scraped_count: scraped,
      last_scraped_at: new Date().toISOString(),
      message: `Scraped ${scraped} specials across ${STORE_QUERIES.length} stores.`,
      errors,
    }));
  }
  await pool.end();
}

main().catch(async (err) => {
  // Total failure (e.g. DB down): still try to return last-known specials.
  try {
    const { rows, last } = await latestStale();
    console.log(JSON.stringify({
      ok: false, stale: true, scraped_count: 0, last_scraped_at: last, items: rows,
      message: last ? `Refresh failed — showing last successful fetch from ${new Date(last).toISOString().slice(0, 10)}.`
        : 'Refresh failed and no previous specials exist yet.',
      errors: [String(err.message || err)],
    }));
  } catch (e2) {
    console.error(err.stack || String(err));
    process.exit(1);
  }
  await pool.end();
});
