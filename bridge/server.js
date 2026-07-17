#!/usr/bin/env node
// budget-bridge: tiny HTTP shim letting the n8n container (Docker, isolated from the
// host) invoke the OpenClaw "budget-capture" skill scripts running on the host.
// Bound ONLY to the docker bridge gateway IP (172.18.0.1), not 0.0.0.0 — reachable
// from containers on that network, not from the wider LAN/internet.

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

const HOST = process.env.BRIDGE_HOST || '172.18.0.1';
const PORT = Number(process.env.BRIDGE_PORT || 8790);
const TOKEN = process.env.BRIDGE_TOKEN;
const SKILL_DIR = process.env.SKILL_DIR
  || '/home/mrrobot/.openclaw/workspace/skills/budget-capture';
const MAX_BODY_BYTES = 15 * 1024 * 1024; // receipt photos

if (!TOKEN) {
  console.error('BRIDGE_TOKEN not set — refusing to start unauthenticated bridge');
  process.exit(1);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function runScript(scriptName, arg) {
  return new Promise((resolve, reject) => {
    execFile(
      'node',
      [path.join(SKILL_DIR, 'scripts', scriptName), arg],
      { timeout: 90000, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || err.message));
          return;
        }
        try {
          resolve(JSON.parse(stdout.trim()));
        } catch (e) {
          reject(new Error(`script produced non-JSON output: ${stdout.slice(0, 500)}`));
        }
      }
    );
  });
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) });
  res.end(json);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      send(res, 200, { ok: true });
      return;
    }

    if (req.headers['x-bridge-token'] !== TOKEN) {
      send(res, 401, { error: 'unauthorized' });
      return;
    }

    if (req.method === 'POST' && req.url === '/classify') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      if (!body.text) { send(res, 400, { error: 'missing "text"' }); return; }
      const result = await runScript('classify.js', JSON.stringify({ text: body.text }));
      send(res, 200, result);
      return;
    }

    if (req.method === 'POST' && req.url === '/ocr') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      if (!body.image_base64) { send(res, 400, { error: 'missing "image_base64"' }); return; }
      const ext = path.extname(body.filename || '').replace(/[^a-zA-Z0-9.]/g, '') || '.jpg';
      const tmpFile = path.join(os.tmpdir(), `budget-slip-${crypto.randomUUID()}${ext}`);
      fs.writeFileSync(tmpFile, Buffer.from(body.image_base64, 'base64'));
      try {
        const result = await runScript('ocr.js', tmpFile);
        send(res, 200, result);
      } finally {
        fs.unlink(tmpFile, () => {});
      }
      return;
    }

    if (req.method === 'POST' && req.url === '/confirm-category') {
      const body = (await readBody(req)).toString('utf8') || '{}';
      const result = await runScript('confirm_category.js', body);
      send(res, 200, result);
      return;
    }

    send(res, 404, { error: 'not found' });
  } catch (err) {
    send(res, 500, { error: err.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`budget-bridge listening on http://${HOST}:${PORT}`);
});
