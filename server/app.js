import express from 'express';
import { runResearch } from './agents/research.js';
import { runLinkedIn } from './agents/linkedin.js';
import { runTwitter } from './agents/twitter.js';
import { publishLinkedIn, publishThread } from './publish.js';
import { startAuth, exchangeCode, refreshX } from './oauth.js';
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

// Sign in with X / LinkedIn. Stateless: the browser keeps the PKCE verifier and passes it back.
app.post('/api/auth/start', route((req) => startAuth(req.body || {})));
app.post('/api/auth/exchange', route((req) => exchangeCode(req.body || {})));
app.post('/api/auth/x/refresh', route((req) => refreshX(req.body || {})));

// The provider redirects the popup here. It hands code/state to the app window and closes.
// BroadcastChannel is used because X and others can sever window.opener.
app.get('/api/auth/callback', (_req, res) => {
  res.type('html').send(`<!doctype html><meta charset="utf-8"><title>Sign in</title>
<body style="font-family:system-ui;padding:32px"><p id="m">Finishing sign-in...</p>
<script>
const q = new URLSearchParams(location.search);
const ch = new BroadcastChannel('mfn-oauth');
ch.postMessage({ type: 'mfn-oauth', state: q.get('state'), code: q.get('code'), error: q.get('error_description') || q.get('error') });
document.getElementById('m').textContent = 'Done. You can close this window and go back to the app.';
setTimeout(() => window.close(), 600);
</script></body>`);
});

export default app;
