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

## Notes
- A server is needed because SerpAPI blocks direct browser calls. It listens on localhost only.
- Keys are sent per request and never stored server-side. "Remember" saves them in browser storage (unencrypted).
- Model defaults to `gpt-6.1-sol`. It is an editable field. If the API rejects the name, change it in Settings.
- LinkedIn: CTA link and disclaimer are appended by code, not by the model. Link is optional.
- X: thread length is set in the UI (2 to 25). Tweets over 280 characters are rejected and retried.
- Source URLs come from search results, never from the model.
- `node test/mock-upstream.mjs` runs a fake OpenAI/SerpAPI. Start the server with
  `OPENAI_BASE_URL=http://127.0.0.1:9999/v1 SERPAPI_BASE_URL=http://127.0.0.1:9999` to test without keys.
