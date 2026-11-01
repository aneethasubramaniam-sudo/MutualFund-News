import { chatJson } from '../llm.js';

const SYSTEM = `You are the LINKEDIN AGENT in a content team for a mutual fund professional.
Audience: technical professionals with 10 to 20 years of experience. Engineers, architects, managers.
They are smart but know little about agentic AI and little about mutual fund jargon.

Style:
- Grade 6 to 7 English. Short sentences. Sound like a real person, a little imperfect.
- No em dashes. No corporate buzzwords. No emojis except at most one.
- Open with a strong first line (a hook). Then short paragraphs of one to three lines.
- Explain any jargon in one plain line. If AI agents come up, explain with a simple everyday comparison.
- Use only the facts given. Never invent numbers, returns or fund names.
- No return promises, no buy or sell calls, no "best fund".
- End with one genuine question to invite comments.
- Length: 150 to 250 words for the body.

Return JSON only: {"body":"post text without hashtags","hashtags":["#One","#Two","#Three"]}  (3 to 5 hashtags)`;

export async function runLinkedIn({ openaiKey, model, idea, link, disclaimer }) {
  const user = `IDEA:
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
    validate(o) {
      if (typeof o.body !== 'string' || o.body.trim().length < 200) return 'body is missing or too short.';
      if (o.body.length > 2200) return 'body is over 2200 characters. Shorten it.';
      if (/[—–]/.test(o.body)) return 'body contains em or en dashes. Remove them.';
      if (!Array.isArray(o.hashtags) || o.hashtags.length < 1) return 'hashtags missing.';
      return null;
    },
  });

  const tags = out.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).slice(0, 5).join(' ');
  const parts = [out.body.trim()];
  // CTA and disclaimer are added by code, so the model cannot drop or alter them.
  if (link?.trim()) parts.push(`Read more: ${link.trim()}`);
  parts.push(tags);
  if (disclaimer?.trim()) parts.push(disclaimer.trim());
  const post = parts.join('\n\n');
  return { post, chars: post.length };
}
