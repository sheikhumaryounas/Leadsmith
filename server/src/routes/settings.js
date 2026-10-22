import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { Invite } from '../models/Invite.js';
import { Outbox } from '../models/Outbox.js';
import { ah, HttpError, notFound } from '../middleware/errors.js';
import { allow } from '../middleware/auth.js';
import { sendMail } from '../services/mailer.js';
import { inviteEmail } from '../services/templates.js';

const r = Router();

export function businessView(b) {
  if (!b) return null;
  const o = b.toObject();
  return { ...o, id: String(o._id), _id: undefined, __v: undefined, nextQuote: `Q${String(o.counters.quote).padStart(4, '0')}`, nextInvoice: `INV-${String(o.counters.invoice).padStart(4, '0')}` };
}

const s = (max) => z.string().trim().max(max);
const settingsInput = z.object({
  name: s(120).min(1).optional(),
  ownerName: s(120).optional(),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email().max(200)]).optional(),
  phone: s(40).optional(),
  address: s(300).optional(),
  vatNumber: s(40).optional(),
  companyNumber: s(40).optional(),
  areas: z.array(s(30).min(1)).max(20).optional(),
  settings: z.object({
    askForPhoto: z.boolean(),
    tone: z.enum(['standard', 'friendly', 'formal']),
    signature: s(300),
    nudgeAfterHours: z.number().int().min(12).max(168),
    followUpDays: z.array(z.number().int().min(1).max(60)).length(3)
      .refine((d) => d[0] < d[1] && d[1] < d[2], 'each check-in must be later than the one before'),
    quoteValidDays: z.number().int().min(7).max(120),
    balanceDue: z.enum(['on_fitting', '7_days', '14_days']),
    pricesIncludeVat: z.boolean(),
    vatRegistered: z.boolean(),
    vatRate: z.number().min(0).max(30),
    deposit: z.enum(['25%', '50%', 'None']),
    terms: s(1000),
    bank: z.object({
      accountName: s(120),
      sortCode: z.union([z.literal(''), z.string().trim().regex(/^\d{2}-?\d{2}-?\d{2}$/, 'should look like 00-00-00')]),
      accountNumber: z.union([z.literal(''), z.string().trim().regex(/^\d{8}$/, 'should be 8 digits')]),
    }).partial(),
    notify: z.object({
      customerReplies: z.boolean(), jobWon: z.boolean(), morningSummary: z.boolean(), weeklyReport: z.boolean(), byEmail: z.boolean(), bySms: z.boolean(),
    }).partial(),
    whatsappConnected: z.boolean(),
  }).partial().optional(),
});

r.get('/settings', (req, res) => res.json({ business: businessView(req.business) }));

r.patch('/settings', allow('owner', 'full'), ah(async (req, res) => {
  const body = settingsInput.parse(req.body);
  const b = req.business;
  const { settings, ...top } = body;
  Object.assign(b, top);
  if (settings) {
    const { bank, notify, ...rest } = settings;
    Object.assign(b.settings, rest);
    if (bank) Object.assign(b.settings.bank, bank);
    if (notify) Object.assign(b.settings.notify, notify);
  }
  await b.save();
  res.json({ business: businessView(b) });
}));

r.post('/settings/form-key', allow('owner'), ah(async (req, res) => {
  req.business.formKey = crypto.randomBytes(12).toString('hex');
  await req.business.save();
  res.json({ business: businessView(req.business) });
}));

r.get('/team', allow('owner', 'full'), ah(async (req, res) => {
  const [members, invites] = await Promise.all([
    User.find({ business: req.business._id }).sort({ createdAt: 1 }),
    Invite.find({ business: req.business._id, acceptedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }),
  ]);
  res.json({ members, invites: invites.map((i) => ({ id: String(i._id), email: i.email, role: i.role, expiresAt: i.expiresAt })) });
}));

r.post('/team/invites', allow('owner'), ah(async (req, res) => {
  const body = z.object({ email: z.string().trim().toLowerCase().email().max(200), role: z.enum(['full', 'jobsheets']) }).parse(req.body);
  if (await User.exists({ email: body.email })) throw new HttpError(409, 'That person already has a Leadsmith account.');
  const open = await Invite.countDocuments({ business: req.business._id, acceptedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
  if (open >= 10) throw new HttpError(409, 'You can have up to 10 open invites.');
  const invite = await Invite.create({
    business: req.business._id,
    email: body.email,
    role: body.role,
    token: crypto.randomBytes(24).toString('hex'),
    invitedBy: req.user._id,
    expiresAt: new Date(Date.now() + 7 * 86400000),
  });
  const link = `${config.appUrl}/invite/${invite.token}`;
  const mail = await sendMail({ business: req.business, to: body.email, subject: `You're invited to ${req.business.name} on Leadsmith`, text: inviteEmail(req.business, link), kind: 'invite' });
  res.status(201).json({ invite: { id: String(invite._id), email: invite.email, role: invite.role }, mail, link: config.smtp ? undefined : link });
}));

r.delete('/team/invites/:id', allow('owner'), ah(async (req, res) => {
  const out = await Invite.deleteOne({ _id: req.params.id, business: req.business._id, acceptedAt: { $exists: false } });
  if (!out.deletedCount) throw notFound('Invite not found');
  res.json({ ok: true });
}));

r.delete('/team/members/:id', allow('owner'), ah(async (req, res) => {
  if (String(req.user._id) === req.params.id) throw new HttpError(409, "You can't remove yourself.");
  const out = await User.deleteOne({ _id: req.params.id, business: req.business._id, role: { $ne: 'owner' } });
  if (!out.deletedCount) throw notFound('Team member not found');
  res.json({ ok: true });
}));

r.get('/outbox', allow('owner', 'full'), ah(async (req, res) => {
  const mails = await Outbox.find({ business: req.business._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ mails: mails.map((m) => ({ id: String(m._id), to: m.to, subject: m.subject, text: m.text, kind: m.kind, status: m.status, error: m.error, attachments: m.attachments, at: m.createdAt })) });
}));

export default r;
