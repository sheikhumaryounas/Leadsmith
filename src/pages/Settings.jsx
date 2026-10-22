import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app-context.jsx';
import { useLoad } from '../lib/hooks.js';
import { fRel, initials } from '../lib/format.js';
import { Icon } from '../lib/icons.jsx';
import { Switch, Seg } from '../components/ui.jsx';

const SECTIONS = [
  ['business', 'Business', 'store'], ['connections', 'Inbox and website form', 'link'], ['replies', 'Replies', 'reply'],
  ['followups', 'Follow-ups', 'clock'], ['quotes', 'Quotes and invoices', 'doc'], ['bank', 'Bank details', 'bank'],
  ['notifications', 'Notifications', 'bell'], ['team', 'Team', 'users'], ['data', 'Your data', 'dl'],
];
const VAT = [['20', '20%'], ['5', '5%'], ['0', '0%'], ['none', 'Not VAT registered']];
const BALANCE = [['on_fitting', 'On the day of fitting'], ['7_days', '7 days after fitting'], ['14_days', '14 days after fitting']];

function toForm(b) {
  const s = b.settings;
  return {
    name: b.name, ownerName: b.ownerName, email: b.email, phone: b.phone, address: b.address, vatNumber: b.vatNumber, companyNumber: b.companyNumber,
    areas: [...b.areas],
    s: { ...s, followUpDays: s.followUpDays.map(String), vat: s.vatRegistered ? String(s.vatRate) : 'none', bank: { ...s.bank }, notify: { ...s.notify } },
  };
}

function toPatch(f) {
  const { vat, ...s } = f.s;
  return {
    name: f.name, ownerName: f.ownerName, email: f.email, phone: f.phone, address: f.address, vatNumber: f.vatNumber, companyNumber: f.companyNumber, areas: f.areas,
    settings: {
      askForPhoto: s.askForPhoto, tone: s.tone, signature: s.signature, nudgeAfterHours: Number(s.nudgeAfterHours),
      followUpDays: s.followUpDays.map(Number), quoteValidDays: Number(s.quoteValidDays), balanceDue: s.balanceDue,
      pricesIncludeVat: s.pricesIncludeVat, vatRegistered: vat !== 'none', vatRate: vat === 'none' ? 0 : Number(vat),
      deposit: s.deposit, terms: s.terms, bank: s.bank, notify: s.notify, whatsappConnected: s.whatsappConnected,
    },
  };
}

const Card = ({ id, title, desc, children }) => {
  const icon = SECTIONS.find((x) => x[0] === id)[2];
  return (
    <section className="card set-card" id={`set-${id}`}>
      <div className="set-h"><span className="set-ic"><Icon name={icon} /></span><div><h2>{title}</h2><p className="desc">{desc}</p></div></div>
      {children}
    </section>
  );
};
const Row = ({ title, sub, children }) => (
  <div className="set-row"><div className="tx"><b>{title}</b>{sub && <span>{sub}</span>}</div>{children}</div>
);

function useScrollSpy() {
  const [active, setActive] = useState('business');
  const [lock, setLock] = useState(null);
  useEffect(() => {
    const onScroll = () => {
      if (lock) return;
      const cards = [...document.querySelectorAll('.set-card')];
      if (!cards.length) return;
      let cur = cards[0];
      if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = cards[cards.length - 1];
      else for (const c of cards) if (c.getBoundingClientRect().top <= 140) cur = c;
      setActive(cur.id.slice(4));
    };
    const unlock = () => setLock(null);
    window.addEventListener('scroll', onScroll, { passive: true });
    ['wheel', 'touchmove', 'keydown'].forEach((t) => window.addEventListener(t, unlock, { passive: true }));
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      ['wheel', 'touchmove', 'keydown'].forEach((t) => window.removeEventListener(t, unlock));
    };
  }, [lock]);
  const jump = (id) => {
    setLock(id);
    setActive(id);
    document.getElementById(`set-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return [active, jump];
}

function Team({ toast, isOwner }) {
  const { data, reload } = useLoad(() => api.get('/team'));
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('jobsheets');
  const [link, setLink] = useState('');
  const invite = async () => {
    try {
      const out = await api.post('/team/invites', { email, role });
      setEmail('');
      setLink(out.link || '');
      toast(`Invite sent to ${out.invite.email}.`);
      reload();
    } catch (err) { toast(err.message, 'error'); }
  };
  const remove = async (path, msg) => {
    try { await api.del(path); toast(msg); reload(); } catch (err) { toast(err.message, 'error'); }
  };
  const ROLE = { owner: 'Owner', full: 'Office, sees everything', jobsheets: 'Workshop, job sheets only' };
  return (
    <>
      {data?.members.map((m) => (
        <div className="set-row" key={m.id}>
          <span className="av-sm">{initials(m.name)}</span>
          <div className="tx"><b>{m.name}</b><span>{m.email} · {ROLE[m.role]}</span></div>
          {isOwner && m.role !== 'owner' && <button className="btn btn-ghost btn-sm" onClick={() => remove(`/team/members/${m.id}`, `${m.name} removed.`)}>Remove</button>}
        </div>
      ))}
      {data?.invites.map((i) => (
        <div className="set-row" key={i.id}>
          <span className="av-sm inv">{i.email[0].toUpperCase()}</span>
          <div className="tx"><b>{i.email}</b><span>{ROLE[i.role]}</span></div>
          <div className="acts"><span className="pill p-due">Invited</span>{isOwner && <button className="btn btn-ghost btn-sm" onClick={() => remove(`/team/invites/${i.id}`, 'Invite cancelled.')}>Cancel</button>}</div>
        </div>
      ))}
      {isOwner && (
        <div className="invite">
          <label className="fl"><span>Invite someone</span><input type="email" value={email} placeholder="name@example.com" onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="fl"><span>They can</span><select value={role} onChange={(e) => setRole(e.target.value)}><option value="jobsheets">See job sheets only</option><option value="full">See everything</option></select></label>
          <button className="btn btn-ghost btn-lg" disabled={!email.includes('@')} onClick={invite}>Send invite</button>
        </div>
      )}
      {link && <p className="hint">No mail server is set up, so share this link yourself: <span className="mono">{link}</span></p>}
    </>
  );
}

function Mails() {
  const { data } = useLoad(() => api.get('/outbox'));
  if (!data) return null;
  const LABEL = { sent: ['p-paid', 'Sent'], logged: ['p-stopped', 'Not sent, no mail server'], skipped: ['p-due', 'No email address'], failed: ['p-lost', 'Failed'] };
  return data.mails.length ? (
    <ul className="mails">
      {data.mails.map((m) => (
        <li key={m.id}>
          <details>
            <summary><b>{m.subject}</b><span className="muted">{m.to || 'No recipient'} · {fRel(m.at)}</span><span className={`pill ${LABEL[m.status][0]}`}>{LABEL[m.status][1]}</span></summary>
            <pre>{m.text}</pre>
            {m.attachments?.length > 0 && <span className="hint">Attached: {m.attachments.join(', ')}</span>}
          </details>
        </li>
      ))}
    </ul>
  ) : <p className="muted">Nothing sent yet.</p>;
}

export default function Settings() {
  const { business, user, setBusiness, toast } = useApp();
  const [f, setF] = useState(() => toForm(business));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newArea, setNewArea] = useState('');
  const [active, jump] = useScrollSpy();
  const isOwner = user.role === 'owner';
  const top = useCallback((k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setDirty(true); }, []);
  const set = useCallback((k, v) => { setF((x) => ({ ...x, s: { ...x.s, [k]: v } })); setDirty(true); }, []);
  const setIn = (group, k, v) => { setF((x) => ({ ...x, s: { ...x.s, [group]: { ...x.s[group], [k]: v } } })); setDirty(true); };
  const formUrl = useMemo(() => `${window.location.origin}/api/public/forms/${business.formKey}`, [business.formKey]);

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = async () => {
    const d = f.s.followUpDays.map(Number);
    if (d.some((n) => !Number.isInteger(n) || n < 1 || n > 60) || !(d[0] < d[1] && d[1] < d[2])) return toast('Check-in days must be whole numbers from 1 to 60, each later than the one before.', 'error');
    setSaving(true);
    try {
      const { business: b } = await api.patch('/settings', toPatch(f));
      setBusiness(b);
      setF(toForm(b));
      setDirty(false);
      toast('Settings saved.');
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };
  const addArea = () => {
    const v = newArea.trim().slice(0, 30);
    if (!v) return;
    if (f.areas.some((a) => a.toLowerCase() === v.toLowerCase())) return toast(`${v} is already on the list.`, 'error');
    if (f.areas.length >= 20) return toast('You can add up to 20 towns.', 'error');
    setF({ ...f, areas: [...f.areas, v] }); setNewArea(''); setDirty(true);
  };
  const newKey = async () => {
    try { const { business: b } = await api.post('/settings/form-key'); setBusiness(b); toast('New form address made. Update your website form.'); } catch (err) { toast(err.message, 'error'); }
  };
  const copy = async (text, msg) => { try { await navigator.clipboard.writeText(text); toast(msg); } catch { toast('Copy is blocked here.', 'error'); } };
  const snippet = `<form action="${formUrl}" method="post">\n  <input name="name" required placeholder="Your name">\n  <input name="email" type="email" placeholder="Email">\n  <input name="phone" placeholder="Phone">\n  <input name="town" placeholder="Town">\n  <input name="job" required placeholder="What do you need?">\n  <textarea name="message" placeholder="Tell us about the job"></textarea>\n  <input name="website" style="display:none" tabindex="-1" autocomplete="off">\n  <button>Send enquiry</button>\n</form>`;
  const s = f.s;
  const idx = SECTIONS.findIndex((x) => x[0] === active);

  return (
    <>
      <div className="ph-head">
        <div><h1>Settings</h1><p className="lede">How Leadsmith runs for {business.name}.</p></div>
        <div className="btnrow"><span className="muted" style={{ fontSize: 13 }}>{dirty ? 'You have unsaved changes' : 'All changes saved'}</span><button className="btn btn-accent btn-lg" disabled={!dirty || saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button></div>
      </div>
      <div className="set-wrap">
        <nav className="set-nav" aria-label="Settings sections">
          <div className="spy-head"><span>On this page</span><b>{idx + 1} of {SECTIONS.length}</b></div>
          {SECTIONS.map(([k, l, ic], i) => (
            <button key={k} data-to={k} className={`${k === active ? 'on' : ''} ${i < idx ? 'past' : ''}`} aria-current={k === active ? 'true' : undefined} onClick={() => jump(k)}><Icon name={ic} />{l}</button>
          ))}
        </nav>
        <div className="set-body">
          <Card id="business" title="Business" desc="Shown on your quotes, invoices and emails.">
            <div className="fgrid">
              <label className="fl"><span>Business name</span><input value={f.name} maxLength={120} onChange={top('name')} /></label>
              <label className="fl"><span>Your name</span><input value={f.ownerName} maxLength={120} onChange={top('ownerName')} /></label>
              <label className="fl"><span>Email</span><input type="email" value={f.email} maxLength={200} onChange={top('email')} /></label>
              <label className="fl"><span>Phone</span><input type="tel" value={f.phone} maxLength={40} placeholder="Your phone number" onChange={top('phone')} /></label>
              <label className="fl full"><span>Workshop address</span><input value={f.address} maxLength={300} onChange={top('address')} /></label>
              <label className="fl"><span>VAT number</span><input value={f.vatNumber} maxLength={40} placeholder="GB 123 4567 89" onChange={top('vatNumber')} /></label>
              <label className="fl"><span>Company number</span><input value={f.companyNumber} maxLength={40} placeholder="Optional" onChange={top('companyNumber')} /></label>
            </div>
            <div className="areas">
              <b>Areas you cover</b>
              <div className="area-list">
                {f.areas.map((a, i) => <span className="area" key={a}>{a}<button aria-label={`Remove ${a}`} onClick={() => { setF({ ...f, areas: f.areas.filter((_, j) => j !== i) }); setDirty(true); }}><Icon name="x" /></button></span>)}
                {!f.areas.length && <span className="hint" style={{ margin: 0 }}>No towns yet.</span>}
              </div>
              <div className="area-add"><input className="inp" value={newArea} placeholder="Add a town" maxLength={30} aria-label="Add a town" onChange={(e) => setNewArea(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addArea()} /><button className="btn btn-ghost" onClick={addArea}>Add</button></div>
            </div>
          </Card>

          <Card id="connections" title="Inbox and website form" desc="Where Leadsmith picks up new enquiries.">
            <Row title="Website quote form" sub="Enquiries sent to this address arrive in Today with a reply drafted.">
              <div className="acts"><span className="pill p-paid">Live</span><button className="btn btn-ghost" onClick={() => copy(snippet, 'Form code copied.')}>Copy form code</button>{isOwner && <button className="btn btn-ghost" onClick={newKey}>New address</button>}</div>
            </Row>
            <div className="code-box">{formUrl}</div>
            <Row title="Email inbox" sub="Reading your inbox automatically is coming next. For now, add email enquiries with “Add enquiry”.">
              <span className="pill p-stopped">Coming soon</span>
            </Row>
            <Row title="WhatsApp Business" sub="Mark this on if you take enquiries on WhatsApp, so they’re labelled in your reports.">
              <Switch on={s.whatsappConnected} label="WhatsApp enquiries" onChange={(v) => set('whatsappConnected', v)} />
            </Row>
          </Card>

          <Card id="replies" title="Replies" desc="How Leadsmith writes to customers for you.">
            <Row title="Approve every message before it goes" sub="Always on. Only check-ins and nudges you switched on go by themselves."><Switch on label="Approve every message" disabled onChange={() => {}} /></Row>
            <Row title="Ask for a photo when there isn’t one" sub="Adds a line asking for a photo of where it’s going."><Switch on={s.askForPhoto} label="Ask for a photo" onChange={(v) => set('askForPhoto', v)} /></Row>
            <Row title="Default tone" sub="You can still change it on each reply."><Seg label="Default tone" value={s.tone} options={[['standard', 'Standard'], ['friendly', 'Friendly'], ['formal', 'Formal']]} onChange={(v) => set('tone', v)} /></Row>
            <div className="set-row"><label className="fl full" style={{ flex: 1 }}><span>Email signature</span><textarea rows={3} maxLength={300} value={s.signature} placeholder={`${business.ownerName}\n${business.name}`} onChange={(e) => set('signature', e.target.value)} /></label></div>
          </Card>

          <Card id="followups" title="Follow-ups" desc="Polite reminders so no enquiry or quote goes quiet.">
            <Row title="Nudge for missing details" sub="If a customer hasn’t sent the details you asked for.">
              <div className="acts"><span className="muted">After</span><select className="inline-sel" aria-label="Nudge after" value={s.nudgeAfterHours} onChange={(e) => set('nudgeAfterHours', e.target.value)}><option value={24}>24 hours</option><option value={48}>48 hours</option><option value={72}>3 days</option></select></div>
            </Row>
            <Row title="Check-ins after a quote" sub="Days after the quote is sent.">
              <div className="days">{['1st', '2nd', '3rd'].map((l, i) => <label key={l}>{l}<input value={s.followUpDays[i]} inputMode="numeric" maxLength={2} onChange={(e) => set('followUpDays', s.followUpDays.map((d, j) => (j === i ? e.target.value.replace(/\D/g, '') : d)))} /></label>)}</div>
            </Row>
            <Row title="Stop when the customer replies" sub="Always on, so nobody gets chased after they answer."><Switch on label="Stop when the customer replies" disabled onChange={() => {}} /></Row>
          </Card>

          <Card id="quotes" title="Quotes and invoices" desc="Defaults for every new quote. You can change them per job.">
            <div className="fgrid">
              <label className="fl"><span>Prices you type in</span><select value={s.pricesIncludeVat ? 'inc' : 'ex'} onChange={(e) => set('pricesIncludeVat', e.target.value === 'inc')}><option value="inc">Include VAT</option><option value="ex">Exclude VAT</option></select></label>
              <label className="fl"><span>VAT rate</span><select value={s.vat} onChange={(e) => set('vat', e.target.value)}>{VAT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              <label className="fl"><span>Quote valid for</span><select value={s.quoteValidDays} onChange={(e) => set('quoteValidDays', e.target.value)}><option value={14}>14 days</option><option value={30}>30 days</option><option value={60}>60 days</option></select></label>
              <label className="fl"><span>Balance due</span><select value={s.balanceDue} onChange={(e) => set('balanceDue', e.target.value)}>{BALANCE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              <label className="fl"><span>Next quote number</span><input className="mono-in" readOnly value={business.nextQuote} /></label>
              <label className="fl"><span>Next invoice number</span><input className="mono-in" readOnly value={business.nextInvoice} /></label>
            </div>
            <div style={{ marginTop: 16 }}><Row title="Deposit to book a job" sub="Used for new quotes."><Seg label="Deposit" value={s.deposit} options={[['25%', '25%'], ['50%', '50%'], ['None', 'None']]} onChange={(v) => set('deposit', v)} /></Row></div>
            <div className="set-row"><label className="fl full" style={{ flex: 1 }}><span>Terms printed on quotes</span><textarea rows={3} maxLength={1000} value={s.terms} onChange={(e) => set('terms', e.target.value)} /></label></div>
          </Card>

          <Card id="bank" title="Bank details" desc="Printed on invoices so customers can pay by bank transfer.">
            <div className="fgrid">
              <label className="fl"><span>Account name</span><input value={s.bank.accountName} maxLength={120} onChange={(e) => setIn('bank', 'accountName', e.target.value)} /></label>
              <label className="fl"><span>Sort code</span><input className="mono-in" inputMode="numeric" placeholder="00-00-00" maxLength={8} value={s.bank.sortCode} onChange={(e) => setIn('bank', 'sortCode', e.target.value)} /></label>
              <label className="fl"><span>Account number</span><input className="mono-in" inputMode="numeric" placeholder="8 digits" maxLength={8} value={s.bank.accountNumber} onChange={(e) => setIn('bank', 'accountNumber', e.target.value.replace(/\D/g, ''))} /></label>
            </div>
          </Card>

          <Card id="notifications" title="Notifications" desc="What Leadsmith tells you, and when. Alerts are sent once a mail server is set up.">
            <Row title="A customer replies" sub="Straight away, so you can answer while they are keen."><Switch on={s.notify.customerReplies} label="Customer replies" onChange={(v) => setIn('notify', 'customerReplies', v)} /></Row>
            <Row title="A job is won or a deposit is paid" sub="So you can book the fitting."><Switch on={s.notify.jobWon} label="Job won" onChange={(v) => setIn('notify', 'jobWon', v)} /></Row>
            <Row title="Morning summary" sub="Every weekday at 7am: what needs you today."><Switch on={s.notify.morningSummary} label="Morning summary" onChange={(v) => setIn('notify', 'morningSummary', v)} /></Row>
            <Row title="Weekly report" sub="Mondays at 7am: enquiries, quotes and work won."><Switch on={s.notify.weeklyReport} label="Weekly report" onChange={(v) => setIn('notify', 'weeklyReport', v)} /></Row>
            <Row title="Send alerts by" sub="Pick one or both.">
              <div className="checks">
                <label><input type="checkbox" checked={s.notify.byEmail} onChange={(e) => setIn('notify', 'byEmail', e.target.checked)} />Email</label>
                <label><input type="checkbox" checked={s.notify.bySms} onChange={(e) => setIn('notify', 'bySms', e.target.checked)} />Text message</label>
              </div>
            </Row>
          </Card>

          <Card id="team" title="Team" desc="People in the office or workshop who use Leadsmith with you.">
            <Team toast={toast} isOwner={isOwner} />
          </Card>

          <Card id="data" title="Your data" desc="Everything Leadsmith sends, and everything it keeps, belongs to you.">
            <div className="sub-label">Sent emails</div>
            <Mails />
          </Card>
        </div>
      </div>
    </>
  );
}
