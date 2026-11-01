export default function OptionsStep({ s, set, canGenerate, onGenerate, busy }) {
  return (
    <section className="card">
      <h2>2. Approve and generate</h2>
      <div className="grid">
        <label>CTA link for LinkedIn posts (optional)
          <input value={s.link} onChange={(e) => set({ ...s, link: e.target.value })} placeholder="https://..." />
        </label>
        <label>Tweets per thread: <b>{s.tweetCount}</b>
          <input type="range" min="2" max="25" value={s.tweetCount} onChange={(e) => set({ ...s, tweetCount: Number(e.target.value) })} />
        </label>
        <label>Disclaimer added under each LinkedIn post (blank to skip)
          <textarea rows="2" value={s.disclaimer} onChange={(e) => set({ ...s, disclaimer: e.target.value })} />
        </label>
        <div>
          <button onClick={onGenerate} disabled={!canGenerate || busy}>
            {busy ? 'Writing...' : 'Approve 3 ideas and write LinkedIn + X'}
          </button>
        </div>
      </div>
    </section>
  );
}
