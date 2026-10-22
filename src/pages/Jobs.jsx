import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, pdfUrl } from '../lib/api.js';
import { useAction, useLoad, useDebounced } from '../lib/hooks.js';
import { useApp } from '../lib/app-context.jsx';
import { gbp, fD } from '../lib/format.js';
import { JOB_STATE, jobSub } from '../lib/status.js';
import { Icon } from '../lib/icons.jsx';
import { ErrorBox, ListSkeleton, DetailSkeleton } from '../components/ui.jsx';

export function Jobs() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const { data, error, loading, reload } = useLoad(() => api.get('/jobs'));
  if (!data) return loading ? <ListSkeleton stats={4} /> : <ErrorBox error={error} onRetry={reload} />;
  const jobs = data.jobs;
  const done = jobs.filter((j) => j.state === 'done').length;
  const rows = jobs.filter((j) => tab === 'all' || (tab === 'done' ? j.state === 'done' : j.state !== 'done'));
  const tabs = [['all', 'All', jobs.length], ['progress', 'In progress', jobs.length - done], ['done', 'Completed', done]];
  return (
    <>
      <h1>Jobs</h1>
      <p className="lede">Every won job, from deposit to fitted and paid.</p>
      <div className="stats s4">
        <div className="card stat"><div className="l">Jobs won</div><div className="v">{jobs.length}</div></div>
        <div className="card stat"><div className="l">Work booked</div><div className="v">{gbp(jobs.reduce((a, j) => a + j.price, 0))}</div></div>
        <div className="card stat"><div className="l">Still to collect</div><div className="v">{gbp(jobs.reduce((a, j) => a + j.due, 0))}</div></div>
        <div className="card stat dark"><div className="l">Completed</div><div className="v">{done} <small style={{ color: 'var(--side-ink-2)' }}>of {jobs.length}</small></div></div>
      </div>
      <div className="chips" role="group" aria-label="Filter jobs">
        {tabs.map(([k, l, n]) => <button key={k} className="chip" aria-pressed={tab === k} onClick={() => setTab(k)}>{l} <span>{n}</span></button>)}
      </div>
      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Job</th><th>Customer</th><th>Won</th><th>Progress</th><th className="r">Price</th><th>Invoice</th></tr></thead>
          <tbody>
            {rows.map((j) => {
              const s = JOB_STATE[j.state];
              return (
                <tr key={j.id} data-go tabIndex={0} onClick={() => navigate(`/jobs/${j.id}`)} onKeyDown={(ev) => ev.key === 'Enter' && navigate(`/jobs/${j.id}`)}>
                  <td><span className="nm">{j.title}</span><span className="sub mono">{j.number}</span></td>
                  <td>{j.customer}<span className="sub">{j.town} {j.postcode}</span></td>
                  <td>{fD(j.wonAt)}</td>
                  <td><span className={`pill ${s.cls}`}>{j.state === 'done' && <Icon name="check" />}{s.label}</span><span className="sub">{jobSub(j)}</span></td>
                  <td className="r"><span className="val">{gbp(j.price)}</span></td>
                  <td><a className="attach" href={pdfUrl(`/jobs/${j.id}/invoice.pdf`)} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}><Icon name="doc" />{j.invoiceNumber}.pdf</a></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={6} className="empty"><b>No jobs here</b>Won quotes become jobs automatically.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function JobDetail() {
  const { id } = useParams();
  const { user, toast, refreshCounts } = useApp();
  const office = user.role !== 'jobsheets';
  const { busy, run } = useAction(toast);
  const { data, error, loading, reload, setData } = useLoad(() => api.get(`/jobs/${id}`), [id]);
  const [saved, setSaved] = useState('');
  const save = useDebounced(async (patch) => {
    try { await api.patch(`/jobs/${id}`, patch); setSaved('Saved'); } catch (err) { setSaved(err.message); }
  });
  const j = data?.job;
  if (!j) return loading ? <DetailSkeleton /> : <ErrorBox error={error} onRetry={reload} />;
  const s = JOB_STATE[j.state];
  const steps = [['Won', fD(j.wonAt)], ['Deposit paid', j.deposit ? fD(j.depositPaidAt) : 'Not needed'], ['Fitted', fD(j.fittedAt)], ['Paid in full', fD(j.paidFullAt)]];
  const doneN = [true, !!(j.depositPaidAt || !j.deposit), !!j.fittedAt, !!j.paidFullAt];
  const cur = doneN.indexOf(false);
  const step = async (path, ok) => {
    const out = await run(path, () => api.post(`/jobs/${id}/${path}`), ok);
    if (out) { setData(out); refreshCounts(); }
  };
  const action = !office ? null
    : j.state === 'dep' ? <button className="btn btn-accent" disabled={!!busy} onClick={() => step('deposit-paid', `Deposit recorded for ${j.number}.`)}>Record deposit paid</button>
    : j.state === 'work' ? <button className="btn btn-accent" disabled={!!busy} onClick={() => step('fitted', `${j.number} marked as fitted. The balance invoice is ready.`)}>Mark as fitted</button>
    : j.state === 'fitted' ? <button className="btn btn-accent" disabled={!!busy} onClick={() => step('paid', `${j.number} is paid in full.`)}>Record balance paid</button>
    : <span className="pill p-paid"><Icon name="check" />Completed</span>;
  const share = async () => {
    const text = `${j.number} · ${j.title}\n${j.customer}, ${j.site}\n${j.specs.map((x) => `${x.k}: ${x.v}`).join('\n')}\nAccess: ${j.access || 'Not recorded'}`;
    try { await navigator.clipboard.writeText(text); toast('Job sheet copied. Paste it into WhatsApp or email.'); } catch { toast('Copy is blocked here.', 'error'); }
  };
  const field = (key, label, multiline) => (
    <label className="fl" style={{ marginTop: 12 }}>
      <span>{label}</span>
      {multiline
        ? <textarea defaultValue={j[key]} rows={3} maxLength={2000} disabled={!office} onChange={(ev) => { setSaved('Saving…'); save({ [key]: ev.target.value }); }} />
        : <input defaultValue={j[key]} maxLength={300} disabled={!office} onChange={(ev) => { setSaved('Saving…'); save({ [key]: ev.target.value }); }} />}
    </label>
  );
  return (
    <>
      <Link className="back" to="/jobs"><Icon name="back" />All jobs</Link>
      <div className="won-head">
        <div>
          <div className="btnrow"><span className="pill p-won"><Icon name="check" />Won {fD(j.wonAt)}</span><span className="mono muted">Job {j.number}</span>{office && j.enquiry && <Link className="link" style={{ fontSize: 13 }} to={`/enquiries/${j.enquiry}`}>View enquiry</Link>}</div>
          <h1 style={{ marginTop: 12 }}>{j.title}</h1>
          <div className="dsub">{j.customer} · {j.town} {j.postcode}</div>
        </div>
        <div className="btnrow">
          <button className="btn btn-line" onClick={share}><Icon name="share" />Share with workshop</button>
          <a className="btn btn-ghost" href={pdfUrl(`/jobs/${j.id}/invoice.pdf`)} target="_blank" rel="noreferrer"><Icon name="doc" />Invoice PDF</a>
        </div>
      </div>
      <section className="card jobprog">
        <div className="pc-top"><div><div className="label">Job progress</div><div className="pc-now"><b>{s.label}</b> <span>· {jobSub(j)}</span></div></div>{action}</div>
        <div className="stepper s4">
          {steps.map(([l, d], i) => (
            <div key={l} className={`step ${doneN[i] ? 'done' : i === cur ? 'cur' : ''}`}>
              <span className="dot">{doneN[i] ? <Icon name="check" /> : i + 1}</span>
              <div><b>{l}</b>{d ? <small>{d}</small> : i === cur ? <small>Next</small> : null}</div>
            </div>
          ))}
        </div>
      </section>
      <div className="dgrid jcols" style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
          <section className="card pad">
            <h2>What to build</h2>
            <div className="specs">{j.specs.map((x) => <div key={x.k}><span>{x.k}</span><b>{x.v}</b></div>)}</div>
            {!j.specs.length && <p className="muted">No specs recorded.</p>}
          </section>
          <section className="card pad notes">
            <div className="sec-head" style={{ marginBottom: 0 }}><h2>Internal notes</h2><span className="faint">{saved || 'Not shared with the customer'}</span></div>
            {field('note', 'Notes', true)}
          </section>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
          <section className="card pad">
            <h2>Price and payments</h2>
            <div className="pay"><span className="muted">Agreed price</span><span className="big">{gbp(j.price)}</span></div>
            {j.deposit > 0 && <div className="pay"><div><b>Deposit</b>{j.depositPaidAt ? <small className="ok">✓ Paid {fD(j.depositPaidAt)}</small> : <small>Invoiced, not paid yet</small>}</div><span className="mono">{gbp(j.deposit)}</span></div>}
            <div className="pay" style={{ border: 0 }}><div><b>{j.deposit ? 'Balance' : 'Full amount'}</b>{j.paidFullAt ? <small className="ok">✓ Paid {fD(j.paidFullAt)}</small> : <small>{j.fittedAt ? `Due now, fitted ${fD(j.fittedAt)}` : 'Due on fitting'}</small>}</div><span className="mono">{gbp(j.price - j.deposit)}</span></div>
          </section>
          <section className="card pad">
            <h2>Customer and site</h2>
            {field('phone', 'Phone')}
            {field('site', 'Site address')}
            {field('access', 'Access', true)}
          </section>
        </div>
      </div>
    </>
  );
}
