// Resets the Ridgeway Fabrication demo account. Stop the dev server first.
import { connectDb, disconnectDb } from '../db.js';
import { seedDemo, DEMO_LOGIN } from './demo.js';

await connectDb();
await seedDemo();
console.log(`[seed] Demo account ready. Log in with ${DEMO_LOGIN.email} / ${DEMO_LOGIN.password}`);
await disconnectDb();
