import { useState } from 'react';
import { connect } from '../auth.js';

const CALLBACK = 'http://127.0.0.1:8787/api/auth/callback';

function Connection({ name, id, secret, onId, onSecret, secretOptional, token, account, expiresAt, busy, error, onConnect, onDisconnect }) {
  const days = expiresAt ? Math.round((expiresAt - Date.now()) / 86_400_000) : null;
  return (
    <div className="conn">
      <div className="row between">
        <b>{name}</b>
        {token
          ? <span className="ok">Connected{account ? ` as ${account}` : ''}{days !== null && days >= 1 ? `, ${days}d left` : ''}</span>
          : <span className="muted">Not connected</span>}
      </div>
      <label>Client ID<input value={id} onChange={onId} autoComplete="off" /></label>
      <label>Client Secret{secretOptional ? ' (needed only for a "confidential" app)' : ''}
        <input type="password" value={secret} onChange={onSecret} autoComplete="off" />
      </label>
      <div className="row">
        <button onClick={onConnect} disabled={busy}>{busy ? 'Waiting for sign-in...' : token ? `Reconnect ${name}` : `Sign in with ${name}`}</button>
        {token && <button className="ghost" onClick={onDisconnect}>Disconnect</button>}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default function SettingsPanel({ s, set, open, setOpen }) {
  const update = (k) => (e) => set({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const missing = !s.openaiKey.trim() || !s.serpKey.trim();
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState({});

  async function signIn(provider) {
    setBusy(provider);
    setErr((e) => ({ ...e, [provider]: '' }));
    try {
      const t = await connect(provider, s);
      set((cur) => provider === 'x'
        ? { ...cur, xToken: t.accessToken, xRefresh: t.refreshToken, xExpiresAt: t.expiresAt, xAccount: t.account }
        : { ...cur, linkedinToken: t.accessToken, linkedinExpiresAt: t.expiresAt, linkedinAccount: t.account });
    } catch (e) {
      setErr((x) => ({ ...x, [provider]: e.message }));
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="card">
      <div className="row between">
        <h2>Settings {missing && <span className="pill warn">keys needed</span>}</h2>
        <button className="ghost" onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Show'}</button>
      </div>
      {open && (
        <div className="grid">
          <label>OpenAI API key
            <input type="password" autoComplete="off" value={s.openaiKey} onChange={update('openaiKey')} placeholder="sk-..." />
          </label>
          <label>SerpAPI key
            <input type="password" autoComplete="off" value={s.serpKey} onChange={update('serpKey')} placeholder="SerpAPI private key" />
          </label>
          <label>Model
            <input value={s.model} onChange={update('model')} />
          </label>

          <h3>Publishing accounts (optional)</h3>
          <p className="hint">Register this exact callback URL in both developer apps: <code>{CALLBACK}</code></p>
          <Connection name="X" id={s.xClientId} secret={s.xClientSecret} secretOptional
            onId={update('xClientId')} onSecret={update('xClientSecret')}
            token={s.xToken} account={s.xAccount} expiresAt={0} busy={busy === 'x'} error={err.x}
            onConnect={() => signIn('x')}
            onDisconnect={() => set({ ...s, xToken: '', xRefresh: '', xExpiresAt: 0, xAccount: '' })} />
          <Connection name="LinkedIn" id={s.liClientId} secret={s.liClientSecret}
            onId={update('liClientId')} onSecret={update('liClientSecret')}
            token={s.linkedinToken} account={s.linkedinAccount} expiresAt={s.linkedinExpiresAt} busy={busy === 'linkedin'} error={err.linkedin}
            onConnect={() => signIn('linkedin')}
            onDisconnect={() => set({ ...s, linkedinToken: '', linkedinExpiresAt: 0, linkedinAccount: '' })} />

          <label className="check">
            <input type="checkbox" checked={s.remember} onChange={update('remember')} />
            Remember keys and sign-ins on this device (browser storage, not encrypted)
          </label>
          <div>
            <button className="ghost" onClick={() => set({
              ...s, openaiKey: '', serpKey: '', xClientSecret: '', liClientSecret: '',
              xToken: '', xRefresh: '', xExpiresAt: 0, xAccount: '', linkedinToken: '', linkedinExpiresAt: 0, linkedinAccount: '',
            })}>Clear all keys and sign-ins</button>
          </div>
          <p className="hint">Keys go to your local server on each request and are not stored there. Run this on your own machine only.</p>
        </div>
      )}
    </section>
  );
}
