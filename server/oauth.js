import crypto from 'node:crypto';
import { httpError } from './errors.js';

const PORT = Number(process.env.PORT) || 8787;
const X_API = process.env.X_BASE_URL || 'https://api.x.com';
const X_AUTHORIZE = process.env.X_AUTHORIZE_URL || 'https://x.com/i/oauth2/authorize';
const LI_OAUTH = process.env.LINKEDIN_OAUTH_BASE || 'https://www.linkedin.com';
const LI_API = process.env.LINKEDIN_BASE_URL || 'https://api.linkedin.com';
const TTL = 10 * 60_000;

export const redirectUri = () => `${process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${PORT}`}/api/auth/callback`;

// In-memory only. Entries expire and are removed once used.
const pending = new Map(); // state -> flow details (incl. client secret)
const results = new Map(); // state -> tokens or error, handed over once

const b64url = (buf) => buf.toString('base64url');
const sweep = () => {
  const now = Date.now();
  for (const m of [pending, results]) for (const [k, v] of m) if (now - v.created > TTL) m.delete(k);
};

export function startAuth({ provider, clientId, clientSecret }) {
  sweep();
  if (!['x', 'linkedin'].includes(provider)) throw httpError(400, 'Unknown provider.');
  if (!clientId?.trim()) throw httpError(400, 'Client ID is missing. Add it in Settings.');
  if (provider === 'linkedin' && !clientSecret?.trim()) throw httpError(400, 'LinkedIn Client Secret is missing. Add it in Settings.');

  const state = crypto.randomBytes(16).toString('hex');
  const flow = { provider, clientId: clientId.trim(), clientSecret: (clientSecret || '').trim(), created: Date.now() };
  const q = new URLSearchParams({ response_type: 'code', client_id: flow.clientId, redirect_uri: redirectUri(), state });
  let base;
  if (provider === 'x') {
    flow.verifier = b64url(crypto.randomBytes(32));
    q.set('scope', 'tweet.read tweet.write users.read offline.access');
    q.set('code_challenge', b64url(crypto.createHash('sha256').update(flow.verifier).digest()));
    q.set('code_challenge_method', 'S256');
    base = X_AUTHORIZE;
  } else {
    q.set('scope', 'openid profile w_member_social');
    base = `${LI_OAUTH}/oauth/v2/authorization`;
  }
  pending.set(state, flow);
  return { state, authUrl: `${base}?${q}` };
}

async function postForm(url, params, basicAuth) {
  const headers = { 'content-type': 'application/x-www-form-urlencoded' };
  if (basicAuth) headers.authorization = `Basic ${Buffer.from(basicAuth).toString('base64')}`;
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers, body: new URLSearchParams(params), signal: AbortSignal.timeout(30_000) });
  } catch (e) {
    throw httpError(502, `Could not reach the provider: ${e.message}`);
  }
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.access_token) throw httpError(502, `Token request failed (${res.status}): ${d.error_description || d.error || d.detail || 'no detail'}`);
  return d;
}

const toTokens = (d) => ({
  accessToken: d.access_token,
  refreshToken: d.refresh_token || '',
  expiresAt: d.expires_in ? Date.now() + Number(d.expires_in) * 1000 : 0,
});

async function accountName(provider, token) {
  try {
    const auth = { authorization: `Bearer ${token}` };
    if (provider === 'x') {
      const d = await (await fetch(`${X_API}/2/users/me`, { headers: auth, signal: AbortSignal.timeout(15_000) })).json();
      return d.data?.username ? `@${d.data.username}` : '';
    }
    const d = await (await fetch(`${LI_API}/v2/userinfo`, { headers: auth, signal: AbortSignal.timeout(15_000) })).json();
    return d.name || '';
  } catch {
    return ''; // cosmetic only
  }
}

/** Called by the provider's redirect. Returns the HTML shown in the popup. */
export async function handleCallback({ state, code, error }) {
  sweep();
  const flow = pending.get(String(state || ''));
  if (!flow) return { ok: false };
  pending.delete(state);
  const fail = (msg) => { results.set(state, { created: Date.now(), error: msg }); return { ok: false }; };
  if (error || !code) return fail(`Sign-in was cancelled or denied (${error || 'no code'}).`);

  try {
    let d;
    if (flow.provider === 'x') {
      d = await postForm(`${X_API}/2/oauth2/token`, {
        code, grant_type: 'authorization_code', client_id: flow.clientId, redirect_uri: redirectUri(), code_verifier: flow.verifier,
      }, flow.clientSecret ? `${flow.clientId}:${flow.clientSecret}` : null);
    } else {
      d = await postForm(`${LI_OAUTH}/oauth/v2/accessToken`, {
        grant_type: 'authorization_code', code, redirect_uri: redirectUri(), client_id: flow.clientId, client_secret: flow.clientSecret,
      });
    }
    const tokens = toTokens(d);
    tokens.account = await accountName(flow.provider, tokens.accessToken);
    results.set(state, { created: Date.now(), tokens });
    return { ok: true };
  } catch (e) {
    return fail(e.message);
  }
}

export function getResult(state) {
  const r = results.get(state);
  if (!r) return { status: pending.has(state) ? 'pending' : 'unknown' };
  results.delete(state);
  return r.error ? { status: 'error', error: r.error } : { status: 'done', tokens: r.tokens };
}

export async function refreshX({ clientId, clientSecret, refreshToken }) {
  if (!clientId || !refreshToken) throw httpError(400, 'Cannot refresh. Connect X again.');
  const d = await postForm(`${X_API}/2/oauth2/token`, {
    grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId,
  }, clientSecret ? `${clientId}:${clientSecret}` : null);
  return toTokens(d);
}
