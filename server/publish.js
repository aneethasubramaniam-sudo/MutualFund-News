import { httpError } from './errors.js';

const LI = process.env.LINKEDIN_BASE_URL || 'https://api.linkedin.com';
const X = process.env.X_BASE_URL || 'https://api.x.com';

const readJson = (res) => res.json().catch(() => ({}));

export async function publishLinkedIn({ token, text }) {
  if (!token) throw httpError(400, 'LinkedIn access token is missing. Add it in Settings.');
  if (!text?.trim()) throw httpError(400, 'Nothing to post.');
  if (text.length > 3000) throw httpError(400, 'Post is over LinkedIn\'s 3000 character limit.');
  const auth = { authorization: `Bearer ${token}` };

  let me;
  try {
    me = await fetch(`${LI}/v2/userinfo`, { headers: auth, signal: AbortSignal.timeout(30_000) });
  } catch (e) {
    throw httpError(502, `Could not reach LinkedIn: ${e.message}`);
  }
  if (!me.ok) {
    throw httpError(me.status === 401 ? 401 : 502,
      `LinkedIn auth failed (${me.status}). Token may be expired, or missing the openid, profile and w_member_social scopes.`);
  }
  const { sub } = await readJson(me);
  if (!sub) throw httpError(502, 'LinkedIn did not return your member id.');

  const res = await fetch(`${LI}/v2/ugcPosts`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json', 'x-restli-protocol-version': '2.0.0' },
    body: JSON.stringify({
      author: `urn:li:person:${sub}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': { shareCommentary: { text }, shareMediaCategory: 'NONE' },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await readJson(res);
  if (!res.ok) throw httpError(502, `LinkedIn error (${res.status}): ${body.message || 'request failed'}`);
  const id = res.headers.get('x-restli-id') || body.id;
  return { id, url: id ? `https://www.linkedin.com/feed/update/${id}/` : null };
}

/** Posts tweets one by one as a reply chain. On failure, reports which ones already went out. */
export async function publishThread({ token, tweets, replyTo }) {
  if (!token) throw httpError(400, 'X access token is missing. Add it in Settings.');
  if (!Array.isArray(tweets) || !tweets.length) throw httpError(400, 'No tweets to post.');
  if (tweets.some((t) => typeof t !== 'string' || !t.trim() || Array.from(t).length > 280)) {
    throw httpError(400, 'Every tweet must be 1 to 280 characters.');
  }
  const ids = [];
  let prev = replyTo || null;
  for (const text of tweets) {
    const payload = { text };
    if (prev) payload.reply = { in_reply_to_tweet_id: prev };
    let res;
    try {
      res = await fetch(`${X}/2/tweets`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (e) {
      const err = httpError(502, `Could not reach X: ${e.message}`);
      err.extra = { ids };
      throw err;
    }
    const d = await readJson(res);
    if (!res.ok || !d.data?.id) {
      const err = httpError(res.status === 401 ? 401 : 502,
        `X error (${res.status}): ${d.detail || d.title || 'request failed'}. ${ids.length} of ${tweets.length} tweets were posted.`);
      err.extra = { ids };
      throw err;
    }
    prev = d.data.id;
    ids.push(prev);
  }
  return { ids };
}
