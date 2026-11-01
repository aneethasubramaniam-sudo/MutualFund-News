import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runResearch } from './agents/research.js';
import { runLinkedIn } from './agents/linkedin.js';
import { runTwitter } from './agents/twitter.js';
import { httpError } from './errors.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

// Keys arrive per request in headers. They are never logged or stored here.
const creds = (req) => ({
  openaiKey: (req.get('x-openai-key') || '').trim(),
  serpKey: (req.get('x-serp-key') || '').trim(),
  model: (req.get('x-model') || '').trim(),
});

const route = (fn) => async (req, res) => {
  try {
    res.json(await fn(req));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Server error' });
  }
};

function requireIdea(body) {
  if (!body?.idea?.title) throw httpError(400, 'idea is required.');
  return body.idea;
}

app.post('/api/research', route((req) =>
  runResearch({ ...creds(req), focus: String(req.body.focus || ''), aiAngle: Boolean(req.body.aiAngle) })));

app.post('/api/linkedin', route((req) =>
  runLinkedIn({ ...creds(req), idea: requireIdea(req.body), link: req.body.link, disclaimer: req.body.disclaimer })));

app.post('/api/twitter', route((req) =>
  runTwitter({ ...creds(req), idea: requireIdea(req.body), tweetCount: req.body.tweetCount })));

// Serve the built UI when present (npm run build && npm start).
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = Number(process.env.PORT) || 8787;
// Localhost only: the UI hands this server your API keys.
app.listen(port, '127.0.0.1', () => console.log(`API on http://127.0.0.1:${port}`));
