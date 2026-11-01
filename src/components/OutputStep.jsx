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

function PublishBar({ pub, label, onPublish, resumeFrom }) {
  if (pub?.status === 'done') {
    return <p className="ok">Published. {pub.url && <a href={pub.url} target="_blank" rel="noreferrer noopener">View post</a>}</p>;
  }
  return (
    <div>
      {pub?.status === 'error' && <p className="error">{pub.error}</p>}
      <button disabled={pub?.status === 'loading'} onClick={onPublish}>
        {pub?.status === 'loading' ? 'Publishing...' : resumeFrom ? `Resume from tweet ${resumeFrom + 1}` : label}
      </button>
    </div>
  );
}

function LinkedInCard({ idea, r, onRetry, pub, publish }) {
  const [edit, setEdit] = useState(null); // user edits override the draft
  const text = edit ?? r?.data?.post ?? '';
  return (
    <div className="out">
      <div className="row between"><b>{idea.title}</b>
        {r?.status === 'done' && <span className="row"><span className="muted">{text.length} chars</span><CopyButton text={text} />
          <button className="ghost small" disabled={pub?.status === 'done'} onClick={() => { setEdit(null); onRetry(); }}>Rewrite</button></span>}
      </div>
      <Status r={r} onRetry={onRetry} />
      {r?.status === 'done' && (
        <>
          <textarea className="post" value={text} rows={14} readOnly={pub?.status === 'done'} onChange={(e) => setEdit(e.target.value)} />
          <PublishBar pub={pub} label="Publish to LinkedIn" onPublish={() => {
            if (text.length > 3000) return alert('Over 3000 characters. Shorten it first.');
            if (window.confirm(`Post this to LinkedIn now?\n\n${text.slice(0, 400)}${text.length > 400 ? '...' : ''}`)) publish({ text });
          }} />
        </>
      )}
    </div>
  );
}

function TwitterCard({ idea, r, onRetry, pub, publish }) {
  const tweets = r?.data?.tweets || [];
  const sent = pub?.ids?.length || 0;
  const tooLong = tweets.some((t) => Array.from(t).length > 280);
  return (
    <div className="out">
      <div className="row between"><b>{idea.title}</b>
        {r?.status === 'done' && <span className="row"><CopyButton text={tweets.join('\n\n')} label="Copy thread" />
          <button className="ghost small" disabled={sent > 0} onClick={onRetry}>Rewrite</button></span>}
      </div>
      <Status r={r} onRetry={onRetry} />
      {tweets.map((t, i) => {
        const len = Array.from(t).length;
        return (
          <div className="tweet" key={i}>
            <div className="row between">
              <span className="muted">{i + 1}/{tweets.length}{i < sent ? ' (posted)' : ''}</span>
              <span className="row"><span className={len > 280 ? 'error' : 'muted'}>{len}/280</span><CopyButton text={t} /></span>
            </div>
            <div>{t}</div>
          </div>
        );
      })}
      {r?.status === 'done' && !tooLong && (
        <PublishBar pub={pub} label="Publish thread to X" resumeFrom={sent > 0 ? sent : 0} onPublish={() => {
          const rest = tweets.slice(sent);
          const msg = sent ? `Post the remaining ${rest.length} tweets to X now?` : `Post this ${tweets.length}-tweet thread to X now?\n\n${tweets[0]}`;
          if (window.confirm(msg)) publish({ tweets: rest, replyTo: sent ? pub.ids[sent - 1] : undefined });
        }} />
      )}
    </div>
  );
}

export default function OutputStep({ ideas, results, retry, pubs, publish }) {
  return (
    <section className="card">
      <h2>3. Drafts</h2>
      <div className="cols">
        <div>
          <h3>LinkedIn</h3>
          {ideas.map((i) => <LinkedInCard key={i.id} idea={i} r={results.linkedin[i.id]} onRetry={() => retry('linkedin', i)}
            pub={pubs[`linkedin:${i.id}`]} publish={(p) => publish('linkedin', i, p)} />)}
        </div>
        <div>
          <h3>X / Twitter</h3>
          {ideas.map((i) => <TwitterCard key={i.id} idea={i} r={results.twitter[i.id]} onRetry={() => retry('twitter', i)}
            pub={pubs[`twitter:${i.id}`]} publish={(p) => publish('twitter', i, p)} />)}
        </div>
      </div>
      <p className="hint">Review every draft against its sources before posting. Publishing is live and cannot be undone from here.</p>
    </section>
  );
}
