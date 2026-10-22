import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Business } from '../models/Business.js';
import { ah, notFound } from '../middleware/errors.js';
import { createEnquiry } from '../services/enquiries.js';
import { enquiryInput } from './enquiries.js';
import { config } from '../config.js';

const r = Router();

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Shown to customers who submit a plain HTML form on the business's website.
const page = (name, message) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f3ef;font:16px/1.5 system-ui,sans-serif;color:#1b1d21;padding:24px}main{max-width:420px;background:#fff;border:1px solid #e7e3db;border-radius:14px;padding:32px;text-align:center}h1{font-size:20px;margin:0 0 8px}a{color:#9a3b10}</style></head>
<body><main><h1>${esc(name)}</h1><p>${esc(message)}</p><p style="color:#5a5d63;font-size:14px">You can close this page.</p></main></body></html>`;

// The business's website quote form posts here: POST /api/public/forms/:formKey
r.post(
  '/forms/:formKey',
  rateLimit({ windowMs: 60_000, limit: config.isTest ? 1000 : 10, standardHeaders: 'draft-7', legacyHeaders: false }),
  ah(async (req, res) => {
    const business = await Business.findOne({ formKey: String(req.params.formKey).slice(0, 64) });
    if (!business) throw notFound('Form not found');
    // A hidden "website" field catches simple spam bots.
    if (req.body?.website) return res.status(202).json({ ok: true });
    const fromHtmlForm = req.is('application/x-www-form-urlencoded');
    const parsed = enquiryInput.omit({ channel: true, contact: true }).safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const msg = `Please check ${issue.path.join('.') || 'the form'}: ${issue.message}`;
      return fromHtmlForm ? res.status(400).type('html').send(page(business.name, msg)) : res.status(400).json({ error: msg });
    }
    await createEnquiry(business, { ...parsed.data, channel: 'Website form' });
    const message = `Thanks, ${business.name} has your enquiry and will be in touch soon.`;
    if (fromHtmlForm) return res.status(201).type('html').send(page(business.name, message));
    res.status(201).json({ ok: true, message });
  }),
);

export default r;
