import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDb, disconnectDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { Enquiry } from '../src/models/Enquiry.js';
import { Outbox } from '../src/models/Outbox.js';
import { runDue } from '../src/services/scheduler.js';
import { seedDemo, DEMO_LOGIN } from '../src/seed/demo.js';
import { readMessage } from '../src/services/extract.js';

let mongo;
let app;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDb(mongo.getUri('leadsmith-test'));
  app = createApp();
});

afterAll(async () => {
  await disconnectDb();
  await mongo.stop();
});

async function signUp(email = `owner${Math.random().toString(36).slice(2)}@example.com`) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ businessName: 'Test Forge', name: 'Sam Smith', email, password: 'correct-horse' });
  expect(res.status).toBe(201);
  return { agent, business: res.body.business };
}

describe('reading a message', () => {
  it('picks up sizes, finish and quantity, and lists what is missing', () => {
    const r = readMessage({ job: 'Driveway gates', message: 'Pair of gates, about 5ft tall, galvanised and black. Supply and fit please.' });
    expect(r.jobType).toBe('gates');
    const keys = r.details.map((d) => d.key);
    expect(keys).toEqual(expect.arrayContaining(['Height', 'Finish', 'Supply or fit']));
    expect(r.pending.map((p) => p.key)).toEqual(['Opening width']);
    const two = readMessage({ job: 'Juliet balconies', message: 'Two juliet balconies please' });
    expect(two.estimate).toBe(2 * 107000);
  });
});

describe('auth', () => {
  it('blocks the API without a session', async () => {
    expect((await request(app).get('/api/enquiries')).status).toBe(401);
  });

  it('registers, logs out and logs back in', async () => {
    const { agent } = await signUp('sam@example.com');
    expect((await agent.get('/api/auth/me')).body.user.email).toBe('sam@example.com');
    await agent.post('/api/auth/logout');
    expect((await agent.get('/api/auth/me')).status).toBe(401);
    expect((await agent.post('/api/auth/login').send({ email: 'sam@example.com', password: 'wrong-password' })).status).toBe(401);
    expect((await agent.post('/api/auth/login').send({ email: 'SAM@example.com', password: 'correct-horse' })).status).toBe(200);
    expect((await agent.post('/api/auth/register').send({ businessName: 'X', name: 'Y', email: 'sam@example.com', password: 'correct-horse' })).status).toBe(409);
  });
});

describe('an enquiry from first message to paid job', () => {
  it('runs the whole flow', async () => {
    const { agent } = await signUp();

    let res = await agent.post('/api/enquiries').send({
      name: 'Jo Bloggs', email: 'jo@example.com', town: 'York', job: 'Side gate', channel: 'Email',
      message: 'Hi, a side gate please, black, about 1.6 m high.',
    });
    expect(res.status).toBe(201);
    let e = res.body.enquiry;
    expect(e.status).toBe('needs_info');
    expect(e.stage).toBe('you');
    expect(e.pending.map((p) => p.key)).toEqual(expect.arrayContaining(['Opening width', 'Supply or fit']));
    expect(e.draft.text).toContain('Hi Jo');
    const id = e.id;

    res = await agent.post(`/api/enquiries/${id}/draft`).send({ tone: 'formal' });
    expect(res.body.enquiry.draft.text).toContain('Dear Jo Bloggs');

    res = await agent.post(`/api/enquiries/${id}/approve`);
    expect(res.body.enquiry.status).toBe('waiting');
    expect(res.body.mail.status).toBe('logged');
    expect(await Outbox.countDocuments({ enquiry: id, kind: 'questions' })).toBe(1);

    // can't quote before the details are in
    expect((await agent.post(`/api/enquiries/${id}/quote`).send({ price: 80000 })).status).toBe(409);

    const answers = res.body.enquiry.pending.map((p) => ({ key: p.key, value: 'Answer for ' + p.key }));
    res = await agent.post(`/api/enquiries/${id}/details`).send({ answers });
    expect(res.body.enquiry.status).toBe('ready');
    expect(res.body.enquiry.pending).toHaveLength(0);

    res = await agent.post(`/api/enquiries/${id}/quote`).send({ price: 82000, deposit: '50%' });
    expect(res.status).toBe(200);
    e = res.body.enquiry;
    expect(e.status).toBe('quoted');
    expect(e.quote.ref).toMatch(/^Q\d{4}$/);
    const quoteMail = await Outbox.findOne({ enquiry: id, kind: 'quote' });
    expect(quoteMail.attachments[0]).toMatch(/\.pdf$/);

    const pdf = await agent.get(`/api/enquiries/${id}/quote.pdf`).buffer(true).parse((r, cb) => { const c = []; r.on('data', (d) => c.push(d)); r.on('end', () => cb(null, Buffer.concat(c))); });
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(pdf.body.subarray(0, 4).toString()).toBe('%PDF');

    // the scheduler sends the first check-in once it is due, and only once
    await Enquiry.updateOne({ _id: id }, { 'followUps.nextAt': new Date(Date.now() - 1000) });
    expect((await runDue()).followUps).toBeGreaterThanOrEqual(1);
    expect((await agent.get(`/api/enquiries/${id}`)).body.enquiry.followUps.sent).toBe(1);
    await runDue();
    expect(await Outbox.countDocuments({ enquiry: id, kind: 'followup' })).toBe(1);

    // a customer reply stops check-ins and puts it back on the owner's list
    res = await agent.post(`/api/enquiries/${id}/customer-reply`).send({ text: 'Can you fit next week?' });
    expect(res.body.enquiry.stage).toBe('you');
    expect(res.body.enquiry.followUps.nextAt).toBeUndefined();
    res = await agent.post(`/api/enquiries/${id}/answer`).send({ text: 'Yes, Tuesday works.' });
    expect(res.body.enquiry.stage).toBe('sent');

    res = await agent.post(`/api/enquiries/${id}/won`);
    expect(res.body.enquiry.status).toBe('won');
    const jobId = res.body.job.id;

    let job = (await agent.get(`/api/jobs/${jobId}`)).body.job;
    expect(job.deposit).toBe(41000);
    expect(job.state).toBe('dep');
    expect((await agent.post(`/api/jobs/${jobId}/fitted`)).status).toBe(409);
    await agent.post(`/api/jobs/${jobId}/deposit-paid`);
    await agent.post(`/api/jobs/${jobId}/fitted`);
    job = (await agent.post(`/api/jobs/${jobId}/paid`)).body.job;
    expect(job.state).toBe('done');
    expect(job.due).toBe(0);

    const inv = await agent.get(`/api/jobs/${jobId}/invoice.pdf`);
    expect(inv.headers['content-type']).toBe('application/pdf');

    const dash = (await agent.get('/api/dashboard')).body;
    expect(dash.won.value).toBe(82000);
    expect(dash.weekly).toHaveLength(8);
    expect(dash.weekly[7].value).toBe(82000);
  });

  it('marks lost and reopens', async () => {
    const { agent } = await signUp();
    const { enquiry } = (await agent.post('/api/enquiries').send({ name: 'Al', job: 'Handrail', message: 'A handrail' })).body;
    expect((await agent.post(`/api/enquiries/${enquiry.id}/lost`).send({ reason: 'Price too high' })).body.enquiry.status).toBe('lost');
    expect((await agent.post(`/api/enquiries/${enquiry.id}/reopen`)).body.enquiry.status).toBe('needs_info');
  });
});

describe('isolation and roles', () => {
  it("keeps each business's data private", async () => {
    const a = await signUp();
    const b = await signUp();
    const { enquiry } = (await a.agent.post('/api/enquiries').send({ name: 'Private', job: 'Gates' })).body;
    expect((await b.agent.get(`/api/enquiries/${enquiry.id}`)).status).toBe(404);
    expect((await b.agent.get('/api/enquiries')).body.enquiries).toHaveLength(0);
  });

  it('lets an invited workshop member see jobs only', async () => {
    const { agent } = await signUp();
    const inv = await agent.post('/api/team/invites').send({ email: 'shop@example.com', role: 'jobsheets' });
    expect(inv.status).toBe(201);
    const token = inv.body.link.split('/').pop();
    const member = request.agent(app);
    expect((await member.post(`/api/auth/invite/${token}/accept`).send({ name: 'Shop Floor', password: 'workshop-1' })).status).toBe(201);
    expect((await member.get('/api/jobs')).status).toBe(200);
    expect((await member.get('/api/enquiries')).status).toBe(403);
    expect((await member.patch('/api/settings').send({ name: 'Nope' })).status).toBe(403);
    expect((await member.post(`/api/auth/invite/${token}/accept`).send({ name: 'Again', password: 'workshop-1' })).status).toBe(404);
  });
});

describe('settings and website form', () => {
  it('validates settings and takes website enquiries', async () => {
    const { agent, business } = await signUp();
    expect((await agent.patch('/api/settings').send({ settings: { followUpDays: [7, 3, 14] } })).status).toBe(400);
    const ok = await agent.patch('/api/settings').send({ areas: ['York'], settings: { followUpDays: [2, 5, 10], tone: 'friendly', bank: { sortCode: '12-34-56' } } });
    expect(ok.body.business.settings.followUpDays).toEqual([2, 5, 10]);
    expect(ok.body.business.settings.bank.sortCode).toBe('12-34-56');

    const form = await request(app).post(`/api/public/forms/${business.formKey}`).send({ name: 'Web Person', email: 'web@example.com', job: 'Railings', message: 'About 10 m of railings' });
    expect(form.status).toBe(201);
    expect((await request(app).post('/api/public/forms/wrong-key').send({ name: 'x', job: 'y' })).status).toBe(404);
    const list = (await agent.get('/api/enquiries')).body.enquiries;
    expect(list[0].channel).toBe('Website form');
    expect(list[0].draft.text).toContain('Hi Web');
  });
});

describe('demo data', () => {
  it('seeds the Ridgeway account with the original numbers', async () => {
    await seedDemo();
    const agent = request.agent(app);
    expect((await agent.post('/api/auth/login').send(DEMO_LOGIN)).status).toBe(200);
    const dash = (await agent.get('/api/dashboard')).body;
    expect(dash.pipeline.total).toBe(2230000);
    expect(dash.pipeline.you.value).toBe(1097000);
    expect(dash.needsYou).toHaveLength(4);
    expect(dash.won.value).toBe(1081000);
    expect(dash.toCollect.value).toBe(321000);
  });
});

describe('plain HTML website form', () => {
  it('accepts a form post and shows a thank-you page', async () => {
    const { business } = await signUp();
    const res = await request(app).post(`/api/public/forms/${business.formKey}`).type('form').send({ name: 'Form Person', job: 'Side gate', message: 'black gate please' });
    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('has your enquiry');
    const bad = await request(app).post(`/api/public/forms/${business.formKey}`).type('form').send({ name: '' });
    expect(bad.status).toBe(400);
    expect(bad.text).toContain('Please check');
  });
});
