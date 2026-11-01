import { chatJson } from '../llm.js';
import { searchNews } from '../serp.js';
import { httpError } from '../errors.js';

const SYSTEM = `You are the RESEARCH AGENT in a content team for a mutual fund professional.
You get a numbered list of recent news results. Turn them into exactly 10 distinct content ideas.

Rules:
- Use only facts present in the news results. Never invent NAVs, returns, dates, fund names or numbers.
- If the results do not support a number, do not use it.
- Every idea must cite at least one result by its number in "source_ids".
- Ideas must differ from each other in angle, not just in wording.
- Prefer ideas an informed investor can learn from. No hype, no return promises, no "best fund to buy".
- Write in plain English, short sentences.

Return JSON only:
{"ideas":[{"title":"...","angle":"one line on the point of view","why_it_matters":"one or two lines","key_facts":["fact from sources", "..."],"source_ids":[1,2]}]}`;

function buildQueries(focus) {
  const f = focus.trim();
  return [
    `${f} mutual fund new fund offer NFO launch`,
    `${f} mutual fund regulator new rules`,
    `${f} mutual fund industry flows SIP AUM data`,
    `${f} mutual fund technology AI`,
  ];
}

export async function runResearch({ openaiKey, serpKey, model, focus, aiAngle }) {
  // Fail before spending any SerpAPI searches.
  if (!openaiKey) throw httpError(400, 'OpenAI API key is missing. Add it in Settings.');
  if (!serpKey) throw httpError(400, 'SerpAPI key is missing. Add it in Settings.');
  const topic = (focus || 'India').trim();
  const batches = await Promise.all(buildQueries(topic).map((q) => searchNews({ apiKey: serpKey, query: q })));

  const seen = new Set();
  const results = [];
  for (const r of batches.flat()) {
    if (seen.has(r.link)) continue;
    seen.add(r.link);
    results.push(r);
  }
  const top = results.slice(0, 30);
  if (top.length < 3) throw httpError(502, 'Search returned too few news results. Try a broader focus.');

  const list = top
    .map((r, i) => `${i + 1}. ${r.title} | ${r.source || 'unknown'} | ${r.date || 'no date'}\n   ${r.snippet || ''}`)
    .join('\n');

  const user = `Today: ${new Date().toISOString().slice(0, 10)}
Focus: ${topic}
${aiAngle ? 'At least 3 ideas should connect to AI or automation in mutual funds, only where the results support it.' : 'AI angle is optional. Do not force it.'}

NEWS RESULTS:
${list}`;

  const out = await chatJson({
    apiKey: openaiKey,
    model,
    system: SYSTEM,
    user,
    validate(o) {
      if (!Array.isArray(o.ideas) || o.ideas.length !== 10) return 'ideas must be an array of exactly 10 items.';
      for (const [i, idea] of o.ideas.entries()) {
        if (!idea.title || !idea.angle) return `idea ${i + 1} needs title and angle.`;
        if (!Array.isArray(idea.source_ids) || !idea.source_ids.length) return `idea ${i + 1} needs source_ids.`;
        if (idea.source_ids.some((n) => !Number.isInteger(n) || n < 1 || n > top.length)) {
          return `idea ${i + 1} has a source id outside 1..${top.length}.`;
        }
      }
      return null;
    },
  });

  return {
    ideas: out.ideas.map((idea, i) => ({
      id: `idea-${i + 1}`,
      title: idea.title,
      angle: idea.angle,
      why_it_matters: idea.why_it_matters || '',
      key_facts: Array.isArray(idea.key_facts) ? idea.key_facts : [],
      // URLs come from search results, never from the model.
      sources: [...new Set(idea.source_ids)].map((n) => ({ title: top[n - 1].title, url: top[n - 1].link, source: top[n - 1].source })),
    })),
  };
}
