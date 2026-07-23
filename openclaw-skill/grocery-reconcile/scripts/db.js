const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const out = {};
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2];
    }
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };

const pool = new Pool({
  host: env.PGHOST || '127.0.0.1',
  port: Number(env.PGPORT || 5434),
  user: env.PGUSER || 'budget_app',
  password: env.PGPASSWORD,
  database: env.PGDATABASE || 'budget_tracker',
});

module.exports = { pool, env };
