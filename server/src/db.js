import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { config } from './config.js';

let memory = null;

// Connects to MONGODB_URI. In development without one, starts a local MongoDB
// that keeps its data in server/.data so nothing extra needs installing.
export async function connectDb(uri = config.mongoUri) {
  if (!uri) {
    if (config.isProd) throw new Error('MONGODB_URI must be set in production.');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const dbPath = path.resolve(process.cwd(), '.data');
    fs.mkdirSync(dbPath, { recursive: true });
    memory = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: 'wiredTiger' } });
    uri = memory.getUri('leadsmith');
    console.log(`[db] No MONGODB_URI set. Using the local dev database in ${dbPath}`);
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (memory) {
    await memory.stop();
    memory = null;
  }
}
