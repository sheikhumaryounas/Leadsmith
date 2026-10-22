import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errors.js';
import auth from './routes/auth.js';
import enquiries from './routes/enquiries.js';
import jobs from './routes/jobs.js';
import dashboard from './routes/dashboard.js';
import settings from './routes/settings.js';
import publicRoutes from './routes/public.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  if (!config.isTest) app.use(morgan(config.isProd ? 'combined' : 'dev'));

  // The website form can be posted from any site; everything else only from the app.
  app.use('/api/public', cors(), express.urlencoded({ extended: false, limit: '50kb' }), publicRoutes);
  app.use('/api', cors({ origin: config.clientOrigin, credentials: true }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, limit: config.isTest ? 1000 : 50, standardHeaders: 'draft-7', legacyHeaders: false }), auth);
  app.use('/api/enquiries', requireAuth, enquiries);
  app.use('/api/jobs', requireAuth, jobs);
  app.use('/api', requireAuth, dashboard);
  app.use('/api', requireAuth, settings);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // In production the built React app is served from client/dist.
  const dist = path.resolve(process.cwd(), '../client/dist');
  if (config.isProd && fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
