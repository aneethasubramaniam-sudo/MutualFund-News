# Mutual Fund Content Agents

Three agents that research mutual fund news and draft LinkedIn posts and X threads.
Vite + React UI, small local Node server, OpenAI for writing, SerpAPI for news.

## Flow
1. **Research agent** searches Google News (SerpAPI), proposes 10 ideas with source links.
2. **You** pick exactly 3 and approve.
3. **LinkedIn agent** and **X agent** run in parallel on those 3 ideas.

## Run
```bash
npm install
npm run dev
```
Open http://localhost:5173 and paste your OpenAI and SerpAPI keys under Settings.
For a single-process build: `npm run build && npm start`, then open http://127.0.0.1:8787.

## Publishing (optional)
Each draft has a Publish button. It asks for confirmation, and a published draft cannot be posted again.

**Sign in with X and LinkedIn** (Settings, "Publishing accounts"):
1. Create a developer app on each platform.
2. Register this exact callback URL in both: `http://127.0.0.1:8787/api/auth/callback`
   (use that address even in `npm run dev`; the sign-in popup returns straight to the server).
3. **X:** enable OAuth 2.0 with "Read and write" permission. Copy the Client ID. The Client Secret is needed only for a "confidential" app type.
4. **LinkedIn:** add the products "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect". Copy the Client ID and Client Secret.
5. Paste the IDs in Settings and click Sign in. A popup opens, you approve, and the app shows "Connected as ...".

Token life: X access tokens last about 2 hours and are refreshed automatically before publishing (refresh token). LinkedIn tokens last about 60 days and cannot be refreshed here, so you sign in again when they expire.
If an X thread fails midway, the app shows which tweets went out and offers "Resume", so nothing is posted twice.
LinkedIn drafts are editable before publishing. Tweets are not. X posting may need a paid API plan.
If you serve the app from another address, set `PUBLIC_BASE_URL` and register that callback instead.

## Notes
- A server is needed because SerpAPI blocks direct browser calls. It listens on localhost only.
- Keys are sent per request and never stored server-side. "Remember" saves them in browser storage (unencrypted).
- Model defaults to `gpt-6.1-sol`. It is an editable field. If the API rejects the name, change it in Settings.
- LinkedIn: CTA link and disclaimer are appended by code, not by the model. Link is optional.
- X: thread length is set in the UI (2 to 25). Tweets over 280 characters are rejected and retried.
- Source URLs come from search results, never from the model.
- `node test/mock-upstream.mjs` runs a fake OpenAI/SerpAPI. Start the server with
  `OPENAI_BASE_URL=http://127.0.0.1:9999/v1 SERPAPI_BASE_URL=http://127.0.0.1:9999 LINKEDIN_BASE_URL=http://127.0.0.1:9999 LINKEDIN_OAUTH_BASE=http://127.0.0.1:9999 X_BASE_URL=http://127.0.0.1:9999 X_AUTHORIZE_URL=http://127.0.0.1:9999/x/authorize` to test without keys.
