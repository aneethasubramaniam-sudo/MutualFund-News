export default function ResearchStep({ s, set, onRun, loading, error, ideas, selected, toggle }) {
  return (
    <section className="card">
      <h2>1. Research agent</h2>
      <div className="grid">
        <label>Focus (market, topic or fund category)
          <input value={s.focus} onChange={(e) => set({ ...s, focus: e.target.value })} placeholder="India, small cap funds, NFOs..." />
        </label>
        <label className="check">
          <input type="checkbox" checked={s.aiAngle} onChange={(e) => set({ ...s, aiAngle: e.target.checked })} />
          Include a few ideas with an AI or automation angle
        </label>
        <div><button onClick={onRun} disabled={loading}>{loading ? 'Searching and thinking...' : ideas.length ? 'Run research again' : 'Run research'}</button></div>
      </div>
      {error && <p className="error">{error}</p>}

      {ideas.length > 0 && (
        <>
          <p className="hint">Pick exactly 3 ideas. Selected: <b>{selected.length}/3</b></p>
          <ul className="ideas">
            {ideas.map((idea) => {
              const on = selected.includes(idea.id);
              const locked = !on && selected.length >= 3;
              return (
                <li key={idea.id} className={on ? 'idea on' : 'idea'}>
                  <label className="check top">
                    <input type="checkbox" checked={on} disabled={locked} onChange={() => toggle(idea.id)} />
                    <div>
                      <b>{idea.title}</b>
                      <div>{idea.angle}</div>
                      {idea.why_it_matters && <div className="muted">{idea.why_it_matters}</div>}
                      {idea.key_facts.length > 0 && <ul className="facts">{idea.key_facts.map((f, i) => <li key={i}>{f}</li>)}</ul>}
                      <div className="sources">
                        {idea.sources.map((src) => (
                          <a key={src.url} href={src.url} target="_blank" rel="noreferrer noopener">{src.source || 'source'}</a>
                        ))}
                      </div>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
