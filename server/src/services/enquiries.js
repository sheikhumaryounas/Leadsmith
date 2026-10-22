import { Enquiry } from '../models/Enquiry.js';
import { Job } from '../models/Job.js';
import { conflict } from '../middleware/errors.js';
import { readMessage, postcodeFrom } from './extract.js';
import { confidence, stageOf, valueOf } from './confidence.js';
import { questionsDraft, quoteEmail, followUpText, nudgeText } from './templates.js';
import { sendMail } from './mailer.js';
import { quotePdf } from './pdf.js';
import { nextNumber } from './numbers.js';
import { addDays, gbp, plural, cap, depositPence, first } from './format.js';

const event = (e, text) => e.events.push({ text, at: new Date() });
const need = (e, ...allowed) => {
  if (!allowed.includes(e.status)) throw conflict(`This enquiry is "${e.status.replace('_', ' ')}", so that can't be done now.`);
};

export function enquiryView(e) {
  const o = e.toObject ? e.toObject() : e;
  const c = confidence(o);
  return {
    ...o,
    id: String(o._id),
    _id: undefined,
    __v: undefined,
    business: undefined,
    confidence: c,
    stage: stageOf(o),
    value: valueOf(o),
  };
}

function describe(e) {
  const parts = e.details.filter((d) => d.key !== 'Job').map((d) => `${d.key.toLowerCase()} ${d.value}`);
  return `${e.job.toLowerCase()}${parts.length ? `, ${parts.join(', ')}` : ''}`;
}

export async function createEnquiry(b, input) {
  const read = readMessage({ message: input.message, job: input.job });
  const town = input.town || '';
  const postcode = input.postcode || postcodeFrom(input.message);
  const details = [...read.details];
  if (town || postcode) details.push({ key: 'Location', value: [town, postcode].filter(Boolean).join(', '), source: 'message' });
  const e = new Enquiry({
    business: b._id,
    name: input.name,
    contact: input.contact || '',
    email: input.email || '',
    phone: input.phone || '',
    town,
    postcode,
    job: input.job,
    channel: input.channel,
    message: input.message || '',
    details,
    pending: read.pending,
    jobType: read.jobType,
    estimate: read.estimate,
    range: read.range,
    effort: read.effort,
    fit: read.fit,
    shopping: read.shopping,
    status: read.pending.length ? 'needs_info' : 'ready',
  });
  if (!read.pending.length) e.detailsInAt = new Date();
  e.draft = { text: questionsDraft(e, b), tone: b.settings.tone, edited: false };
  event(e, `Enquiry received · ${e.channel}`);
  event(e, `${plural(details.length, 'detail')} picked up from the message`);
  await e.save();
  return e;
}

export async function setDraft(e, b, { text, tone }) {
  need(e, 'needs_info');
  if (text != null) e.draft = { text: text.slice(0, 5000), tone: e.draft?.tone || tone || b.settings.tone, edited: true };
  else e.draft = { text: questionsDraft(e, b, tone), tone, edited: false };
  await e.save();
  return e;
}

export async function approveQuestions(e, b) {
  need(e, 'needs_info');
  if (!e.pending.length) throw conflict('Nothing is missing, so there is nothing to ask.');
  const text = e.draft?.text || questionsDraft(e, b);
  const mail = await sendMail({ business: b, enquiry: e, to: e.email, subject: `Re: your ${e.job.toLowerCase()} enquiry`, text, kind: 'questions' });
  e.status = 'waiting';
  e.questionsSentAt = new Date();
  e.nudgeAt = new Date(Date.now() + (b.settings.nudgeAfterHours || 48) * 3600000);
  event(e, `Asked for ${plural(e.pending.length, 'missing detail')}${mail.status === 'skipped' ? ' (no email address, send it yourself)' : ''}`);
  await e.save();
  return { enquiry: e, mail };
}

export async function sendNudge(e, b) {
  need(e, 'waiting');
  const mail = await sendMail({ business: b, enquiry: e, to: e.email, subject: `Re: your ${e.job.toLowerCase()} enquiry`, text: nudgeText(e, b), kind: 'nudge' });
  e.nudgedAt = new Date();
  e.nudgeAt = undefined;
  event(e, 'Nudge sent');
  await e.save();
  return { enquiry: e, mail };
}

// The customer answered (logged by the business). Fills in what was missing.
export async function recordDetails(e, b, answers) {
  need(e, 'needs_info', 'waiting', 'ready');
  const given = answers.filter((a) => a.value?.trim());
  if (!given.length) throw conflict('Add at least one answer.');
  for (const a of given) {
    e.details = e.details.filter((d) => d.key !== a.key);
    e.details.push({ key: a.key, value: a.value.trim().slice(0, 300), source: 'reply', at: new Date() });
  }
  const keys = new Set(given.map((a) => a.key));
  e.pending = e.pending.filter((p) => !keys.has(p.key));
  event(e, `${who(e)} replied with ${plural(given.length, 'answer')}`);
  if (!e.pending.length) {
    e.status = 'ready';
    e.detailsInAt = new Date();
    e.nudgeAt = undefined;
  }
  await e.save();
  return e;
}

const who = (e) => e.contact || first(e.name);

export async function sendQuote(e, b, { price, deposit, description }) {
  need(e, 'ready');
  e.quote = {
    ref: await nextNumber(b._id, 'quote'),
    price,
    deposit: deposit || b.settings.deposit,
    description: (description || describe(e)).slice(0, 500),
    sentAt: new Date(),
  };
  const pdf = await quotePdf(b, e);
  const mail = await sendMail({
    business: b,
    enquiry: e,
    to: e.email,
    subject: `Quotation ${e.quote.ref}: ${e.job}`,
    text: quoteEmail(e, b, price, e.quote.deposit),
    attachments: [{ filename: `Quotation-${e.quote.ref}.pdf`, content: pdf }],
    kind: 'quote',
  });
  e.status = 'quoted';
  e.followUps = { sent: 0, paused: false, nextAt: addDays(e.quote.sentAt, b.settings.followUpDays[0]) };
  e.confidenceAtQuote = confidence(e)?.n;
  event(e, `Quote ${e.quote.ref} sent: ${gbp(price)}`);
  await e.save();
  return { enquiry: e, mail };
}

export async function sendFollowUp(e, b) {
  need(e, 'quoted');
  const days = b.settings.followUpDays;
  if (e.followUps.sent >= days.length) throw conflict('All check-ins have been sent.');
  if (e.customerReply?.text) throw conflict('The customer has replied, so check-ins have stopped.');
  const i = e.followUps.sent;
  const mail = await sendMail({ business: b, enquiry: e, to: e.email, subject: `Re: Quotation ${e.quote.ref}`, text: followUpText(e, b, i), kind: 'followup' });
  e.followUps.sent = i + 1;
  e.followUps.nextAt = i + 1 < days.length ? addDays(e.quote.sentAt, days[i + 1]) : undefined;
  event(e, `Day ${days[i]} check-in sent`);
  await e.save();
  return { enquiry: e, mail };
}

export async function setPaused(e, paused) {
  need(e, 'quoted');
  e.followUps.paused = paused;
  event(e, paused ? 'Check-ins paused' : 'Check-ins resumed');
  await e.save();
  return e;
}

export async function recordCustomerReply(e, text) {
  need(e, 'quoted');
  e.customerReply = { text: text.slice(0, 2000), at: new Date(), answered: false };
  e.followUps.nextAt = undefined;
  event(e, `${who(e)} replied to the quote`);
  await e.save();
  return e;
}

export async function answerCustomer(e, b, text) {
  need(e, 'quoted');
  const mail = await sendMail({ business: b, enquiry: e, to: e.email, subject: `Re: Quotation ${e.quote.ref}`, text: text.slice(0, 5000), kind: 'reply' });
  e.customerReply = { ...(e.customerReply?.toObject?.() || e.customerReply || {}), answered: true, answer: text.slice(0, 5000) };
  event(e, `You replied to ${who(e)}`);
  await e.save();
  return { enquiry: e, mail };
}

export async function markWon(e, b) {
  need(e, 'quoted');
  const price = e.quote.price;
  const job = await Job.create({
    business: b._id,
    enquiry: e._id,
    number: await nextNumber(b._id, 'job'),
    invoiceNumber: await nextNumber(b._id, 'invoice'),
    title: e.job,
    customer: e.name,
    email: e.email,
    phone: e.phone,
    town: e.town,
    postcode: e.postcode,
    site: [e.town, e.postcode].filter(Boolean).join(' '),
    price,
    deposit: depositPence(price, e.quote.deposit || 'None'),
    specs: e.details.filter((d) => d.key !== 'Job').map((d) => ({ k: d.key, v: d.value })),
    lines: [{ description: cap(e.quote.description || e.job), amount: price }],
    note: e.notes,
    confidenceAtQuote: e.confidenceAtQuote,
    photos: e.photos,
  });
  e.status = 'won';
  e.closedAt = new Date();
  e.followUps.nextAt = undefined;
  e.jobRef = job._id;
  event(e, `Job won · ${gbp(price)} booked in as ${job.number}`);
  await e.save();
  return { enquiry: e, job };
}

export async function markLost(e, reason) {
  need(e, 'needs_info', 'waiting', 'ready', 'quoted');
  e.status = 'lost';
  e.lostReason = reason;
  e.closedAt = new Date();
  e.followUps.nextAt = undefined;
  e.nudgeAt = undefined;
  event(e, `Marked as lost · ${reason}`);
  await e.save();
  return e;
}

export async function reopen(e, b) {
  need(e, 'lost');
  if (e.quote?.price) {
    e.status = 'quoted';
    e.followUps.paused = true;
  } else e.status = e.pending.length ? (e.questionsSentAt ? 'waiting' : 'needs_info') : 'ready';
  e.lostReason = undefined;
  e.closedAt = undefined;
  event(e, 'Enquiry reopened');
  if (e.status === 'needs_info') e.draft = { text: questionsDraft(e, b), tone: b.settings.tone, edited: false };
  await e.save();
  return e;
}
