import { useState } from 'react';
import { callAgent } from './api.js';
import { useSettings } from './useSettings.js';
import SettingsPanel from './components/SettingsPanel.jsx';
import ResearchStep from './components/ResearchStep.jsx';
import OptionsStep from './components/OptionsStep.jsx';
import OutputStep from './components/OutputStep.jsx';

export default function App() {
  const [s, set] = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(!s.openaiKey || !s.serpKey);
  const [ideas, setIdeas] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [approved, setApproved] = useState([]);
  const [results, setResults] = useState({ linkedin: {}, twitter: {} });

  const toggle = (id) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < 3 ? [...cur, id] : cur));

  async function runResearch() {
    setError('');
    setLoading(true);
    setIdeas([]);
    setSelected([]);
    setApproved([]);
    setResults({ linkedin: {}, twitter: {} });
    try {
      const data = await callAgent('research', { focus: s.focus, aiAngle: s.aiAngle }, s);
      setIdeas(data.ideas);
    } catch (e) {
      setError(e.message);
      if (/key/i.test(e.message)) setSettingsOpen(true);
    } finally {
      setLoading(false);
    }
  }

  const put = (kind, id, value) =>
    setResults((r) => ({ ...r, [kind]: { ...r[kind], [id]: value } }));

  async function runOne(kind, idea) {
    put(kind, idea.id, { status: 'loading' });
    const body = kind === 'linkedin'
      ? { idea, link: s.link, disclaimer: s.disclaimer }
      : { idea, tweetCount: s.tweetCount };
    try {
      put(kind, idea.id, { status: 'done', data: await callAgent(kind, body, s) });
    } catch (e) {
      put(kind, idea.id, { status: 'error', error: e.message });
    }
  }

  // Human has approved the 3 ideas. LinkedIn and X agents run at the same time.
  function generate() {
    const chosen = ideas.filter((i) => selected.includes(i.id));
    setApproved(chosen);
    setResults({ linkedin: {}, twitter: {} });
    chosen.forEach((idea) => {
      runOne('linkedin', idea);
      runOne('twitter', idea);
    });
  }

  const busy = approved.some((i) => results.linkedin[i.id]?.status === 'loading' || results.twitter[i.id]?.status === 'loading');

  return (
    <main>
      <h1>Mutual Fund Content Agents</h1>
      <p className="muted">Research agent, then you pick 3 ideas, then LinkedIn and X agents write in parallel.</p>
      <SettingsPanel s={s} set={set} open={settingsOpen} setOpen={setSettingsOpen} />
      <ResearchStep s={s} set={set} onRun={runResearch} loading={loading} error={error} ideas={ideas} selected={selected} toggle={toggle} />
      {ideas.length > 0 && <OptionsStep s={s} set={set} canGenerate={selected.length === 3} onGenerate={generate} busy={busy} />}
      {approved.length > 0 && <OutputStep ideas={approved} results={results} retry={runOne} />}
    </main>
  );
}
