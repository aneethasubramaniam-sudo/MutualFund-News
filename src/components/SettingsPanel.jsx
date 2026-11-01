export default function SettingsPanel({ s, set, open, setOpen }) {
  const update = (k) => (e) => set({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const missing = !s.openaiKey.trim() || !s.serpKey.trim();

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
          <label className="check">
            <input type="checkbox" checked={s.remember} onChange={update('remember')} />
            Remember keys on this device (browser storage, not encrypted)
          </label>
          <div>
            <button className="ghost" onClick={() => set({ ...s, openaiKey: '', serpKey: '' })}>Clear keys</button>
          </div>
          <p className="hint">Keys go to your local server on each request and are not stored there. Run this on your own machine only.</p>
        </div>
      )}
    </section>
  );
}
