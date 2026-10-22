import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Business } from '../models/Business.js';
import { Invite } from '../models/Invite.js';
import { ah, HttpError } from '../middleware/errors.js';
import { requireAuth, setSession, clearSession } from '../middleware/auth.js';
import { businessView } from './settings.js';

const r = Router();

const email = z.string().trim().toLowerCase().email().max(200);
const password = z.string().min(8, 'must be at least 8 characters').max(200);

r.post('/register', ah(async (req, res) => {
  const body = z.object({
    businessName: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(120),
    email,
    password,
  }).parse(req.body);
  if (await User.exists({ email: body.email })) throw new HttpError(409, 'An account with that email already exists.');
  const business = await Business.create({
    name: body.businessName,
    ownerName: body.name,
    email: body.email,
    settings: { bank: { accountName: body.businessName } },
  });
  const user = await User.create({ business: business._id, name: body.name, email: body.email, passwordHash: await bcrypt.hash(body.password, 11), role: 'owner' });
  setSession(res, user);
  res.status(201).json({ user, business: businessView(business) });
}));

r.post('/login', ah(async (req, res) => {
  const body = z.object({ email, password: z.string().min(1).max(200) }).parse(req.body);
  const user = await User.findOne({ email: body.email });
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) throw new HttpError(401, 'That email and password do not match.');
  setSession(res, user);
  const business = await Business.findById(user.business);
  res.json({ user, business: businessView(business) });
}));

r.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

r.get('/me', requireAuth, (req, res) => res.json({ user: req.user, business: businessView(req.business) }));

async function liveInvite(token) {
  const invite = await Invite.findOne({ token: String(token).slice(0, 100), acceptedAt: { $exists: false } });
  if (!invite || invite.expiresAt < new Date()) throw new HttpError(404, 'This invite has expired or was already used.');
  return invite;
}

r.get('/invite/:token', ah(async (req, res) => {
  const invite = await liveInvite(req.params.token);
  const business = await Business.findById(invite.business);
  res.json({ email: invite.email, role: invite.role, businessName: business?.name });
}));

r.post('/invite/:token/accept', ah(async (req, res) => {
  const body = z.object({ name: z.string().trim().min(1).max(120), password }).parse(req.body);
  const invite = await liveInvite(req.params.token);
  if (await User.exists({ email: invite.email })) throw new HttpError(409, 'An account with that email already exists.');
  const user = await User.create({ business: invite.business, name: body.name, email: invite.email, passwordHash: await bcrypt.hash(body.password, 11), role: invite.role });
  invite.acceptedAt = new Date();
  await invite.save();
  setSession(res, user);
  const business = await Business.findById(user.business);
  res.status(201).json({ user, business: businessView(business) });
}));

export default r;
