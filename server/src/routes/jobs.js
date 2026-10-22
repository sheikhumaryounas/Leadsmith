import { Router } from 'express';
import { z } from 'zod';
import { Job } from '../models/Job.js';
import { ah, notFound, conflict } from '../middleware/errors.js';
import { allow } from '../middleware/auth.js';
import { invoicePdf } from '../services/pdf.js';
import { jobState, jobDue } from '../services/stats.js';

const r = Router();

export function jobView(j) {
  const o = j.toObject();
  return { ...o, id: String(o._id), _id: undefined, __v: undefined, business: undefined, state: jobState(o), due: jobDue(o) };
}

async function load(req) {
  const j = await Job.findOne({ _id: req.params.id, business: req.business._id });
  if (!j) throw notFound('Job not found');
  return j;
}

r.get('/', ah(async (req, res) => {
  const jobs = await Job.find({ business: req.business._id }).sort({ wonAt: -1 }).limit(1000);
  res.json({ jobs: jobs.map(jobView) });
}));

r.get('/:id', ah(async (req, res) => res.json({ job: jobView(await load(req)) })));

r.get('/:id/invoice.pdf', ah(async (req, res) => {
  const j = await load(req);
  const pdf = await invoicePdf(req.business, j);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${j.invoiceNumber}.pdf"` });
  res.send(pdf);
}));

// Changes below are for the office, not workshop-only members.
r.patch('/:id', allow('owner', 'full'), ah(async (req, res) => {
  const s = (max) => z.string().trim().max(max).optional();
  const body = z.object({ phone: s(40), site: s(300), access: s(500), note: s(2000) }).parse(req.body);
  const j = await load(req);
  Object.assign(j, body);
  await j.save();
  res.json({ job: jobView(j) });
}));

const step = (name, apply) => r.post(`/:id/${name}`, allow('owner', 'full'), ah(async (req, res) => {
  const j = await load(req);
  apply(j);
  await j.save();
  res.json({ job: jobView(j) });
}));

step('deposit-paid', (j) => {
  if (!j.deposit) throw conflict('This job has no deposit.');
  if (j.depositPaidAt) throw conflict('The deposit is already recorded.');
  j.depositPaidAt = new Date();
});
step('fitted', (j) => {
  if (j.fittedAt) throw conflict('This job is already marked as fitted.');
  if (j.deposit && !j.depositPaidAt) throw conflict('Record the deposit before marking it fitted.');
  j.fittedAt = new Date();
});
step('paid', (j) => {
  if (!j.fittedAt) throw conflict('Mark the job as fitted first.');
  if (j.paidFullAt) throw conflict('This job is already paid in full.');
  j.paidFullAt = new Date();
});

export default r;
