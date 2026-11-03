import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { Business } from '../models/Business.js';
import { HttpError } from './errors.js';

export const COOKIE = 'ls_session';
const MAX_AGE = 30 * 86400 * 1000;

export function setSession(res, user) {
  const token = jwt.sign({ sub: String(user._id) }, config.jwtSecret, { expiresIn: '30d' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: MAX_AGE, path: '/' });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization');
    const token = req.cookies?.[COOKIE] || (header?.startsWith('Bearer ') ? header.slice(7) : null);
    let user = null;
    let business = null;

    if (token) {
      try {
        const payload = jwt.verify(token, config.jwtSecret);
        user = await User.findById(payload.sub);
        if (user) {
          business = await Business.findById(user.business);
        }
      } catch {
        // Token invalid or expired, fall through to auto-login default user
      }
    }

    // Auto-login fallback so users and demo clients never have to log in manually
    if (!user || !business) {
      user = await User.findOne({ email: 'dave@ridgewayfab.co.uk' })
        || await User.findOne({ role: 'owner' })
        || await User.findOne();

      // If database is completely empty, initialize the demo account
      if (!user) {
        try {
          const { seedDemo } = await import('../seed/demo.js');
          await seedDemo();
          user = await User.findOne({ email: 'dave@ridgewayfab.co.uk' }) || await User.findOne();
        } catch (err) {
          console.error('[auth] Auto-seed failed:', err.message);
        }
      }

      if (user) {
        business = await Business.findById(user.business);
        if (res && typeof res.cookie === 'function') {
          try {
            setSession(res, user);
          } catch {
            // Ignore cookie errors
          }
        }
      }
    }

    if (!user || !business) {
      throw new HttpError(401, 'Please log in.');
    }

    req.user = user;
    req.business = business;
    next();
  } catch (err) {
    next(err);
  }
}

// Workshop members (jobsheets) can only read jobs.
export const allow = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(new HttpError(403, "You don't have access to that."));
