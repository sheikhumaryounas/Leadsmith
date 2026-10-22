// Vercel entry point: every /api request is rewritten here and handled by the Express app.
// The database connection is opened once per warm instance and reused between requests.
import { createApp } from '../server/src/app.js';
import { connectDb } from '../server/src/db.js';

const app = createApp();
let connecting = null;

export default async function handler(req, res) {
  try {
    await (connecting ??= connectDb());
  } catch (err) {
    connecting = null;
    console.error('[db]', err.message);
    return res.status(503).json({ error: 'The database is not reachable right now.' });
  }
  return app(req, res);
}
