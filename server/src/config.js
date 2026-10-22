import 'dotenv/config';

const env = process.env;
const isProd = env.NODE_ENV === 'production';

export const config = {
  port: Number(env.PORT || 4000),
  mongoUri: env.MONGODB_URI || '',
  jwtSecret: env.JWT_SECRET || (isProd ? '' : 'dev-only-secret-change-me'),
  clientOrigin: env.CLIENT_ORIGIN || 'http://localhost:5173',
  appUrl: env.APP_URL || env.CLIENT_ORIGIN || 'http://localhost:5173',
  isProd,
  isTest: env.NODE_ENV === 'test',
  smtp: env.SMTP_HOST
    ? {
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT || 587),
        secure: env.SMTP_SECURE === 'true',
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      }
    : null,
  mailFrom: env.MAIL_FROM || '',
  schedulerMs: Number(env.SCHEDULER_MS || 60000),
};

if (!config.jwtSecret) throw new Error('JWT_SECRET must be set in production.');
