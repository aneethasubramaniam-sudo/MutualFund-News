import { callAgent } from './api.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const callbackUrl = () => `${window.location.origin}/api/auth/callback`;

/**
 * Opens the provider's sign-in popup. The popup reports back over a BroadcastChannel
 * (window.opener and popup.closed are unreliable after X or LinkedIn load).
 * Pass an AbortSignal so the user can cancel.
 */
export function connect(provider, s, signal) {
  // Open the popup synchronously inside the click, or browsers block it.
  const win = window.open('', 'mfn-oauth', 'width=520,height=720');
  if (!win) return Promise.reject(new Error('Popup was blocked. Allow popups for this page and try again.'));

  const clientId = provider === 'x' ? s.xClientId : s.liClientId;
  const clientSecret = provider === 'x' ? s.xClientSecret : s.liClientSecret;
  const redirectUri = callbackUrl();
  const channel = new BroadcastChannel('mfn-oauth');

  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => finish(new Error('Sign-in timed out. Try again.')), 5 * 60_000);
    const finish = (err, tokens) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      channel.close();
      try { win.close(); } catch { /* may be blocked */ }
      err ? reject(err) : resolve(tokens);
    };
    signal?.addEventListener('abort', () => finish(new Error('Sign-in cancelled.')));

    (async () => {
      const { state, verifier, authUrl } = await callAgent('auth/start', { provider, clientId, clientSecret, redirectUri }, s);
      channel.onmessage = async (ev) => {
        const m = ev.data;
        if (m?.type !== 'mfn-oauth' || m.state !== state) return;
        if (m.error || !m.code) return finish(new Error(`Sign-in was denied or failed: ${m.error || 'no code returned'}`));
        try {
          const tokens = await callAgent('auth/exchange', { provider, clientId, clientSecret, code: m.code, verifier, redirectUri }, s);
          finish(null, tokens);
        } catch (e) {
          finish(e);
        }
      };
      win.location = authUrl;
    })().catch((e) => finish(e));
  });
}

/** Returns a usable X token, refreshing it first if it is about to expire. */
export async function freshXSettings(s, set) {
  if (!s.xToken || !s.xExpiresAt || Date.now() < s.xExpiresAt - 60_000) return s;
  if (!s.xRefresh) throw new Error('X token expired. Connect X again in Settings.');
  const t = await callAgent('auth/x/refresh', { clientId: s.xClientId, clientSecret: s.xClientSecret, refreshToken: s.xRefresh }, s)
    .catch(() => { throw new Error('X token expired and could not be refreshed. Connect X again in Settings.'); });
  const patch = { xToken: t.accessToken, xRefresh: t.refreshToken || s.xRefresh, xExpiresAt: t.expiresAt };
  set((cur) => ({ ...cur, ...patch }));
  return { ...s, ...patch };
}
