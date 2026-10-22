import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, pdfUrl } from '../lib/api.js';
import { useAction, useDebounced, useLoad } from '../lib/hooks.js';
import { useApp } from '../lib/app-context.jsx';
import { gbp, fD, fW, fRel, plural, toPence, first } from '../lib/format.js';
import { who, nextShort } from '../lib/status.js';
import { Icon } from '../lib/icons.jsx';
import { Confidence, ErrorBox, Modal, Seg, DetailSkeleton } from '../components/ui.jsx';

const RANK = { needs_info: 1, waiting: 2, ready: 3, quoted: 4, won: 5, lost: 5 };
const STEPS = ['New enquiry', 'Needs your OK', 'Waiting on customer', 'Ready to price', 'Quote sent', 'Won or lost'];
const LOST_REASONS = ['Price too high', 'Went with another quote', 'No reply after follow-ups', 'Timing did not work', 'Changed their mind'];

function sentMessage(base, out) {
  const m = out?.mail;
  if (!m) return base;
  if (m.status === 'skipped') return `${base} There’s no email address, so contact them yourself.`;
  if (m.status === 'failed') return `${base} But the email failed: ${m.error}`;
  if (m.status === 'logged') return `${base} Email saved in Settings › Your data (no mail server set up yet).`;
  return base;
}

const srcLabel = (d) => (d.source === 'message' ? 'Message' : d.source === 'photo' ? 'Photo' : d.source === 'you' ? 'You' : `Reply ${fD(d.at)}`);
const Kv = ({ list }) => (
  <ul className="kv">{list.map((d) => <li key={d.key}><span className="k">{d.key}</span><span className="v">{d.value}</span><span className="src">{srcLabel(d)}</span></li>)}</ul>
);
const SecH = ({ n, title, meta, warn }) => (
  <div className="sec-h"><span className={`sec-n ${warn ? 'warn' : ''}`}>{n}</span><h2>{title}</h2>{meta && <span className="meta">{meta}</span>}</div>
);

function Stepper({ e }) {
  const r = RANK[e.status];
  const done = [e.createdAt, e.createdAt, e.questionsSentAt, e.detailsInAt, e.quote?.sentAt, e.closedAt];
  return (
    <div className="stepper" aria-label="Pipeline steps">
      {STEPS.map((name, i) => {
        let cls = '', dot = i + 1, sm = '', label = name;
        if (i < r) { cls = 'done'; dot = <Icon name="check" />; sm = done[i] ? fD(done[i]) : ''; }
        else if (i === r) {
          if (e.status === 'won') { cls = 'won'; dot = <Icon name="check" />; label = 'Won'; sm = fD(e.closedAt); }
          else if (e.status === 'lost') { cls = 'lost'; dot = '×'; label = 'Lost'; sm = fD(e.closedAt); }
          else { cls = 'cur'; sm = 'Now'; }
        }
        return <div key={name} className={`step ${cls}`}><span className="dot">{dot}</span><div><b>{label}</b>{sm && <small>{sm}</small>}</div></div>;
      })}
    </div>
  );
}

function NextBanner({ e, onAct }) {
  const n = who(e);
  const jump = (label) => <button className="btn btn-accent" onClick={() => document.getElementById('act')?.scrollIntoView({ behavior: 'smooth' })}>{label}</button>;
  let b;
  if (e.status === 'needs_info') b = ['', 'alert', 'Your move', `Approve the reply asking ${n} for ${plural(e.pending.length, 'missing detail')}.`, jump('Review reply')];
  else if (e.status === 'waiting') b = ['calm', 'clock', 'Waiting on customer', `Questions sent ${fRel(e.questionsSentAt)}. Add ${n}’s answers when they reply.`, jump('Add their answers')];
  else if (e.status === 'ready') b = ['', 'flag', 'Your move', 'Everything is in. Set your price and send the quote.', jump('Set price')];
  else if (e.status === 'quoted' && e.customerReply?.text && !e.customerReply.answered) b = ['blue', 'reply', `${n} replied · ${fRel(e.customerReply.at)}`, `“${e.customerReply.text}”`, <button className="btn btn-accent" onClick={() => onAct('answer')}>Reply to {n}</button>];
  else if (e.status === 'quoted') b = ['calm', 'send', 'Following up', e.followUps.paused ? `Check-ins paused on the ${gbp(e.quote.price)} quote.` : e.followUps.nextAt ? `Next check-in goes out ${fW(e.followUps.nextAt)}. Mark it won as soon as ${n} says yes.` : `All check-ins sent. Waiting for ${n}’s decision.`, <button className="btn btn-green" onClick={() => onAct('won')}><Icon name="check" />Mark as won</button>];
  else if (e.status === 'won') b = ['good', 'check', 'Won', `Booked in for ${gbp(e.quote.price)}.`, e.jobRef && <Link className="btn btn-green" to={`/jobs/${e.jobRef}`}>Open job record</Link>];
  else b = ['calm', 'x', 'Closed', `Lost: ${e.lostReason}.`, <button className="btn btn-ghost" onClick={() => onAct('reopen')}>Reopen enquiry</button>];
  const [cls, ic, label, text, btn] = b;
  return (
    <div className={`next ${cls}`}>
      <span className="ic"><Icon name={ic} /></span>
      <div className="tx"><small>{label}</small><strong>{text}</strong></div>
      {btn}
    </div>
  );
}

function DraftCard({ e, act, busy, toast }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(e.draft?.text || '');
  const n = who(e);
  const copy = async () => {
    try { await navigator.clipboard.writeText(e.draft.text); toast('Reply copied.'); } catch { toast('Copy is blocked here. Select the text instead.', 'error'); }
  };
  return (
    <section className="draft" id="act">
      <div className="draft-h">
        <div><h2>Reply to {n}</h2><p>Asks only for what’s missing. Nothing is sent without your OK.</p></div>
        {!editing && (
          <Seg label="Tone" value={e.draft?.edited ? '' : e.draft?.tone} options={[['standard', 'Standard'], ['friendly', 'Friendly'], ['formal', 'Formal']]}
            onChange={(tone) => act('tone', 'draft', { tone }, 'Tone changed.')} />
        )}
      </div>
      <div style={{ padding: '4px 26px 0' }}>
        <div className="mailrow"><span>To</span><span>{e.email ? `${e.name} <${e.email}>` : <em className="muted">No email address. Copy the reply and send it yourself.</em>}</span></div>
        <div className="mailrow"><span>Subject</span><span>Re: your {e.job.toLowerCase()} enquiry</span></div>
        {editing
          ? <textarea className="mail-edit" value={text} onChange={(ev) => setText(ev.target.value)} aria-label="Edit reply" maxLength={5000} autoFocus />
          : <div className="mailbody">{e.draft?.text}</div>}
      </div>
      <div className="draft-f">
        {editing ? (
          <>
            <span className="muted">Editing your reply</span>
            <div className="btnrow">
              <button className="btn btn-ghost" onClick={() => { setEditing(false); setText(e.draft.text); }}>Cancel</button>
              <button className="btn btn-accent" disabled={busy === 'save'} onClick={async () => { if (await act('save', 'draft', { text }, 'Reply updated.')) setEditing(false); }}><Icon name="check" />Save</button>
            </div>
          </>
        ) : (
          <>
            <div className="btnrow">
              <button className="btn btn-ghost" onClick={() => { setText(e.draft.text); setEditing(true); }}><Icon name="pencil" />Edit</button>
              <button className="btn btn-ghost" onClick={copy}><Icon name="copy" />Copy</button>
            </div>
            <button className="btn btn-accent" disabled={busy === 'approve'} onClick={() => act('approve', 'approve', {}, (o) => sentMessage(`Questions sent to ${first(e.name)}.`, o))}><Icon name="send" />Approve and send</button>
          </>
        )}
      </div>
    </section>
  );
}

function WaitingCard({ e, act, busy }) {
  const [answers, setAnswers] = useState(() => Object.fromEntries(e.pending.map((p) => [p.key, ''])));
  const n = who(e);
  const filled = Object.values(answers).filter((v) => v.trim()).length;
  return (
    <section className="card pad" id="act">
      <div className="sec-head" style={{ margin: 0 }}>
        <div><h2>Add {n}’s answers</h2><div className="muted">When {n} replies, type the answers here. Leadsmith moves it on once everything is in.</div></div>
        <span className="pill p-wait">Waiting</span>
      </div>
      <form className="answers" onSubmit={(ev) => { ev.preventDefault(); act('details', 'details', { answers: Object.entries(answers).map(([key, value]) => ({ key, value })) }, 'Answers saved.'); }}>
        {e.pending.map((p) => (
          <div key={p.key}>
            <label htmlFor={`ans-${p.key}`}>{p.key}</label>
            <small>{p.ask}</small>
            <input id={`ans-${p.key}`} className="kv-input" value={answers[p.key]} maxLength={300} onChange={(ev) => setAnswers({ ...answers, [p.key]: ev.target.value })} />
          </div>
        ))}
        <div className="actfoot" style={{ marginTop: 4 }}>
          <button type="button" className="btn btn-ghost" disabled={busy === 'nudge'} onClick={() => act('nudge', 'nudge', {}, (o) => sentMessage(`Nudge sent to ${first(e.name)}.`, o))}><Icon name="send" />Send a nudge now</button>
          <button className="btn btn-accent" disabled={!filled || busy === 'details'}><Icon name="check" />Save {filled ? plural(filled, 'answer') : 'answers'}</button>
        </div>
      </form>
      <div className="sub-label" style={{ marginTop: 22 }}>What you asked</div>
      <div className="mailbody box">{e.draft?.text}</div>
    </section>
  );
}

function describe(e) {
  const parts = e.details.filter((d) => d.key !== 'Job').map((d) => `${d.key.toLowerCase()} ${d.value}`);
  return `${e.job.toLowerCase()}${parts.length ? `, ${parts.join(', ')}` : ''}`;
}

function PriceCard({ e, act, busy, business }) {
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState(business.settings.deposit);
  const [desc, setDesc] = useState(describe(e));
  const [err, setErr] = useState('');
  const p = toPence(price);
  const s = business.settings;
  const vat = s.vatRegistered ? (s.pricesIncludeVat ? ' including VAT' : ' plus VAT') : '';
  const depLine = deposit === 'None' ? 'Payment is due on fitting.' : `A ${deposit} deposit books you in, with the balance on fitting.`;
  const send = () => {
    if (p < 100) return setErr('Enter your price first, or use the typical figure.');
    setErr('');
    act('quote', 'quote', { price: p, deposit, description: desc }, (o) => sentMessage(`${gbp(p)} quote sent to ${first(e.name)}. Check-ins are running.`, o));
  };
  return (
    <section className="card pad price-card" id="act">
      <h2>Price and send the quote</h2>
      <div className="muted" style={{ marginTop: 4 }}>Pricing is your call. Similar jobs usually come in at {gbp(e.range[0])}–{gbp(e.range[1])}.</div>
      <div className="price-grid">
        <div className="field">
          <label htmlFor="price">Your price{vat ? `, ${vat.trim()}` : ''}</label>
          <div className="money"><span>£</span><input id="price" inputMode="decimal" autoComplete="off" placeholder={String(Math.round(e.estimate / 100))} value={price} onChange={(ev) => setPrice(ev.target.value.slice(0, 10))} /></div>
        </div>
        <div className="field">
          <label htmlFor="dep">Deposit to book in</label>
          <select id="dep" value={deposit} onChange={(ev) => setDeposit(ev.target.value)}>{['25%', '50%', 'None'].map((o) => <option key={o}>{o}</option>)}</select>
        </div>
      </div>
      <div className="btnrow" style={{ marginTop: 6 }}><button className="btn btn-ghost btn-sm" onClick={() => setPrice(String(Math.round(e.estimate / 100)))}>Use {gbp(e.estimate)}, typical for this job</button></div>
      {err && <div className="err">{err}</div>}
      <div className="sub-label" style={{ marginTop: 24 }}>What the quote describes</div>
      <textarea className="notes-ta" style={{ background: 'var(--surface)', minHeight: 70 }} value={desc} maxLength={500} onChange={(ev) => setDesc(ev.target.value)} aria-label="Quote description" />
      <div className="sub-label" style={{ marginTop: 18 }}>Quote email</div>
      <div className="mailrow"><span>To</span><span>{e.email ? `${e.name} <${e.email}>` : <em className="muted">No email address saved</em>}</span></div>
      <div className="mailbody">{`Hi ${who(e)},\n\nThanks for sending the details over. The price for ${desc} is ${p ? gbp(p) : '£[your price]'}${vat}. ${depLine}\n\nThe full quotation is attached. Any questions, just reply to this email.`}</div>
      <div className="sendbar">
        <span>The quote PDF is attached. Check-ins go out on day {s.followUpDays.join(', ').replace(/, (\d+)$/, ' and $1')}.</span>
        <button className="btn btn-accent" disabled={busy === 'quote'} onClick={send}><Icon name="send" />Send quote to {who(e)}</button>
      </div>
    </section>
  );
}

function QuotedCard({ e, act, busy, business, open }) {
  const n = who(e);
  const days = business.settings.followUpDays;
  const replied = e.customerReply?.text && !e.customerReply.answered;
  const pdf = <a className="btn btn-ghost btn-sm" href={pdfUrl(`/enquiries/${e.id}/quote.pdf`)} target="_blank" rel="noreferrer"><Icon name="doc" />Quote PDF</a>;
  const closeBtns = (
    <div className="btnrow">
      <button className="btn btn-danger" onClick={() => open('lost')}>Mark as lost</button>
      <button className="btn btn-green" disabled={busy === 'won'} onClick={() => open('won')}><Icon name="check" />Mark as won</button>
    </div>
  );
  if (replied) {
    return (
      <section className="card pad" id="act" style={{ border: '2px solid var(--blue-ink)' }}>
        <div className="label" style={{ color: 'var(--blue-ink)' }}>{n} replied · {fRel(e.customerReply.at)}</div>
        <p className="sent">“{e.customerReply.text}”</p>
        <p className="muted" style={{ margin: '0 0 18px' }}>Check-ins stopped automatically.</p>
        <div className="actfoot" style={{ margin: 0 }}>
          <div className="btnrow"><button className="btn btn-accent" onClick={() => open('answer')}><Icon name="reply" />Reply to {n}</button>{pdf}</div>
          {closeBtns}
        </div>
      </section>
    );
  }
  const stopped = e.followUps.paused || e.customerReply?.text;
  return (
    <section className="card pad" id="act">
      <div className="sec-head" style={{ margin: 0 }}>
        <div><h2>Check-ins on the {gbp(e.quote.price)} quote</h2><div className="muted">Sent on day {days.join(', ').replace(/, (\d+)$/, ' and $1')}. They stop as soon as {n} replies.</div></div>
        <span className={`pill ${stopped ? 'p-stopped' : 'p-sent'}`}>{stopped ? 'Stopped' : 'Running'}</span>
      </div>
      <div className="fu-steps">
        {days.map((d, i) => {
          const at = new Date(new Date(e.quote.sentAt).getTime() + d * 86400000);
          const cls = i < e.followUps.sent ? 'done' : i === e.followUps.sent && !stopped ? 'next' : '';
          const st = i < e.followUps.sent ? 'Sent' : cls === 'next' ? 'Up next' : stopped ? 'Stopped' : 'Scheduled';
          return <div key={d} className={`fu-step ${cls}`}><b>Day {d}</b><small>{fW(at)}</small><span>{st}</span></div>;
        })}
      </div>
      {e.customerReply?.answered && <div className="preview"><small>You replied</small>{e.customerReply.answer}</div>}
      <div className="actfoot">
        <div className="btnrow">
          {e.followUps.sent < days.length && !e.customerReply?.text && (
            <button className="btn btn-ghost btn-sm" disabled={busy === 'pause'} onClick={() => { const was = e.followUps.paused; act('pause', `followups/${was ? 'resume' : 'pause'}`, {}, () => ({ message: was ? 'Check-ins resumed.' : 'Check-ins paused.', action: { label: 'Undo', onClick: () => act('pause', `followups/${was ? 'pause' : 'resume'}`, {}, was ? 'Check-ins paused again.' : 'Check-ins running again.') } })); }}>
              <Icon name={e.followUps.paused ? 'play' : 'pause'} />{e.followUps.paused ? 'Resume' : 'Pause'}
            </button>
          )}
          {e.followUps.sent < days.length && !stopped && (
            <button className="btn btn-ghost btn-sm" disabled={busy === 'send'} onClick={() => act('send', 'followups/send', {}, (o) => sentMessage(`Day ${days[e.followUps.sent]} check-in sent.`, o))}><Icon name="send" />Send next now</button>
          )}
          {!e.customerReply?.text && <button className="btn btn-ghost btn-sm" onClick={() => open('log')}><Icon name="reply" />Add {n}’s reply</button>}
          {pdf}
        </div>
        {closeBtns}
      </div>
    </section>
  );
}

function TextModal({ title, icon, label, initial = '', submit, cta, onClose, busy }) {
  const [text, setText] = useState(initial);
  return (
    <Modal title={title} icon={icon} onClose={onClose} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-accent" disabled={!text.trim() || busy} onClick={() => submit(text)}>{cta}</button>
    </>}>
      <div className="form"><div><label htmlFor="tm">{label}</label><textarea id="tm" style={{ minHeight: 200 }} value={text} maxLength={5000} onChange={(ev) => setText(ev.target.value)} /></div></div>
    </Modal>
  );
}

function LostModal({ e, onClose, submit, busy }) {
  const [reason, setReason] = useState(e.customerReply?.text ? LOST_REASONS[1] : LOST_REASONS[0]);
  return (
    <Modal title={`Mark ${e.name} as lost`} onClose={onClose} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-danger" disabled={busy} onClick={() => submit(reason)}>Mark as lost</button>
    </>}>
      <div className="form">
        <p className="muted" style={{ margin: 0 }}>Pick a reason. It shows up in your weekly report so you can see where jobs go.</p>
        <div className="choices" role="radiogroup">
          {LOST_REASONS.map((r) => <label key={r}><input type="radio" name="lr" checked={reason === r} onChange={() => setReason(r)} />{r}</label>)}
        </div>
      </div>
    </Modal>
  );
}

export default function EnquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { business, toast, hold, refreshCounts } = useApp();
  const { data, error, loading, reload, setData } = useLoad(() => api.get(`/enquiries/${id}`), [id]);
  const { busy, run } = useAction(toast);
  const [modal, setModal] = useState(null);
  const [noteState, setNoteState] = useState('Never sent to the customer');
  const saveNote = useDebounced(async (notes) => {
    try { await api.patch(`/enquiries/${id}`, { notes }); setNoteState('Saved'); } catch (err) { setNoteState(err.message); }
  });

  // Emails wait a few seconds with an Undo before they go.
  const SENDS = { approve: 'Sending your questions', quote: 'Sending the quote', answer: 'Sending your reply', nudge: 'Sending a nudge', send: 'Sending the check-in' };
  const act = async (key, path, body, ok) => {
    const out = await run(key, async () => {
      if (SENDS[key] && !(await hold(`${SENDS[key]} to ${who(data.enquiry)}…`))) return null;
      return api.post(`/enquiries/${id}/${path}`, body);
    }, ok);
    if (out) { setData((d) => ({ ...d, enquiry: out.enquiry })); refreshCounts(); }
    return out;
  };

  const e = data?.enquiry;
  const sig = useMemo(() => (business.settings.signature || `${first(business.ownerName)}\n${business.name}`), [business]);
  if (!e) return loading ? <DetailSkeleton /> : <ErrorBox error={error} onRetry={reload} />;

  const live = !['won', 'lost'].includes(e.status);
  const msgD = e.details.filter((d) => d.source === 'message');
  const phD = e.details.filter((d) => d.source === 'photo');
  const repD = e.details.filter((d) => d.source === 'reply' || d.source === 'you');
  const open = async (which) => {
    if (which === 'won') {
      const out = await act('won', 'won', {}, (o) => `Won! ${gbp(e.quote.price)} booked in as ${o.job.number}.`);
      if (out?.job) navigate(`/jobs/${out.job.id}`);
    } else if (which === 'reopen') act('reopen', 'reopen', {}, 'Enquiry reopened.');
    else setModal(which);
  };
  const c = e.confidence;

  return (
    <>
      <button className="back" onClick={() => navigate(live ? '/today' : '/enquiries')}><Icon name="back" />{live ? 'Back to Today' : 'All enquiries'}</button>
      <div className="dhead">
        <div>
          <h1>{e.name}</h1>
          <div className="dsub">{e.job}{e.town ? ` · ${e.town}` : ''} {e.postcode}</div>
          <div className="contact">
            {e.email && <span><Icon name="mail" />{e.email}</span>}
            {e.phone && <span><Icon name="phone" />{e.phone}</span>}
            <span>Came in {fRel(e.createdAt).toLowerCase()} via {e.channel.toLowerCase()}</span>
          </div>
        </div>
        {live && <button className="btn btn-ghost" onClick={() => setModal('lost')}>Mark as lost</button>}
      </div>

      <NextBanner e={e} onAct={open} />

      <section className="card pipecard">
        <div className="pc-top">
          <div>
            <div className="label">Pipeline</div>
            <div className="pc-now">{live ? <b>Step {RANK[e.status] + 1} of 6</b> : <b>Closed · {e.status === 'won' ? 'Won' : 'Lost'} {fD(e.closedAt)}</b>}</div>
            <div className="pc-next">Next: <b>{nextShort(e)}</b></div>
          </div>
          {c && <div className="pcc"><span className="pcc-l">Potential client confidence</span><span className={`pcc-n ${c.band}`}>{c.band === 'client' ? 'Client' : c.n}</span></div>}
        </div>
        <Stepper e={e} />
      </section>

      <div className="dgrid">
        <div className="dcol">
          <section className="card pad" style={{ order: 1 }}>
            <SecH n={1} title="What they asked for" meta={e.channel} />
            {e.message && <blockquote className="quote">“{e.message}”</blockquote>}
            {msgD.length > 0 && <><div className="sub-label">They told us</div><Kv list={msgD} /></>}
          </section>
          <section className="card pad" style={{ order: 3 }}>
            <SecH n={3} title="Done so far" meta={plural(e.events.length, 'step')} />
            <ol className="ev">
              {e.events.map((x, i) => <li key={i}><span className="dot"><Icon name="check" /></span><div className="t">{x.text}</div><div className="s">{fRel(x.at)}</div></li>)}
              {live && <li className="up"><span className="dot" /><div className="t">Next: {nextShort(e)}</div></li>}
            </ol>
            {repD.length > 0 && <><div className="sub-label">Answers from follow-up</div><Kv list={repD} /></>}
          </section>
        </div>
        <div className="dcol">
          <section className="card pad" style={{ order: 2 }}>
            <SecH n={2} title="What we assessed" />
            {phD.length ? <Kv list={phD} /> : <p className="muted" style={{ margin: 0 }}>No photo to assess yet.</p>}
            <div className="estbox">
              <div><div className="l">Similar jobs</div><div className="big">{gbp(e.range[0])}–{gbp(e.range[1])}</div></div>
              <div className="l" style={{ textAlign: 'right' }}>{e.quote?.price ? 'Your quote' : 'Typical'}<br /><b className="mono" style={{ fontSize: 16, color: 'var(--ink)' }}>{gbp(e.value)}</b></div>
            </div>
            <ul className="kv"><li><span className="k">Workshop time</span><span className="v">{e.effort}</span></li><li><span className="k">Job fit</span><span className="v">{e.fit}</span></li></ul>
          </section>
          <section className="card pad" style={{ order: 4 }}>
            <SecH n={4} title="Still pending" meta={e.pending.length && live ? plural(e.pending.length, 'item') : ''} warn={e.pending.length > 0 && live} />
            {e.pending.length > 0 && live ? (
              <>
                <ul className="pend">{e.pending.map((d) => <li key={d.key}><Icon name="alert" /><div><div className="k">{d.key}</div><div className="q">{d.ask}</div></div></li>)}</ul>
                <p className="pnote">{e.status === 'needs_info' ? 'Not asked yet. Approve the reply below to send these questions.' : `Asked ${fRel(e.questionsSentAt).toLowerCase()}. Waiting for ${who(e)}.`}</p>
              </>
            ) : e.status === 'quoted' ? (
              <ul className="pend calm"><li><Icon name="clock" /><div><div className="k">{who(e)}’s decision</div><div className="q">On the {gbp(e.quote.price)} quote · {nextShort(e)}</div></div></li></ul>
            ) : <div className={`clear ${e.status === 'lost' ? 'muted' : ''}`}><Icon name="check" />{e.status === 'won' ? 'Nothing pending. Job booked.' : e.status === 'lost' ? 'Nothing pending. Enquiry closed.' : 'Nothing missing. Ready to price.'}</div>}
          </section>
        </div>
        <div className="full" style={{ order: 5 }}>
          {e.status === 'needs_info' && <DraftCard key={e.draft?.text} e={e} act={act} busy={busy} toast={toast} />}
          {e.status === 'waiting' && <WaitingCard key={e.pending.length} e={e} act={act} busy={busy} />}
          {e.status === 'ready' && <PriceCard e={e} act={act} busy={busy} business={business} />}
          {e.status === 'quoted' && <QuotedCard e={e} act={act} busy={busy} business={business} open={open} />}
          {e.status === 'won' && (
            <section className="card pad" id="act">
              <h2>Job booked</h2>
              <div className="btnrow" style={{ marginTop: 16 }}>
                {e.jobRef && <Link className="btn btn-green" to={`/jobs/${e.jobRef}`}>Open job record</Link>}
                <a className="btn btn-ghost" href={pdfUrl(`/enquiries/${e.id}/quote.pdf`)} target="_blank" rel="noreferrer"><Icon name="doc" />Quote PDF</a>
              </div>
            </section>
          )}
          {e.status === 'lost' && (
            <section className="card pad" id="act">
              <h2>Why it was lost</h2>
              <p className="sent">{e.lostReason}</p>
              {e.customerReply?.text && <p className="muted" style={{ margin: '0 0 18px' }}>{who(e)} wrote: “{e.customerReply.text}”</p>}
              <button className="btn btn-ghost" onClick={() => open('reopen')}>Reopen enquiry</button>
            </section>
          )}
        </div>
        <section className="card pad notes full" style={{ order: 6 }}>
          <div className="sec-head" style={{ marginBottom: 10 }}><h2>Private notes</h2><span className="faint">{noteState}</span></div>
          <textarea className="notes-ta" defaultValue={e.notes} maxLength={2000} placeholder="Fixing details, site quirks, supplier lead times…" aria-label="Private notes"
            onChange={(ev) => { setNoteState('Saving…'); saveNote(ev.target.value); }} />
        </section>
      </div>

      {modal === 'lost' && <LostModal e={e} busy={busy === 'lost'} onClose={() => setModal(null)} submit={async (reason) => { setModal(null); await act('lost', 'lost', { reason }, () => ({ message: `${e.name} marked as lost.`, action: { label: 'Undo', onClick: () => act('reopen', 'reopen', {}, 'Undone. The enquiry is open again.') } })); }} />}
      {modal === 'answer' && (
        <TextModal title={`Reply to ${who(e)}`} icon="reply" label="Your reply" cta="Send reply" busy={busy === 'answer'} onClose={() => setModal(null)}
          initial={`Hi ${who(e)},\n\n\n\nThanks,\n${sig}`}
          submit={async (text) => { if (await act('answer', 'answer', { text }, (o) => sentMessage(`Reply sent to ${who(e)}.`, o))) setModal(null); }} />
      )}
      {modal === 'log' && (
        <TextModal title={`Add ${who(e)}’s reply`} icon="reply" label={`What ${who(e)} said`} cta="Save reply" busy={busy === 'log'} onClose={() => setModal(null)}
          submit={async (text) => { if (await act('log', 'customer-reply', { text }, 'Reply saved. Check-ins have stopped.')) setModal(null); }} />
      )}
    </>
  );
}
