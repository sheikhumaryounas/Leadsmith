import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useLoad } from '../lib/hooks.js';
import { gbp, kf, fD, fLong, enqs, plural } from '../lib/format.js';
import { PIPE_COLOURS, todoTitle } from '../lib/status.js';
import { Icon } from '../lib/icons.jsx';
import { Avatar, ErrorBox, CountUp, DashboardSkeleton } from '../components/ui.jsx';

function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function PipelineStrip({ d, onPick }) {
  const { you, wait, sent, total } = d.pipeline;
  const parts = [['you', 'Needs you', you], ['wait', 'Waiting on customer', wait], ['sent', 'Quote sent', sent]].filter(([, , v]) => v.value > 0);
  const cols = [
    ['you', 'Needs you', you.value, plural(you.count, 'enquiry', 'enquiries')],
    ['wait', 'Waiting', wait.value, `${wait.count} with customers`],
    ['sent', 'Quote sent', sent.value, `${plural(sent.count, 'quote')} out`],
    ['won', 'Won', d.won.value, `${plural(d.won.count, 'job')} booked`],
  ];
  return (
    <div className="pipe">
      <div className="pipe-bar" role="img" aria-label={`Open work: needs you ${gbp(you.value)}, waiting ${gbp(wait.value)}, quote sent ${gbp(sent.value)}`}>
        {parts.map(([k, label, v]) => (
          <span key={k} style={{ flex: `${v.value} 1 0`, background: PIPE_COLOURS[k] }} title={`${label}: ${gbp(v.value)} · ${Math.round((v.value / total) * 100)}%`} />
        ))}
      </div>
      <div className="pipe-cols">
        {cols.map(([k, label, value, meta]) => (
          <button key={k} className={k === 'won' ? 'won' : ''} onClick={() => onPick(k)}>
            <span className="pl"><i style={{ background: PIPE_COLOURS[k] }} />{label}</span>
            <span className="pv"><CountUp value={value} /></span>
            <span className="pm">{meta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function WeeklyChart({ weekly }) {
  const max = Math.max(1, ...weekly.map((w) => w.value));
  const step = niceStep(max / 3);
  const top = Math.ceil(max / step) * step;
  const best = weekly.reduce((b, w) => (w.value > b.value ? w : b), weekly[0]);
  const ticks = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  return (
    <>
      <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Last 8 weeks.{best.value ? ` Best week was ${fD(best.weekOf)}: ${gbp(best.value)}.` : ''}</div>
      <div className="plot" role="img" aria-label={`Column chart of work won each week for the last 8 weeks.${best.value ? ` Best week ${fD(best.weekOf)}, ${gbp(best.value)}.` : ''}`}>
        {ticks.map((t) => <div key={t} className={`gl ${t ? '' : 'base'}`} style={{ bottom: `${(t / top) * 100}%` }}><span>{kf(t)}</span></div>)}
        <div className="cols">
          {weekly.map((w) => {
            const h = (w.value / top) * 100;
            const hi = w === best && w.value > 0;
            return (
              <div key={w.weekOf} className={`cbar ${hi ? 'best' : ''} ${w.value ? '' : 'zero'}`} tabIndex={0} title={`Week of ${fD(w.weekOf)}${w.current ? ' (so far)' : ''}: ${w.value ? `${gbp(w.value)} won · ${plural(w.jobs, 'job')}` : 'nothing won'}`}>
                {hi && <b style={{ bottom: `calc(${h}% + 6px)` }}>{kf(w.value)}</b>}
                <i style={{ height: `${h}%` }} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="colx">{weekly.map((w) => <span key={w.weekOf} className={w.current ? 'cur' : ''}>{w.current ? 'This week' : fD(w.weekOf)}</span>)}</div>
      <details className="tv">
        <summary>Show as table</summary>
        <table><thead><tr><th>Week of</th><th className="r">Work won</th></tr></thead>
          <tbody>{weekly.map((w) => <tr key={w.weekOf}><td>{fD(w.weekOf)}{w.current ? ' (so far)' : ''}</td><td className="r mono">{gbp(w.value)}</td></tr>)}</tbody>
        </table>
      </details>
    </>
  );
}

const why = (j) => (j.deposit && !j.depositPaidAt ? 'Deposit, not paid yet' : j.fittedAt ? `Balance, fitted ${fD(j.fittedAt)}` : 'Balance, after fitting');

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: d, error, loading, reload } = useLoad(() => api.get('/dashboard'));
  if (!d) return loading ? <DashboardSkeleton /> : <ErrorBox error={error} onRetry={reload} />;
  const need = d.needsYou;
  return (
    <>
      <div className="ph-head">
        <div><div className="eyebrow">{fLong()}</div><h1>Dashboard</h1></div>
        <button className="btn btn-accent btn-lg" onClick={() => navigate('/today')}>
          {need.length ? `See the ${plural(need.length, 'thing')} that need${need.length === 1 ? 's' : ''} you` : 'Open Today'}
        </button>
      </div>
      <div className="dash">
        <section className="hero">
          <div className="hero-tx">
            <div className="label">Work in the pipeline</div>
            <div className="num"><CountUp value={d.pipeline.total} /></div>
            <p>From {enqs(d.pipeline.openCount)} that {d.pipeline.openCount === 1 ? 'is' : 'are'} still open.</p>
            <PipelineStrip d={d} onPick={(k) => navigate(k === 'won' ? '/jobs' : `/enquiries?filter=${k}`)} />
          </div>
        </section>
        <div className="tiles">
          <button className="card tile" onClick={() => navigate('/quotes')}><span className="t-ic t-blue"><Icon name="doc" /></span><span className="l">Quotes sent</span><span className="v"><CountUp value={d.quotesOut.value} /></span><span className="s">{plural(d.quotesOut.count, 'customer')} still deciding</span></button>
          <button className="card tile" onClick={() => navigate('/jobs')}><span className="t-ic t-green"><Icon name="wrench" /></span><span className="l">Work booked</span><span className="v"><CountUp value={d.won.value} /></span><span className="s">{plural(d.won.count, 'job')} won</span></button>
          <button className="card tile" onClick={() => navigate('/jobs')}><span className="t-ic t-amber"><Icon name="coin" /></span><span className="l">Still to collect</span><span className="v"><CountUp value={d.toCollect.value} /></span><span className="s">From {plural(d.toCollect.jobs.length, 'job')}</span></button>
        </div>
        <div className="dash-row">
          <section className="card pad dash-main">
            <div className="ch"><h2>Needs you today</h2><button className="link" onClick={() => navigate('/today')}>Open Today</button></div>
            {need.length ? (
              <ul className="todo">
                {need.map((e) => (
                  <li key={e.id}><button onClick={() => navigate(`/enquiries/${e.id}`)}><Avatar name={e.name} size="sm" /><span><b>{todoTitle(e)}</b><small>{e.job}</small></span></button></li>
                ))}
              </ul>
            ) : <div className="clear" style={{ marginTop: 14 }}><Icon name="check" />Nothing needs you. Leadsmith is chasing the rest.</div>}
          </section>
          <section className="card pad dash-side">
            <h2>Money to collect</h2>
            {d.toCollect.jobs.length ? (
              <>
                <ul className="cash">
                  {d.toCollect.jobs.map((j) => (
                    <li key={j.id}><button onClick={() => navigate(`/jobs/${j.id}`)}><Avatar name={j.customer} size="sm" /><span><b>{j.customer}</b><small>{why(j)}</small></span><span className="amt">{gbp(j.due)}</span></button></li>
                  ))}
                </ul>
                <div className="cash-tot"><span>Total</span><span><CountUp value={d.toCollect.value} /></span></div>
              </>
            ) : <div className="clear" style={{ marginTop: 14 }}><Icon name="check" />Everything is paid.</div>}
          </section>
        </div>
        <section className="card pad">
          <div className="ch"><h2>Work won each week</h2><button className="link" onClick={() => navigate('/report')}>Weekly report</button></div>
          <WeeklyChart weekly={d.weekly} />
        </section>
      </div>
    </>
  );
}
