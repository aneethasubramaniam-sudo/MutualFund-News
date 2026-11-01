import { chatJson } from '../llm.js';

const SYSTEM = `You are the X (TWITTER) AGENT in a content team for a mutual fund professional.
Audience: developers working at tech startups in San Francisco and the Bay Area. Fast readers, allergic to fluff.
They like clear mechanics, numbers, and a point of view. They may not know mutual fund jargon.

Style:
- Grade 6 to 7 English. Short punchy lines. Sound human, a bit casual.
- No em dashes. No corporate words. No hashtag spam (at most one hashtag in the whole thread).
- Tweet 1 is the hook. It must make people want to open the thread.
- Each tweet carries one idea. Every tweet must be 280 characters or fewer.
- Compare to things developers know (APIs, pipelines, latency, git) only when it truly helps.
- Use only the facts given. Never invent numbers, returns or fund names.
- No return promises, no buy or sell calls.
- Last tweet: a takeaway and a short line "Mutual fund investments are subject to market risks." (shorten the takeaway to fit).

Return JSON only: {"tweets":["tweet 1","tweet 2", "..."]}
Do not number the tweets.`;

export async function runTwitter({ openaiKey, model, idea, tweetCount }) {
  const n = Math.min(25, Math.max(2, Number.parseInt(tweetCount, 10) || 7));
  const user = `EXACT_TWEET_COUNT: ${n}

IDEA:
Title: ${idea.title}
Angle: ${idea.angle}
Why it matters: ${idea.why_it_matters}
Facts:
${(idea.key_facts || []).map((f) => `- ${f}`).join('\n')}
Sources: ${(idea.sources || []).map((s) => s.title).join(' ; ')}`;

  const out = await chatJson({
    apiKey: openaiKey,
    model,
    system: SYSTEM,
    user,
    maxAttempts: 3,
    validate(o) {
      if (!Array.isArray(o.tweets) || o.tweets.length !== n) return `tweets must be an array of exactly ${n} strings.`;
      const bad = [];
      o.tweets.forEach((t, i) => {
        if (typeof t !== 'string' || !t.trim()) bad.push(`tweet ${i + 1} is empty`);
        else if (Array.from(t).length > 280) bad.push(`tweet ${i + 1} is ${Array.from(t).length} characters, max 280`);
        else if (/[—–]/.test(t)) bad.push(`tweet ${i + 1} has an em or en dash`);
      });
      return bad.length ? bad.join('; ') : null;
    },
  });
  return { tweets: out.tweets.map((t) => t.trim()) };
}
