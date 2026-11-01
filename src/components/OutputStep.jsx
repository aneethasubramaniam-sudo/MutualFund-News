import { useState } from 'react';

function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  return (
    <button className="ghost small" onClick={async () => {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    }}>{done ? 'Copied' : label}</button>
  );
}

function Status({ r, onRetry }) {
  if (!r || r.status === 'loading') return <p className="muted">Writing...</p>;
  if (r.status === 'error') return <p className="error">{r.error} <button className="ghost small" onClick={onRetry}>Retry</button></p>;
  return null;
}

function LinkedInCard({ idea, r, onRetry }) {
  return (
    <div className="out">
      <div className="row between"><b>{idea.title}</b>
        {r?.status === 'done' && <span className="row"><span className="muted">{r.data.chars} chars</span><CopyButton text={r.data.post} /><button className="ghost small" onClick={onRetry}>Rewrite</button></span>}
      </div>
      <Status r={r} onRetry={onRetry} />
      {r?.status === 'done' && <textarea className="post" readOnly value={r.data.post} rows={14} />}
    </div>
  );
}

function TwitterCard({ idea, r, onRetry }) {
  const tweets = r?.data?.tweets || [];
  return (
    <div className="out">
      <div className="row between"><b>{idea.title}</b>
        {r?.status === 'done' && <span className="row"><CopyButton text={tweets.join('\n\n')} label="Copy thread" /><button className="ghost small" onClick={onRetry}>Rewrite</button></span>}
      </div>
      <Status r={r} onRetry={onRetry} />
      {tweets.map((t, i) => {
        const len = Array.from(t).length;
        return (
          <div className="tweet" key={i}>
            <div className="row between">
              <span className="muted">{i + 1}/{tweets.length}</span>
              <span className="row"><span className={len > 280 ? 'error' : 'muted'}>{len}/280</span><CopyButton text={t} /></span>
            </div>
            <div>{t}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function OutputStep({ ideas, results, retry }) {
  return (
    <section className="card">
      <h2>3. Drafts</h2>
      <div className="cols">
        <div>
          <h3>LinkedIn</h3>
          {ideas.map((i) => <LinkedInCard key={i.id} idea={i} r={results.linkedin[i.id]} onRetry={() => retry('linkedin', i)} />)}
        </div>
        <div>
          <h3>X / Twitter</h3>
          {ideas.map((i) => <TwitterCard key={i.id} idea={i} r={results.twitter[i.id]} onRetry={() => retry('twitter', i)} />)}
        </div>
      </div>
      <p className="hint">Review every draft against its sources before posting. You are the compliance check.</p>
    </section>
  );
}
