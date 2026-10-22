import bcrypt from 'bcryptjs';
import { Business } from '../models/Business.js';
import { User } from '../models/User.js';
import { Enquiry } from '../models/Enquiry.js';
import { Job } from '../models/Job.js';
import { Outbox } from '../models/Outbox.js';
import { Invite } from '../models/Invite.js';
import { questionsDraft } from '../services/templates.js';
import { nextNumber } from '../services/numbers.js';

export const DEMO_LOGIN = { email: 'dave@ridgewayfab.co.uk', password: 'leadsmith-demo' };

const DAY = 86400000;
const ago = (days, hours = 0) => new Date(Date.now() - days * DAY - hours * 3600000);
const ahead = (days) => new Date(Date.now() + days * DAY);
const pounds = (gbp) => Math.round(gbp * 100);
const d = (key, value, source = 'message', at) => ({ key, value, source, at });
const p = (key, ask) => ({ key, ask });

// Recreates the Ridgeway Fabrication demo account from the original prototype.
export async function seedDemo() {
  const old = await Business.findOne({ email: 'info@ridgewayfab.co.uk' });
  if (old) {
    await Promise.all([Enquiry, Job, Outbox, Invite, User].map((M) => M.deleteMany({ business: old._id })));
    await old.deleteOne();
  }

  const b = await Business.create({
    name: 'Ridgeway Fabrication',
    ownerName: 'Dave Hartley',
    email: 'info@ridgewayfab.co.uk',
    address: 'Unit 4, Bilton Works, Harrogate, North Yorkshire',
    areas: ['Harrogate', 'Leeds', 'York', 'Knaresborough', 'Ripon', 'Wetherby', 'Otley', 'Ilkley'],
    settings: { signature: 'Dave\nRidgeway Fabrication', bank: { accountName: 'Ridgeway Fabrication' } },
    counters: { quote: 127, job: 83, invoice: 83 },
  });
  await User.create({ business: b._id, name: 'Dave Hartley', email: DEMO_LOGIN.email, passwordHash: await bcrypt.hash(DEMO_LOGIN.password, 11), role: 'owner' });
  await fillDemoData(b);
  return b;
}

// Adds the sample customers, quotes and jobs to any business. Numbers come from the
// business's own counters so they never clash with its real quotes and jobs.
export async function fillDemoData(b) {

  const base = { business: b._id };
  const ev = (...pairs) => pairs.map(([text, at]) => ({ text, at }));
  const enquiries = [
    {
      name: 'Sarah Whitfield', town: 'Harrogate', postcode: 'HG2', job: 'Double driveway gates', jobType: 'gates', channel: 'Website form', email: 's.whitfield@example.com', phone: '07700 900412',
      message: "Hi, we're after a pair of gates for our drive, something like the photo. About 5ft tall. Can you give me a price? Thanks, Sarah",
      details: [d('Job', 'Driveway gates, double swing'), d('Height', '≈1,520 mm (“about 5ft”)'), d('Location', 'Harrogate, HG2'), d('Style', 'Arched top, vertical bars, spear finials', 'photo'), d('Material', 'Mild steel', 'photo')],
      pending: [p('Opening width', 'The width of the opening between your posts or pillars'), p('Finish', "Whether you'd like them galvanised, powder coated, or both"), p('Supply or fit', "If you'd like us to fit them, or supply only")],
      estimate: pounds(2950), range: [pounds(2700), pounds(3300)], effort: 'About 3 days + half-day fit', fit: 'A style we make often',
      notes: 'Drive slopes slightly towards the road. Check clearance under the hinge side.', status: 'needs_info', createdAt: ago(0, 2),
    },
    {
      name: 'Priya Nair', town: 'Leeds', postcode: 'LS8', job: 'Staircase balustrade', jobType: 'balustrade', channel: 'Email', email: 'priya.nair@example.com',
      message: "Hello, I need a quote for a new balustrade on our staircase. Glass or metal, not sure yet. We'd like it done before Christmas if possible. Thanks, Priya",
      details: [d('Job', 'Staircase balustrade'), d('Deadline', 'Before Christmas'), d('Location', 'Leeds, LS8')],
      pending: [p('Number of steps', 'How many steps the staircase has'), p('Infill', 'Whether you prefer glass panels or metal bars'), p('Landing run', 'The length of the landing edge at the top')],
      estimate: pounds(2400), range: [pounds(2100), pounds(2800)], effort: 'About 3 days + 1 day fit', fit: 'Indoor job, needs a site visit', status: 'needs_info', createdAt: ago(0, 3),
    },
    {
      name: 'Tom Okafor', town: 'York', postcode: 'YO24', job: 'Juliet balconies ×2', jobType: 'juliet', channel: 'Email', email: 'tom.okafor@example.com',
      message: 'Hi, after two Juliet balconies for the first floor, like the photo. Plain bars, black. Supply and fit please. Tom',
      details: [d('Job', 'Juliet balconies, 2 off'), d('Supply or fit', 'Supply and fit'), d('Location', 'York, YO24'), d('Style', 'Plain vertical bars, flat top rail', 'photo'), d('Width', '1200 mm each', 'reply', ago(1)), d('Height', '1100 mm from floor', 'reply', ago(1)), d('Finish', 'Galvanised + powder coat, RAL 9005', 'reply', ago(1))],
      pending: [], estimate: pounds(2140), range: [pounds(1900), pounds(2400)], effort: '2 days + half-day fit', fit: 'A style we make often',
      notes: 'First floor. Bring the tall ladders and a second fitter.', status: 'ready', questionsSentAt: ago(1, 8), detailsInAt: ago(1), createdAt: ago(1, 9),
    },
    {
      name: 'James Hollins', town: 'Ilkley', postcode: 'LS29', job: 'Garden railings, 14 m', jobType: 'railings', channel: 'Phone note', phone: '07700 900833',
      message: "Phone note. Wants railings along the front garden wall, about 14 m, roughly 900 high. Said he'd send photos tonight.",
      details: [d('Job', 'Railings on front garden wall'), d('Length', '≈14 m'), d('Height', '≈900 mm'), d('Location', 'Ilkley, LS29')],
      pending: [p('Wall photos', 'A couple of photos of the wall'), p('Finish', 'Galvanised, painted or powder coated'), p('Top style', 'Spear tops, ball tops or a flat rail')],
      estimate: pounds(3600), range: [pounds(3200), pounds(4100)], effort: '4 days + 1 day fit', fit: 'Long run, good-value job',
      notes: 'Ilkley is at the edge of our area. Allow extra travel.', status: 'waiting', questionsSentAt: ago(1), nudgeAt: ahead(1), createdAt: ago(1, 1),
    },
    {
      name: 'Claire Booth', town: 'Otley', postcode: 'LS21', job: 'Side gate', jobType: 'side_gate', channel: 'Email', email: 'claire.b@example.com', shopping: true,
      message: 'Hi, just getting a few prices for a side gate like the attached, black. Thanks, Claire',
      details: [d('Job', 'Side gate, single'), d('Finish', 'Black'), d('Location', 'Otley, LS21'), d('Style', 'Arched top, spear finials', 'photo')],
      pending: [p('Opening width', 'The width of the opening'), p('Height', 'The height you would like')],
      estimate: pounds(780), range: [pounds(700), pounds(900)], effort: '1 day + half-day fit', fit: 'Small, quick job',
      notes: 'Said she is getting a few prices.', status: 'waiting', questionsSentAt: ago(3), nudgedAt: ago(1), createdAt: ago(3, 2),
    },
    {
      name: 'Northgate Dental', contact: 'Karen', town: 'Leeds', postcode: 'LS1', job: 'Security grilles ×6', jobType: 'grilles', channel: 'Email', email: 'karen@northgatedental.example',
      message: 'Hello, we need security grilles on six rear windows at the practice. Photo of one attached. Karen, Practice Manager',
      details: [d('Job', 'Security grilles, 6 off'), d('Location', 'Leeds, LS1'), d('Style', 'Plain bars, two flat rails', 'photo'), d('Sizes', '6 windows, all measured', 'reply', ago(3)), d('Finish', 'Galvanised + RAL 9005 black', 'reply', ago(3))],
      pending: [], estimate: pounds(3480), range: [pounds(3100), pounds(3800)], effort: '4 days + 1 day fit', fit: 'Commercial, repeat potential',
      notes: 'Fit outside surgery hours. Karen prefers email.', status: 'quoted',
      quote: { price: pounds(3480), deposit: '50%', description: 'six window security grilles, plain bars with two flat rails, galvanised and powder coated black, supplied and fitted', sentAt: ago(2) },
      followUps: { sent: 0, paused: true }, customerReply: { text: "Could you fit before 12 December? If so we're happy to go ahead.", at: ago(0, 1), answered: false },
      questionsSentAt: ago(3, 6), detailsInAt: ago(3), confidenceAtQuote: 78, createdAt: ago(3, 7),
    },
    {
      name: 'Ahmed Rashid', town: 'Wetherby', postcode: 'LS22', job: 'Spiral staircase', jobType: 'spiral', channel: 'Website form', email: 'ahmed.r@example.com',
      message: 'Looking for an external spiral staircase like this up to the first floor balcony, about 3 m rise. Can it be galvanised? What tread options do you do?',
      details: [d('Job', 'External spiral staircase'), d('Finish', 'Galvanised'), d('Location', 'Wetherby, LS22'), d('Rise', '3,050 mm', 'reply', ago(11)), d('Diameter', '1,600 mm', 'reply', ago(11)), d('Treads', 'Chequer plate', 'reply', ago(11))],
      pending: [], estimate: pounds(6950), range: [pounds(6200), pounds(7600)], effort: '7 days + 1 day fit', fit: 'Large, high-value job',
      notes: 'Needs a concrete pad. Check who is doing the groundwork.', status: 'quoted',
      quote: { price: pounds(6950), deposit: '50%', description: 'an external spiral staircase, 1,600 mm diameter, 3,050 mm rise, chequer plate treads, galvanised, supplied and fitted', sentAt: ago(9) },
      followUps: { sent: 2, paused: false, nextAt: ahead(5) }, questionsSentAt: ago(13), detailsInAt: ago(11), confidenceAtQuote: 74, createdAt: ago(13, 2),
    },
    {
      name: 'Mark Ellis', town: 'Knaresborough', postcode: 'HG5', job: 'Window grilles ×3', jobType: 'grilles', channel: 'Email', email: 'mark.ellis@example.com', phone: '07700 900218',
      message: "Hi, I'd like security grilles on three back windows. Sketch of the bars attached. Mark",
      details: [d('Job', 'Window security grilles, 3 off'), d('Location', 'Knaresborough, HG5'), d('Style', 'Plain bars, flat rails', 'photo'), d('Sizes', 'G1 1150×1050, G2 600×900, G3 600×750', 'reply', ago(13)), d('Finish', 'Galv + RAL 9016 white', 'reply', ago(12))],
      pending: [], estimate: pounds(1860), range: [pounds(1650), pounds(2050)], effort: '2 days + half-day fit', fit: 'A style we make often',
      notes: 'Call after 5pm.', status: 'won',
      quote: { price: pounds(1860), deposit: '50%', description: 'three window security grilles (G1 1150 × 1050, G2 600 × 900, G3 600 × 750 mm), galvanised and powder coated white, supplied and fitted', sentAt: ago(11) },
      followUps: { sent: 0, paused: true }, customerReply: { text: 'Great, happy to go ahead. When can you fit?', at: ago(9), answered: true },
      confidenceAtQuote: 78, closedAt: ago(9), createdAt: ago(16),
    },
    {
      name: 'Helen Marsh', town: 'Ripon', postcode: 'HG4', job: 'Balcony railing', jobType: 'balcony', channel: 'Email', email: 'helen.m@example.com',
      message: 'Could you quote for a railing along our balcony? It is about 3.6 m long. Helen',
      details: [d('Job', 'Balcony railing'), d('Length', '3.6 m'), d('Location', 'Ripon, HG4'), d('Height', '1100 mm', 'reply', ago(15)), d('Finish', 'Black powder coat', 'reply', ago(15))],
      pending: [], estimate: pounds(2380), range: [pounds(2100), pounds(2600)], effort: '2 days + 1 day fit', fit: 'Standard job', status: 'lost',
      quote: { price: pounds(2380), deposit: '50%', description: 'a 3.6 m balcony railing, 1100 mm high, black powder coat, supplied and fitted', sentAt: ago(14) },
      followUps: { sent: 1, paused: true }, customerReply: { text: "Thanks for the quote. We've gone with someone a bit closer to us.", at: ago(6), answered: true },
      lostReason: 'Went with another quote', closedAt: ago(6), createdAt: ago(17),
    },
  ];
  const docs = [];
  for (const e of [...enquiries].filter((x) => x.quote).sort((a, c) => a.quote.sentAt - c.quote.sentAt)) e.quote.ref = await nextNumber(b._id, 'quote');
  for (const e of enquiries) {
    const doc = new Enquiry({ ...base, ...e, events: ev([`Enquiry received · ${e.channel}`, e.createdAt]) });
    if (doc.status === 'needs_info') doc.draft = { text: questionsDraft(doc, b), tone: 'standard', edited: false };
    if (doc.questionsSentAt) doc.events.push({ text: 'Asked for the missing details', at: doc.questionsSentAt });
    if (doc.detailsInAt) doc.events.push({ text: 'Customer replied with the details', at: doc.detailsInAt });
    if (doc.quote?.sentAt) doc.events.push({ text: `Quote ${doc.quote.ref} sent`, at: doc.quote.sentAt });
    if (doc.customerReply?.text) doc.events.push({ text: 'Customer replied to the quote', at: doc.customerReply.at });
    if (doc.lostReason) doc.events.push({ text: `Marked as lost · ${doc.lostReason}`, at: doc.closedAt });
    docs.push(await doc.save({ timestamps: false }));
  }

  const mark = docs.find((x) => x.name === 'Mark Ellis');
  const jobs = [
    {
      title: 'Window security grilles ×3', customer: 'Mark Ellis', enquiry: mark._id, email: mark.email, town: 'Knaresborough', postcode: 'HG5',
      phone: '07700 900218', site: '8 Mill Lane, Knaresborough HG5', access: 'Rear windows via side gate. Park on the drive.',
      price: pounds(1860), deposit: pounds(930), wonAt: ago(9), depositPaidAt: ago(7), confidenceAtQuote: 78,
      specs: [{ k: 'Bars', v: '16 mm solid round, 100 mm centres' }, { k: 'Material', v: 'Mild steel' }, { k: 'Finish', v: 'Galvanised + powder coat, RAL 9016 white' }, { k: 'Fixing', v: 'Inside reveal, resin anchors' }, { k: 'Supply', v: 'Supply and fit' }],
      lines: [{ description: 'Window security grilles, 3 off, made to measure (G1 1150 × 1050, G2 600 × 900, G3 600 × 750 mm)', amount: pounds(1260) }, { description: 'Hot-dip galvanising and powder coat, RAL 9016 white', amount: pounds(312) }, { description: 'Fitting into inside reveals with resin anchors', amount: pounds(288) }],
      note: 'Mark works weekdays, call after 5pm to book fitting. Bathroom sill is cracked, check it before drilling.',
    },
    {
      title: 'Steel handrails, front and rear steps', customer: 'Farrow Builders', town: 'Boroughbridge', postcode: 'YO51',
      phone: '07700 900611', site: 'Plot 3, Mill Gate, Boroughbridge YO51', access: 'Site gate open 7:30 to 4. Ask for Gary on arrival.',
      price: pounds(2640), deposit: pounds(1320), wonAt: ago(8), depositPaidAt: ago(6), confidenceAtQuote: 71,
      specs: [{ k: 'Rail', v: '48 mm round tube, mid rail' }, { k: 'Finish', v: 'Galvanised + powder coat, RAL 7016' }, { k: 'Fixing', v: 'Base-plated posts, resin anchors' }],
      lines: [{ description: 'Steel handrails, 2 runs, made to measure (H1 3200 mm, H2 2100 mm), with mid rails', amount: pounds(1776) }, { description: 'Hot-dip galvanising and powder coat, RAL 7016 anthracite', amount: pounds(384) }, { description: 'Fitting with base-plated posts and resin anchors', amount: pounds(480) }],
      note: 'Fit after the steps are tiled, not before. Gary will call.',
    },
    {
      title: 'Arched garden gate', customer: 'Linda Carr', town: 'Pateley Bridge', postcode: 'HG3',
      phone: '07700 900477', site: '2 Low Green, Pateley Bridge HG3', access: 'Lane is narrow, park at the village hall.',
      price: pounds(1920), deposit: pounds(960), wonAt: ago(6), depositPaidAt: ago(5), fittedAt: ago(1), confidenceAtQuote: 58,
      specs: [{ k: 'Bars', v: '16 mm square, spear finials' }, { k: 'Finish', v: 'Galvanised + powder coat, RAL 9005 black' }, { k: 'Fixing', v: 'Hung on pins into stone piers' }],
      lines: [{ description: 'Arched garden gate, 1020 × 1500 mm, spear finials and ring detail', amount: pounds(1344) }, { description: 'Hot-dip galvanising and powder coat, RAL 9005 black', amount: pounds(264) }, { description: 'Hanging on pins into stone piers, with latch and drop bolt', amount: pounds(312) }],
      note: 'Fitted. Balance invoice sent the same day.',
    },
    {
      title: 'Balcony balustrade', customer: 'Pat Doyle', town: 'Harrogate', postcode: 'HG1',
      phone: '07700 900352', site: '14 Elm Row, Harrogate HG1', access: 'Balcony reached through the flat. Key with neighbour at 12.',
      price: pounds(3150), deposit: pounds(1575), wonAt: ago(21), depositPaidAt: ago(20), fittedAt: ago(13), paidFullAt: ago(13), confidenceAtQuote: 66,
      specs: [{ k: 'Bars', v: '16 mm round, 100 mm centres' }, { k: 'Finish', v: 'Galvanised + powder coat, RAL 9005' }, { k: 'Fixing', v: 'Side-fixed to slab edge' }],
      lines: [{ description: 'Balcony balustrade, 4.8 m total run, 1100 mm high, side-fixed', amount: pounds(2286) }, { description: 'Hot-dip galvanising and powder coat, RAL 9005 black', amount: pounds(456) }, { description: 'Fitting to slab edge with stainless anchors', amount: pounds(408) }],
      note: 'Paid in full on the day.',
    },
    {
      title: 'Railing repairs, 3 sites', customer: 'Greenhow Lettings', town: 'Ripon', postcode: 'HG4',
      phone: '07700 900790', site: '3 rental properties, Ripon HG4', access: 'Tenants notified. Keys from the office on North Street.',
      price: pounds(1240), deposit: 0, wonAt: ago(27), fittedAt: ago(21), paidFullAt: ago(16), confidenceAtQuote: 84,
      specs: [{ k: 'Material', v: 'Mild steel to match' }, { k: 'Finish', v: 'Cold galv + black paint on repairs' }, { k: 'Billing', v: 'Net 14 days, no deposit' }],
      lines: [{ description: 'Railing repairs across 3 sites (labour, 1.5 days)', amount: pounds(936) }, { description: 'Materials: replacement bars, latch, post fixings, cold galv and paint', amount: pounds(304) }],
      note: 'Repeat customer. Invoice to the office, not the tenants.',
    },
  ];
  jobs.sort((a, c) => a.wonAt - c.wonAt);
  for (const j of jobs) {
    const job = await Job.create({ ...base, ...j, number: await nextNumber(b._id, 'job'), invoiceNumber: await nextNumber(b._id, 'invoice') });
    if (j.enquiry) await Enquiry.updateOne({ _id: j.enquiry }, { jobRef: job._id });
  }
  return b;
}
