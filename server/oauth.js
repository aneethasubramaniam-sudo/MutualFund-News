import crypto from 'node:crypto';
import { httpError } from './errors.js';

const X_API = process.env.X_BASE_URL || 'https://api.x.com';
const X_AUTHORIZE = process.env.X_AUTHORIZE_URL || 'https://x.com/i/oauth2/authorize';
const LI_OAUTH = process.env.LINKEDIN_OAUTH_BASE || 'https://www.linkedin.com';
const LI_API = process.env.LINKEDIN_BASE_URL || 'https://api.linkedin.com';

// No state is kept on the server. That is what lets this run on serverless hosting.
// The browser holds the PKCE verifier and sends it back with the code.
const b64url = (buf) => buf.toString('base64url');

function checkRedirect(uri) {
  try {
    const u = new URL(uri);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    return u.toString();
  } catch {
    throw httpError(400, 'redirectUri is not a valid URL.');
  }
}

export function startAuth({ provider, clientId, clientSecret, redirectUri }) {
  if (!['x', 'linkedin'].includes(provider)) throw httpError(400, 'Unknown provider.');
  if (!clientId?.trim()) throw httpError(400, 'Client ID is missing. Add it in Settings.');
  if (provider === 'linkedin' && !clientSecret?.trim()) throw httpError(400, 'LinkedIn Client Secret is missing. Add it in Settings.');

  const state = crypto.randomBytes(16).toString('hex');
  const verifier = b64url(crypto.randomBytes(32));
  const q = new URLSearchParams({ response_type: 'code', client_id: clientId.trim(), redirect_uri: checkRedirect(redirectUri), state });
  let base;
  if (provider === 'x') {
    q.set('scope', 'tweet.read tweet.write users.read offline.access');
    q.set('code_challenge', b64url(crypto.createHash('sha256').update(verifier).digest()));
    q.set('code_challenge_method', 'S256');
    base = X_AUTHORIZE;
  } else {
    q.set('scope', 'openid profile w_member_social');
    base = `${LI_OAUTH}/oauth/v2/authorization`;
  }
  return { state, verifier, authUrl: `${base}?${q}` };
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

export async function exchangeCode({ provider, clientId, clientSecret, code, verifier, redirectUri }) {
  if (!['x', 'linkedin'].includes(provider)) throw httpError(400, 'Unknown provider.');
  if (!clientId || !code) throw httpError(400, 'Missing client ID or code.');
  const redirect = checkRedirect(redirectUri);
  let d;
  if (provider === 'x') {
    if (!verifier) throw httpError(400, 'Missing PKCE verifier.');
    d = await postForm(`${X_API}/2/oauth2/token`, {
      code, grant_type: 'authorization_code', client_id: clientId, redirect_uri: redirect, code_verifier: verifier,
    }, clientSecret ? `${clientId}:${clientSecret}` : null);
  } else {
    d = await postForm(`${LI_OAUTH}/oauth/v2/accessToken`, {
      grant_type: 'authorization_code', code, redirect_uri: redirect, client_id: clientId, client_secret: clientSecret || '',
    });
  }
  const tokens = toTokens(d);
  tokens.account = await accountName(provider, tokens.accessToken);
  return tokens;
}

export async function refreshX({ clientId, clientSecret, refreshToken }) {
  if (!clientId || !refreshToken) throw httpError(400, 'Cannot refresh. Connect X again.');
  const d = await postForm(`${X_API}/2/oauth2/token`, {
    grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId,
  }, clientSecret ? `${clientId}:${clientSecret}` : null);
  return toTokens(d);
}
