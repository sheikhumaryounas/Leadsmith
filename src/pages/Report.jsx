import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useLoad } from '../lib/hooks.js';
import { gbp, fD, plural } from '../lib/format.js';
import { Icon } from '../lib/icons.jsx';
import { ErrorBox, ReportSkeleton } from '../components/ui.jsx';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Report() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const { data: w, error, loading, reload } = useLoad(() => api.get(`/report?offset=${offset}`), [offset]);
  if (!w) return loading ? <ReportSkeleton /> : <ErrorBox error={error} onRetry={reload} />;
  const to = new Date(new Date(w.to).getTime() - 86400000);
  const max = Math.max(1, ...w.days);
  const top = w.days.indexOf(max);
  const funnelMax = Math.max(1, w.funnel[0]);
  const head = w.won.count ? `${plural(w.won.count, 'job')} won, ${gbp(w.won.value)} of work booked.` : w.enquiries ? `${plural(w.enquiries, 'enquiry', 'enquiries')} came in.` : 'A quiet week.';
  return (
    <>
      <div className="ph-head">
        <div><div className="eyebrow">Week of {fD(w.from)} to {fD(to)}</div><h1>{head}</h1><p className="lede">{w.quotesSent ? `${plural(w.quotesSent, 'quote')} sent this week.` : 'No quotes went out this week.'}</p></div>
        <div className="weeknav">
          <button aria-label="Previous week" disabled={offset >= 52 || loading} onClick={() => setOffset(offset + 1)}><Icon name="back" /></button>
          <button aria-label="Next week" disabled={offset === 0 || loading} onClick={() => setOffset(offset - 1)}><Icon name="next" /></button>
        </div>
      </div>
      <div className="kpis">
        <div className="card kpi"><div className="k">Enquiries in</div><div className="v">{w.enquiries}</div><div className="s">{w.enquiriesWeekBefore} the week before</div></div>
        <div className="card kpi"><div className="k">Details chased</div><div className="v">{w.detailsChased}</div><div className="s">{w.customersReplied} customers replied</div></div>
        <div className="card kpi"><div className="k">Quotes sent</div><div className="v">{w.quotesSent}</div><div className="s">{w.avgDaysToQuote != null ? `${w.avgDaysToQuote} days to quote on average` : 'No quotes this week'}</div></div>
        <div className="card kpi"><div className="k">Win rate</div><div className="v">{w.winRate != null ? `${w.winRate}%` : '—'}</div><div className="s">{w.decided ? `${w.won.count} won of ${w.decided} decided` : 'Nothing decided this week'}</div></div>
        <div className="card kpi dark"><div className="k">Revenue won</div><div className="v">{gbp(w.won.value)}</div><div className="s">Deposits in: {gbp(w.won.deposits)}</div></div>
      </div>
      <div className="two">
        <section className="card pad">
          <h2>Where this week’s enquiries got to</h2>
          <div className="muted" style={{ marginTop: 4 }}>Of the {w.funnel[0]} that came in</div>
          <div className="funnel">
            {['Came in', 'All details in', 'Quoted', 'Won'].map((k, i) => (
              <div key={k}>
                <div className="row"><span>{k}</span><span>{w.funnel[i]} <em>({Math.round((w.funnel[i] / funnelMax) * 100)}%)</em></span></div>
                <div className="track"><i className={i === 3 ? 'acc' : ''} style={{ width: `${(w.funnel[i] / funnelMax) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
        <section className="card pad">
          <h2>New enquiries per day</h2>
          <div className="muted" style={{ marginTop: 4 }}>{w.enquiries ? `Busiest day: ${DAYS[top]}` : 'None this week'}</div>
          <div className="bars">{w.days.map((c, i) => <div key={DAYS[i]} className={`bar ${i === top && c ? 'hi' : ''}`}><b>{c}</b><i style={{ height: `${Math.max(4, Math.round((c / max) * 130))}px` }} /></div>)}</div>
          <div className="barl">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
        </section>
        <section className="card pad">
          <h2>How they came in</h2>
          <div style={{ marginTop: 12 }}>
            {Object.keys(w.sources).length ? Object.entries(w.sources).map(([k, n]) => <div className="listrow" key={k}><span>{k}</span><span>{n}</span></div>) : <p className="muted">No enquiries this week.</p>}
          </div>
        </section>
        <section className="card pad">
          <h2>Keep it moving</h2>
          <p style={{ fontSize: 14, margin: '12px 0 16px' }}>See what is waiting on an answer right now.</p>
          <button className="link" onClick={() => navigate('/quotes')}>See open quotes</button>
        </section>
      </div>
    </>
  );
}
