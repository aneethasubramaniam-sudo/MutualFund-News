import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import app from './app.js';

// Local launcher. On Vercel, api/index.js uses ./app.js directly and this file is not used.
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = Number(process.env.PORT) || 8787;
// Localhost only: the UI hands this server your API keys.
app.listen(port, '127.0.0.1', () => console.log(`API on http://127.0.0.1:${port}`));
