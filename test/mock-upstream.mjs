// Fake OpenAI + SerpAPI for local testing without real keys.
// Run: node test/mock-upstream.mjs, then start the app with
// OPENAI_BASE_URL=http://127.0.0.1:9999/v1 SERPAPI_BASE_URL=http://127.0.0.1:9999
import http from 'node:http';

const news = Array.from({ length: 8 }, (_, i) => ({
  title: `Mock news ${i + 1}`, link: `https://example.com/n${i + 1}`, source: 'MockWire', date: '1 day ago', snippet: 'snippet',
}));

http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const send = (o, code = 200) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.url.startsWith('/search.json')) return send({ news_results: news });
    if (req.url.endsWith('/chat/completions')) {
      if (!/^Bearer sk-test/.test(req.headers.authorization || '')) return send({ error: { message: 'bad key' } }, 401);
      const { messages } = JSON.parse(body);
      const sys = messages[0].content, user = messages[1].content;
      let out;
      if (sys.includes('RESEARCH AGENT')) {
        out = { ideas: Array.from({ length: 10 }, (_, i) => ({ title: `Idea ${i + 1}`, angle: 'angle', why_it_matters: 'why', key_facts: ['fact'], source_ids: [1, 2] })) };
      } else if (sys.includes('LINKEDIN AGENT')) {
        out = { body: 'Hook line here. '.repeat(20), hashtags: ['MutualFunds', '#AI'] };
      } else {
        const n = Number(/EXACT_TWEET_COUNT: (\d+)/.exec(user)[1]);
        const first = messages.length === 2; // first attempt: return one over-long tweet
        out = { tweets: Array.from({ length: n }, (_, i) => (first && i === 0 ? 'x'.repeat(300) : `Tweet ${i + 1} text`)) };
      }
      return send({ choices: [{ message: { content: JSON.stringify(out) } }] });
    }
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/x/authorize' || u.pathname === '/oauth/v2/authorization') {
      if (u.pathname === '/x/authorize' && !u.searchParams.get('code_challenge')) return send({ error: 'no PKCE' }, 400);
      const back = new URL(u.searchParams.get('redirect_uri'));
      back.searchParams.set('code', 'authcode'); back.searchParams.set('state', u.searchParams.get('state'));
      res.writeHead(302, { location: back.toString() }); return res.end();
    }
    if (u.pathname === '/2/oauth2/token' || u.pathname === '/oauth/v2/accessToken') {
      const f = new URLSearchParams(body);
      const isX = u.pathname.startsWith('/2/');
      if (f.get('grant_type') === 'refresh_token') return send({ access_token: 'tok-x-refreshed', refresh_token: 'rt2', expires_in: 7200 });
      if (isX && !f.get('code_verifier')) return send({ error: 'missing verifier' }, 400);
      if (!isX && !f.get('client_secret')) return send({ error: 'missing secret' }, 400);
      return send(isX ? { access_token: 'tok-x-new', refresh_token: 'rt1', expires_in: 7200 } : { access_token: 'tok-li-new', expires_in: 5184000 });
    }
    if (u.pathname === '/2/users/me') return send({ data: { username: 'tester' } });
    const authed = /^Bearer tok/.test(req.headers.authorization || '');
    if (req.url === '/v2/userinfo') return authed ? send({ sub: 'abc123', name: 'Test Person' }) : send({}, 401);
    if (req.url === '/v2/ugcPosts') { res.setHeader('x-restli-id', 'urn:li:share:999'); return send({ id: 'urn:li:share:999' }, 201); }
    if (req.url === '/2/tweets') {
      if (!authed) return send({ title: 'Unauthorized' }, 401);
      const t = JSON.parse(body);
      if (t.text === 'Tweet 3 text' && !globalThis.failed) { globalThis.failed = true; return send({ detail: 'simulated failure' }, 429); }
      globalThis.n = (globalThis.n || 100) + 1;
      return send({ data: { id: String(globalThis.n), text: t.text } }, 201);
    }
    send({ error: 'not found' }, 404);
  });
}).listen(9999, '127.0.0.1', () => console.log('mock on 9999'));
