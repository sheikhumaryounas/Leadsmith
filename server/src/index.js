import { config } from './config.js';
import { connectDb, disconnectDb } from './db.js';
import { createApp } from './app.js';
import { startScheduler } from './services/scheduler.js';
import { Business } from './models/Business.js';
import { seedDemo, DEMO_LOGIN } from './seed/demo.js';

await connectDb();

// First run in development: load the demo account so the app isn't empty.
if (!config.isProd && !(await Business.estimatedDocumentCount())) {
  await seedDemo();
  console.log(`[seed] Demo account created. Log in with ${DEMO_LOGIN.email} / ${DEMO_LOGIN.password}`);
}

const app = createApp();
const server = app.listen(config.port, () => console.log(`[api] Leadsmith API on http://localhost:${config.port}`));
const stopScheduler = startScheduler(config.schedulerMs);

async function shutdown() {
  stopScheduler();
  server.close();
  await disconnectDb();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
