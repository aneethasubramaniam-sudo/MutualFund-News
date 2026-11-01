import { httpError } from './errors.js';

const BASE = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

/**
 * Calls the chat completions endpoint in JSON mode.
 * `validate(obj)` returns an error string if the output is bad. The error is
 * fed back to the model for one more attempt.
 */
export async function chatJson({ apiKey, model, system, user, validate, maxAttempts = 2 }) {
  if (!apiKey) throw httpError(400, 'OpenAI API key is missing. Add it in Settings.');
  if (!model) throw httpError(400, 'Model name is missing. Add it in Settings.');

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
  let lastProblem = 'unknown';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res;
    try {
      res = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, response_format: { type: 'json_object' } }),
        signal: AbortSignal.timeout(180_000),
      });
    } catch (e) {
      throw httpError(502, `Could not reach OpenAI: ${e.message}`);
    }

    if (!res.ok) {
      const text = await res.text();
      let msg = text.slice(0, 300);
      try { msg = JSON.parse(text).error?.message || msg; } catch { /* keep raw */ }
      throw httpError(res.status === 401 ? 401 : 502, `OpenAI error (${res.status}): ${msg}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    try {
      const obj = JSON.parse(content);
      const problem = validate ? validate(obj) : null;
      if (!problem) return obj;
      lastProblem = problem;
    } catch {
      lastProblem = 'Output was not valid JSON.';
    }
    messages.push(
      { role: 'assistant', content },
      { role: 'user', content: `Your last output was rejected. Problem: ${lastProblem}\nReturn the full corrected JSON only.` },
    );
  }
  throw httpError(502, `Model output failed checks after ${maxAttempts} tries: ${lastProblem}`);
}
