import { Router } from 'express';
import { z } from 'zod';
import { Enquiry, CHANNELS } from '../models/Enquiry.js';
import { ah, notFound } from '../middleware/errors.js';
import { allow } from '../middleware/auth.js';
import * as svc from '../services/enquiries.js';
import { quotePdf } from '../services/pdf.js';

const r = Router();
r.use(allow('owner', 'full'));

const s = (max) => z.string().trim().max(max);
export const enquiryInput = z.object({
  name: s(120).min(1, 'is required'),
  contact: s(120).optional(),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email().max(200)]).optional(),
  phone: s(40).optional(),
  town: s(80).optional(),
  postcode: s(12).optional(),
  job: s(120).min(1, 'is required'),
  channel: z.enum(CHANNELS).default('Phone note'),
  message: s(5000).optional(),
});

async function load(req) {
  const e = await Enquiry.findOne({ _id: req.params.id, business: req.business._id });
  if (!e) throw notFound('Enquiry not found');
  return e;
}
const send = (res, e, extra = {}) => res.json({ enquiry: svc.enquiryView(e), ...extra });

r.get('/', ah(async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase().slice(0, 100);
  const list = await Enquiry.find({ business: req.business._id }).sort({ createdAt: -1 }).limit(1000);
  const views = list.map(svc.enquiryView).filter((e) => !q || `${e.name} ${e.job} ${e.town} ${e.postcode} ${e.message}`.toLowerCase().includes(q));
  res.json({ enquiries: views });
}));

r.post('/', ah(async (req, res) => {
  const e = await svc.createEnquiry(req.business, enquiryInput.parse(req.body));
  res.status(201);
  send(res, e);
}));

r.get('/:id', ah(async (req, res) => send(res, await load(req))));

r.patch('/:id', ah(async (req, res) => {
  const body = enquiryInput.partial().extend({ notes: s(2000).optional() }).omit({ channel: true }).parse(req.body);
  const e = await load(req);
  Object.assign(e, body);
  await e.save();
  send(res, e);
}));

r.delete('/:id', allow('owner'), ah(async (req, res) => {
  const e = await load(req);
  await e.deleteOne();
  res.json({ ok: true });
}));

r.post('/:id/draft', ah(async (req, res) => {
  const body = z.object({ text: s(5000).optional(), tone: z.enum(['standard', 'friendly', 'formal']).optional() }).parse(req.body);
  send(res, await svc.setDraft(await load(req), req.business, body));
}));

const withMail = (fn) => ah(async (req, res) => {
  const { enquiry, mail, job } = await fn(req);
  send(res, enquiry, { mail, job: job ? { id: String(job._id), number: job.number } : undefined });
});

r.post('/:id/approve', withMail(async (req) => svc.approveQuestions(await load(req), req.business)));
r.post('/:id/nudge', withMail(async (req) => svc.sendNudge(await load(req), req.business)));

r.post('/:id/details', ah(async (req, res) => {
  const { answers } = z.object({ answers: z.array(z.object({ key: s(60).min(1), value: s(300) })).min(1).max(20) }).parse(req.body);
  send(res, await svc.recordDetails(await load(req), req.business, answers));
}));

r.post('/:id/quote', withMail(async (req) => {
  const body = z.object({
    price: z.number().int().min(100, 'must be at least £1').max(100000000),
    deposit: z.enum(['25%', '50%', 'None']).optional(),
    description: s(500).optional(),
  }).parse(req.body);
  return svc.sendQuote(await load(req), req.business, body);
}));

r.post('/:id/followups/send', withMail(async (req) => svc.sendFollowUp(await load(req), req.business)));
r.post('/:id/followups/pause', ah(async (req, res) => send(res, await svc.setPaused(await load(req), true))));
r.post('/:id/followups/resume', ah(async (req, res) => send(res, await svc.setPaused(await load(req), false))));

r.post('/:id/customer-reply', ah(async (req, res) => {
  const { text } = z.object({ text: s(2000).min(1, 'is required') }).parse(req.body);
  send(res, await svc.recordCustomerReply(await load(req), text));
}));

r.post('/:id/answer', withMail(async (req) => {
  const { text } = z.object({ text: s(5000).min(1, 'is required') }).parse(req.body);
  return svc.answerCustomer(await load(req), req.business, text);
}));

r.post('/:id/won', withMail(async (req) => svc.markWon(await load(req), req.business)));

r.post('/:id/lost', ah(async (req, res) => {
  const { reason } = z.object({ reason: s(200).min(1, 'is required') }).parse(req.body);
  send(res, await svc.markLost(await load(req), reason));
}));

r.post('/:id/reopen', ah(async (req, res) => send(res, await svc.reopen(await load(req), req.business))));

r.get('/:id/quote.pdf', ah(async (req, res) => {
  const e = await load(req);
  const pdf = await quotePdf(req.business, e);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Quotation-${e.quote?.ref || 'draft'}.pdf"` });
  res.send(pdf);
}));

export default r;
