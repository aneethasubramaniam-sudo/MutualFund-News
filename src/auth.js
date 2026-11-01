import { callAgent } from './api.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Opens the provider's sign-in popup and waits for the server to finish the token exchange. */
export async function connect(provider, s) {
  // Open the popup synchronously inside the click, or browsers block it.
  const win = window.open('', 'mfn-oauth', 'width=520,height=720');
  if (!win) throw new Error('Popup was blocked. Allow popups for this page and try again.');
  try {
    const clientId = provider === 'x' ? s.xClientId : s.liClientId;
    const clientSecret = provider === 'x' ? s.xClientSecret : s.liClientSecret;
    const { state, authUrl } = await callAgent('auth/start', { provider, clientId, clientSecret }, s);
    win.location = authUrl;

    const deadline = Date.now() + 5 * 60_000;
    while (Date.now() < deadline) {
      await sleep(1500);
      const r = await fetch(`/api/auth/result/${state}`).then((x) => x.json());
      if (r.status === 'done') return r.tokens;
      if (r.status === 'error') throw new Error(r.error);
      if (r.status === 'unknown') throw new Error('Sign-in expired. Try again.');
      if (win.closed) throw new Error('Sign-in window was closed before finishing.');
    }
    throw new Error('Sign-in timed out.');
  } catch (e) {
    if (!win.closed) win.close();
    throw e;
  }
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
