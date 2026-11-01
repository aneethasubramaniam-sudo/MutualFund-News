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
2. Register the callback URL shown in Settings in both apps. It is the address you opened the app at plus `/api/auth/callback`,
   for example `http://localhost:5173/api/auth/callback` locally or `https://YOUR-APP.vercel.app/api/auth/callback` when deployed.
3. **X:** enable OAuth 2.0 with "Read and write" permission. Copy the Client ID. The Client Secret is needed only for a "confidential" app type.
4. **LinkedIn:** add the products "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect". Copy the Client ID and Client Secret.
5. Paste the IDs in Settings and click Sign in. A popup opens, you approve, and the app shows "Connected as ...".

Token life: X access tokens last about 2 hours and are refreshed automatically before publishing (refresh token). LinkedIn tokens last about 60 days and cannot be refreshed here, so you sign in again when they expire.
If an X thread fails midway, the app shows which tweets went out and offers "Resume", so nothing is posted twice.
LinkedIn drafts are editable before publishing. Tweets are not. X posting may need a paid API plan.

## Deploy on Vercel
1. Import the repo. Framework preset: **Vite**. Build command `npm run build`, output `dist`. No environment variables are needed.
2. **Set the Production Branch** (Project Settings, Git) to the branch with this code, or merge it into `main`. Vercel deploys `main` by default, and an empty `main` gives a 404.
3. `vercel.json` sends `/api/*` to `api/index.js` (the same Express app) and allows 60 seconds per request. Research can take 30 to 60 seconds, so if you see timeouts, check your plan's function limit.
4. Register `https://YOUR-APP.vercel.app/api/auth/callback` in the X and LinkedIn developer apps.
5. Anyone who knows the URL can open the app, but it holds no keys. Each visitor enters their own, stored in their own browser.

## Notes
- A server is needed because SerpAPI blocks direct browser calls. It listens on localhost only.
- Keys are sent per request and never stored server-side. "Remember" saves them in browser storage (unencrypted).
- Model defaults to `gpt-6.1-sol`. It is an editable field. If the API rejects the name, change it in Settings.
- LinkedIn: CTA link and disclaimer are appended by code, not by the model. Link is optional.
- X: thread length is set in the UI (2 to 25). Tweets over 280 characters are rejected and retried.
- Source URLs come from search results, never from the model.
- `node test/mock-upstream.mjs` runs a fake OpenAI/SerpAPI. Start the server with
  `OPENAI_BASE_URL=http://127.0.0.1:9999/v1 SERPAPI_BASE_URL=http://127.0.0.1:9999 LINKEDIN_BASE_URL=http://127.0.0.1:9999 LINKEDIN_OAUTH_BASE=http://127.0.0.1:9999 X_BASE_URL=http://127.0.0.1:9999 X_AUTHORIZE_URL=http://127.0.0.1:9999/x/authorize` to test without keys.
