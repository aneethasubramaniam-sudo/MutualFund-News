import { httpError } from './errors.js';

const BASE = process.env.SERPAPI_BASE_URL || 'https://serpapi.com';

/** Google News search through SerpAPI, last month only. */
export async function searchNews({ apiKey, query, num = 10 }) {
  if (!apiKey) throw httpError(400, 'SerpAPI key is missing. Add it in Settings.');
  const url = new URL(`${BASE}/search.json`);
  url.search = new URLSearchParams({
    engine: 'google',
    tbm: 'nws',
    tbs: 'qdr:m',
    q: query,
    num: String(num),
    api_key: apiKey,
  }).toString();

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  } catch (e) {
    throw httpError(502, `Could not reach SerpAPI: ${e.message}`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    // Never echo the URL back, it contains the key.
    throw httpError(res.status === 401 ? 401 : 502, `SerpAPI error (${res.status}): ${data.error || 'request failed'}`);
  }
  return (data.news_results || []).map((r) => ({
    title: r.title,
    link: r.link,
    source: typeof r.source === 'object' ? r.source?.name : r.source,
    date: r.date,
    snippet: r.snippet,
  })).filter((r) => r.title && r.link);
}
