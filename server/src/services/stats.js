import { Enquiry } from '../models/Enquiry.js';
import { Job } from '../models/Job.js';
import { stageOf, valueOf } from './confidence.js';
import { enquiryView } from './enquiries.js';

const DAY = 86400000;
export function weekStart(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  return new Date(x.getTime() - dow * DAY);
}

export const jobState = (j) =>
  j.fittedAt && j.paidFullAt ? 'done' : j.fittedAt ? 'fitted' : j.depositPaidAt || !j.deposit ? 'work' : 'dep';
export const jobDue = (j) => (j.paidFullAt ? 0 : j.price - (j.depositPaidAt ? j.deposit : 0));

export async function dashboard(businessId, now = new Date()) {
  const [enquiries, jobs] = await Promise.all([
    Enquiry.find({ business: businessId }).sort({ createdAt: -1 }),
    Job.find({ business: businessId }).sort({ wonAt: -1 }),
  ]);
  const open = enquiries.filter((e) => !['won', 'lost'].includes(e.status));
  const pipeline = { you: { value: 0, count: 0 }, wait: { value: 0, count: 0 }, sent: { value: 0, count: 0 } };
  for (const e of open) {
    const k = stageOf(e);
    pipeline[k].value += valueOf(e);
    pipeline[k].count++;
  }
  const quoted = enquiries.filter((e) => e.status === 'quoted');
  const unpaid = jobs.filter((j) => !j.paidFullAt);

  const start = weekStart(now);
  const weekly = [];
  for (let i = 7; i >= 0; i--) {
    const from = new Date(start.getTime() - i * 7 * DAY);
    const to = new Date(from.getTime() + 7 * DAY);
    const won = jobs.filter((j) => j.wonAt >= from && j.wonAt < to);
    weekly.push({ weekOf: from, value: won.reduce((a, j) => a + j.price, 0), jobs: won.length, current: i === 0 });
  }

  return {
    pipeline: { ...pipeline, total: open.reduce((a, e) => a + valueOf(e), 0), openCount: open.length },
    won: { value: jobs.reduce((a, j) => a + j.price, 0), count: jobs.length },
    quotesOut: { value: quoted.reduce((a, e) => a + (e.quote?.price || 0), 0), count: quoted.length },
    toCollect: { value: unpaid.reduce((a, j) => a + jobDue(j), 0), jobs: unpaid.map((j) => ({ id: String(j._id), number: j.number, customer: j.customer, due: jobDue(j), state: jobState(j), deposit: j.deposit, depositPaidAt: j.depositPaidAt, fittedAt: j.fittedAt })) },
    needsYou: open.filter((e) => stageOf(e) === 'you').map(enquiryView),
    weekly,
  };
}

export async function counts(businessId) {
  const [enquiries, jobs] = await Promise.all([
    Enquiry.find({ business: businessId }, 'status customerReply'),
    Job.find({ business: businessId }, 'fittedAt paidFullAt depositPaidAt deposit'),
  ]);
  return {
    needsYou: enquiries.filter((e) => stageOf(e) === 'you').length,
    enquiries: enquiries.length,
    quotes: enquiries.filter((e) => e.status === 'quoted').length,
    jobsOpen: jobs.filter((j) => jobState(j) !== 'done').length,
  };
}

// One week of activity. offset 0 = last full week, 1 = the week before, and so on.
export async function weeklyReport(businessId, offset = 0, now = new Date()) {
  const to = new Date(weekStart(now).getTime() - offset * 7 * DAY);
  const from = new Date(to.getTime() - 7 * DAY);
  const inRange = (d) => d && d >= from && d < to;
  const [enquiries, jobs] = await Promise.all([Enquiry.find({ business: businessId }), Job.find({ business: businessId })]);

  const came = enquiries.filter((e) => inRange(e.createdAt));
  const prevCame = enquiries.filter((e) => e.createdAt >= new Date(from.getTime() - 7 * DAY) && e.createdAt < from).length;
  const quotesSent = enquiries.filter((e) => inRange(e.quote?.sentAt));
  const won = jobs.filter((j) => inRange(j.wonAt));
  const lost = enquiries.filter((e) => e.status === 'lost' && inRange(e.closedAt));
  const decided = won.length + lost.length;
  const days = [0, 0, 0, 0, 0, 0, 0];
  for (const e of came) days[(e.createdAt.getDay() + 6) % 7]++;
  const sources = {};
  for (const e of came) sources[e.channel] = (sources[e.channel] || 0) + 1;
  const toQuote = quotesSent.map((e) => (e.quote.sentAt - e.createdAt) / DAY);

  return {
    from,
    to,
    enquiries: came.length,
    enquiriesWeekBefore: prevCame,
    detailsChased: came.filter((e) => e.questionsSentAt).length,
    customersReplied: came.filter((e) => e.details.some((d) => d.source === 'reply')).length,
    quotesSent: quotesSent.length,
    won: { count: won.length, value: won.reduce((a, j) => a + j.price, 0), deposits: won.reduce((a, j) => a + (j.depositPaidAt ? j.deposit : 0), 0) },
    winRate: decided ? Math.round((won.length / decided) * 100) : null,
    decided,
    funnel: [
      came.length,
      came.filter((e) => e.detailsInAt || ['ready', 'quoted', 'won'].includes(e.status)).length,
      came.filter((e) => e.quote?.sentAt).length,
      came.filter((e) => e.status === 'won').length,
    ],
    days,
    sources,
    avgDaysToQuote: toQuote.length ? Math.round((toQuote.reduce((a, b) => a + b, 0) / toQuote.length) * 10) / 10 : null,
  };
}
