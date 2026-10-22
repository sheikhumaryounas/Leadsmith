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

export async function requireAuth(req, _res, next) {
  try {
    const header = req.get('authorization');
    const token = req.cookies?.[COOKIE] || (header?.startsWith('Bearer ') ? header.slice(7) : null);
    if (!token) throw new HttpError(401, 'Please log in.');
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw new HttpError(401, 'Your session has ended. Please log in again.');
    }
    const user = await User.findById(payload.sub);
    if (!user) throw new HttpError(401, 'Please log in.');
    const business = await Business.findById(user.business);
    if (!business) throw new HttpError(401, 'Please log in.');
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
