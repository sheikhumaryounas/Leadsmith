import { useNavigate } from 'react-router-dom';
import { api, pdfUrl } from '../lib/api.js';
import { useAction, useLoad } from '../lib/hooks.js';
import { useApp } from '../lib/app-context.jsx';
import { gbp, fD, fW } from '../lib/format.js';
import { nextShort, who } from '../lib/status.js';
import { Icon } from '../lib/icons.jsx';
import { Avatar, StagePill, Confidence, ErrorBox, ListSkeleton } from '../components/ui.jsx';

export function Quotes() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useLoad(() => api.get('/enquiries'));
  if (!data) return loading ? <ListSkeleton stats={3} /> : <ErrorBox error={error} onRetry={reload} />;
  const rows = data.enquiries.filter((e) => e.quote?.price && ['quoted', 'won', 'lost'].includes(e.status)).sort((a, b) => new Date(b.quote.sentAt) - new Date(a.quote.sentAt));
  const open = rows.filter((e) => e.status === 'quoted');
  const won = rows.filter((e) => e.status === 'won');
  const decided = rows.length - open.length;
  const sum = (xs) => xs.reduce((a, e) => a + e.quote.price, 0);
  return (
    <>
      <div className="ph-head">
        <div><h1>Quotes sent</h1><p className="lede">Every quote and where it stands.</p></div>
        <button className="btn btn-ghost" onClick={() => navigate('/follow-ups')}><Icon name="clock" />See follow-ups</button>
      </div>
      <div className="stats">
        <div className="card stat"><div className="l">Open quotes</div><div className="v">{gbp(sum(open))} <small>· {open.length}</small></div></div>
        <div className="card stat"><div className="l">Won</div><div className="v" style={{ color: 'var(--green-ink)' }}>{gbp(sum(won))} <small>· {won.length}</small></div></div>
        <div className="card stat"><div className="l">Win rate, decided quotes</div><div className="v">{decided ? Math.round((won.length / decided) * 100) : 0}%</div></div>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Customer</th><th>Quote</th><th className="r">Value</th><th>Status</th><th>Follow-ups</th><th>Confidence</th><th /></tr></thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} data-go tabIndex={0} onClick={() => navigate(`/enquiries/${e.id}`)} onKeyDown={(ev) => ev.key === 'Enter' && navigate(`/enquiries/${e.id}`)}>
                <td><div className="who-cell"><Avatar name={e.name} size="sm" /><div><span className="nm">{e.name}</span><span className="sub">{e.job}</span></div></div></td>
                <td><span className="mono">{e.quote.ref}</span><span className="sub">sent {fD(e.quote.sentAt)}</span></td>
                <td className="r"><span className="val">{gbp(e.quote.price)}</span></td>
                <td><StagePill stage={e.stage} /></td>
                <td className="muted">{e.status === 'quoted' ? nextShort(e) : `${e.followUps.sent} sent`}</td>
                <td><Confidence c={e.confidence} /></td>
                <td className="r"><a className="btn btn-ghost btn-sm" href={pdfUrl(`/enquiries/${e.id}/quote.pdf`)} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}><Icon name="doc" />PDF</a></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="empty"><b>No quotes yet</b>When you send a quote it shows up here.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function FollowUps() {
  const navigate = useNavigate();
  const { business, toast, hold, refreshCounts } = useApp();
  const { busy, run } = useAction(toast);
  const { data, error, loading, reload, setData } = useLoad(() => api.get('/enquiries'));
  if (!data) return loading ? <ListSkeleton stats={3} /> : <ErrorBox error={error} onRetry={reload} />;
  const days = business.settings.followUpDays;
  const rows = data.enquiries.filter((e) => e.status === 'quoted');
  const due = rows.filter((e) => e.followUps.nextAt && !e.followUps.paused && !e.customerReply?.text).sort((a, b) => new Date(a.followUps.nextAt) - new Date(b.followUps.nextAt))[0];
  const act = async (e, path, ok) => {
    const out = await run(`${e.id}${path}`, async () => {
      if (path === 'followups/send' && !(await hold(`Sending the check-in to ${who(e)}…`))) return null;
      return api.post(`/enquiries/${e.id}/${path}`);
    }, ok);
    if (out) { setData((d) => ({ enquiries: d.enquiries.map((x) => (x.id === e.id ? out.enquiry : x)) })); refreshCounts(); }
  };
  return (
    <>
      <h1>Follow-ups</h1>
      <p className="lede">Check-ins go out on day {days.join(', ').replace(/, (\d+)$/, ' and $1')} after a quote, and stop as soon as the customer replies.</p>
      <div className="stats">
        <div className="card stat"><div className="l">Quotes being chased</div><div className="v">{rows.length}</div></div>
        <div className="card stat"><div className="l">Value in play</div><div className="v">{gbp(rows.reduce((a, e) => a + e.quote.price, 0))}</div></div>
        <div className="card stat"><div className="l">Next to go out</div><div className="v">{due ? <>{who(due)} <small>· {fW(due.followUps.nextAt)}</small></> : <small>Nothing scheduled</small>}</div></div>
      </div>
      <div className="card">
        {rows.length ? rows.map((e) => {
          const stopped = e.customerReply?.text || e.followUps.paused;
          return (
            <div className="furow" key={e.id}>
              <button className="whob" onClick={() => navigate(`/enquiries/${e.id}`)}><b>{e.name}</b><span>{e.job} · {gbp(e.quote.price)} · quoted {fD(e.quote.sentAt)}</span></button>
              <div className="dots" aria-label="Follow-up progress">
                {days.map((d, i) => <span key={d} className={`d ${i < e.followUps.sent ? 'done' : i === e.followUps.sent && !stopped ? 'next' : ''}`}><i />Day {d}</span>)}
              </div>
              <Confidence c={e.confidence} />
              <div className="btnrow">
                {e.customerReply?.text && !e.customerReply.answered && <button className="btn btn-accent btn-sm" onClick={() => navigate(`/enquiries/${e.id}`)}>Read reply</button>}
                {e.followUps.sent < days.length && !e.customerReply?.text && (
                  <button className="btn btn-ghost btn-sm" disabled={busy === `${e.id}followups/${e.followUps.paused ? 'resume' : 'pause'}`} onClick={() => { const was = e.followUps.paused; act(e, `followups/${was ? 'resume' : 'pause'}`, () => ({ message: was ? `Check-ins resumed for ${who(e)}.` : `Check-ins paused for ${who(e)}.`, action: { label: 'Undo', onClick: () => act({ ...e, followUps: { ...e.followUps, paused: !was } }, `followups/${was ? 'pause' : 'resume'}`, 'Undone.') } })); }}>
                    <Icon name={e.followUps.paused ? 'play' : 'pause'} />{e.followUps.paused ? 'Resume' : 'Pause'}
                  </button>
                )}
                {e.followUps.sent < days.length && !stopped && <button className="btn btn-ghost btn-sm" disabled={busy === `${e.id}followups/send`} onClick={() => act(e, 'followups/send', `Check-in sent to ${who(e)}.`)}><Icon name="send" />Send now</button>}
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/enquiries/${e.id}`)}>Open</button>
              </div>
              <div className="msg">
                {e.customerReply?.text
                  ? e.customerReply.answered ? `You answered ${who(e)}. Waiting for them to confirm.` : `${who(e)} replied: “${e.customerReply.text}” Check-ins stopped.`
                  : e.followUps.sent >= days.length ? 'All check-ins sent. Waiting for their decision.'
                  : e.followUps.paused ? 'Paused.' : `Next: day ${days[e.followUps.sent]} (${fW(e.followUps.nextAt)}).`}
              </div>
            </div>
          );
        }) : <div className="empty"><b>No follow-ups running</b>When you send a quote, its check-ins show up here.</div>}
      </div>
    </>
  );
}
