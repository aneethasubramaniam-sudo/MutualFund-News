import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runResearch } from './agents/research.js';
import { runLinkedIn } from './agents/linkedin.js';
import { runTwitter } from './agents/twitter.js';
import { publishLinkedIn, publishThread } from './publish.js';
import { startAuth, handleCallback, getResult, refreshX } from './oauth.js';
import { httpError } from './errors.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

// Keys arrive per request in headers. They are never logged or stored here.
const creds = (req) => ({
  openaiKey: (req.get('x-openai-key') || '').trim(),
  serpKey: (req.get('x-serp-key') || '').trim(),
  model: (req.get('x-model') || '').trim(),
  linkedinToken: (req.get('x-linkedin-token') || '').trim(),
  xToken: (req.get('x-x-token') || '').trim(),
});

const route = (fn) => async (req, res) => {
  try {
    res.json(await fn(req));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Server error', ...(e.extra || {}) });
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

app.post('/api/publish/linkedin', route((req) =>
  publishLinkedIn({ token: creds(req).linkedinToken, text: String(req.body.text || '') })));

app.post('/api/publish/twitter', route((req) =>
  publishThread({ token: creds(req).xToken, tweets: req.body.tweets, replyTo: req.body.replyTo })));

// Sign in with X / LinkedIn. The popup lands on /callback, the UI polls /result.
app.post('/api/auth/start', route((req) => startAuth(req.body || {})));
app.post('/api/auth/x/refresh', route((req) => refreshX(req.body || {})));
app.get('/api/auth/result/:state', (req, res) => res.json(getResult(req.params.state)));
app.get('/api/auth/callback', async (req, res) => {
  const { ok } = await handleCallback(req.query);
  res.type('html').send(`<!doctype html><meta charset="utf-8"><title>Sign in</title>
<body style="font-family:system-ui;padding:32px"><h2>${ok ? 'Connected' : 'Sign-in failed'}</h2>
<p>${ok ? 'You can close this window and go back to the app.' : 'Go back to the app to see the reason.'}</p>
<script>${ok ? 'setTimeout(()=>window.close(),800)' : ''}</script></body>`);
});

// Serve the built UI when present (npm run build && npm start).
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = Number(process.env.PORT) || 8787;
// Localhost only: the UI hands this server your API keys.
app.listen(port, '127.0.0.1', () => console.log(`API on http://127.0.0.1:${port}`));
