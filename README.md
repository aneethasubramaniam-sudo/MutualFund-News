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
Add tokens under Settings:
- **LinkedIn:** a member access token with scopes `openid profile w_member_social` (create an app in the LinkedIn developer portal and add "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect"). Tokens last about 60 days.
- **X:** an OAuth 2.0 user access token with scopes `tweet.write tweet.read users.read`. These expire in about 2 hours. X API posting may need a paid API plan.
- If an X thread fails midway, the app shows which tweets went out and offers "Resume", so nothing is posted twice.
- LinkedIn drafts are editable before publishing. Tweets are not.
- This takes pasted tokens only. There is no sign-in flow yet.

## Notes
- A server is needed because SerpAPI blocks direct browser calls. It listens on localhost only.
- Keys are sent per request and never stored server-side. "Remember" saves them in browser storage (unencrypted).
- Model defaults to `gpt-6.1-sol`. It is an editable field. If the API rejects the name, change it in Settings.
- LinkedIn: CTA link and disclaimer are appended by code, not by the model. Link is optional.
- X: thread length is set in the UI (2 to 25). Tweets over 280 characters are rejected and retried.
- Source URLs come from search results, never from the model.
- `node test/mock-upstream.mjs` runs a fake OpenAI/SerpAPI. Start the server with
  `OPENAI_BASE_URL=http://127.0.0.1:9999/v1 SERPAPI_BASE_URL=http://127.0.0.1:9999 LINKEDIN_BASE_URL=http://127.0.0.1:9999 X_BASE_URL=http://127.0.0.1:9999` to test without keys.
