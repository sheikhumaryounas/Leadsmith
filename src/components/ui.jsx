import { useEffect, useRef } from 'react';
import { Icon } from '../lib/icons.jsx';
import { initials, gbp } from '../lib/format.js';
import { useCountUp } from '../lib/hooks.js';
import { STAGES } from '../lib/status.js';

const AV = [['#fbe9df', '#9a3b10'], ['#e4ecf6', '#24477a'], ['#e2f0e7', '#1a5c38'], ['#f6edd5', '#6e4f0b'], ['#efe7f4', '#5b3a78'], ['#f0ede7', '#4a4d52']];

// The same name always gets the same colour.
export function Avatar({ name, size = '' }) {
  let h = 0;
  for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [bg, fg] = AV[h % AV.length];
  return <span className={`avatar ${size}`} style={{ background: bg, color: fg }} aria-hidden="true">{initials(name)}</span>;
}

export const StagePill = ({ stage }) => {
  const [cls, label] = STAGES[stage] || STAGES.wait;
  return <span className={`pill ${cls}`}>{label}</span>;
};

export function Confidence({ c }) {
  if (!c) return <span className="cf none" title="Lost">—</span>;
  if (c.band === 'client') return <span className="cf client"><Icon name="check" />Client</span>;
  return <span className={`cf ${c.band}`} title="How likely this is to become a paying customer"><i />{c.n}</span>;
}

export function Modal({ title, icon, onClose, children, footer, narrow = true, tools }) {
  const box = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const el = box.current?.querySelector('input, textarea, select, button.btn-accent, [data-close]');
    el?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (prev?.isConnected) prev.focus();
    };
  }, [onClose]);
  return (
    <div className="modal">
      <div className="modal-bg" onClick={onClose} />
      <div className={`modal-box ${narrow ? 'narrow' : ''}`} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} ref={box}>
        <div className="modal-bar">
          <span className="mt">{icon && <Icon name={icon} />}{title}</span>
          <div className="btnrow">{tools}<button className="btn btn-accent btn-sm" data-close onClick={onClose}>Close</button></div>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Loading({ label = 'Loading…' }) {
  return <div className="loading" role="status"><span className="spinner" aria-hidden="true" />{label}</div>;
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="card empty">
      <b>That didn’t load</b>
      {error?.message}
      {onRetry && <div style={{ marginTop: 14 }}><button className="btn btn-ghost" onClick={onRetry}>Try again</button></div>}
    </div>
  );
}

export const EmptyArt = () => (
  <svg className="empty-art" viewBox="0 0 72 72" aria-hidden="true">
    <circle cx="36" cy="36" r="34" fill="#e2f0e7" />
    <circle cx="36" cy="36" r="24" fill="#fff" />
    <path d="m26 37 7 7 14-15" fill="none" stroke="#1f6b42" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function Switch({ on, onChange, label, disabled }) {
  return <button type="button" className="switch" role="switch" aria-checked={!!on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} />;
}

export function Seg({ value, options, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

// A number that counts up when it first appears. Screen readers get the final value only.
export function CountUp({ value, format = gbp }) {
  const v = useCountUp(value || 0);
  return (
    <>
      <span aria-hidden="true">{format(v)}</span>
      <span className="sr-only">{format(value || 0)}</span>
    </>
  );
}

// Grey placeholders in the shape of the page while it loads.
export const Sk = ({ w = '100%', h = 14, r = 6, dark, style }) => (
  <span className={`sk ${dark ? 'dark' : ''}`} style={{ width: w, height: h, borderRadius: r, ...style }} />
);

const Busy = ({ children }) => (
  <div className="skeleton" role="status" aria-busy="true" aria-label="Loading">{children}</div>
);

const HeadSk = ({ eyebrow = true }) => (
  <div className="ph-head"><div style={{ width: 'min(420px,100%)' }}>{eyebrow && <Sk w={140} h={12} />}<Sk w="70%" h={30} r={8} style={{ marginTop: 10 }} /></div><Sk w={200} h={44} r={8} /></div>
);

const RowsSk = ({ rows = 6 }) => (
  <div className="tbl-wrap sk-table">
    <div className="sk-head" />
    {Array.from({ length: rows }, (_, i) => (
      <div className="sk-row" key={i}>
        <Sk w={32} h={32} r={16} />
        <div style={{ flex: '1 1 220px' }}><Sk w="55%" h={13} /><Sk w="35%" h={11} style={{ marginTop: 7 }} /></div>
        <Sk w={110} h={22} r={11} />
        <Sk w={150} h={13} />
        <Sk w={70} h={13} style={{ marginLeft: 'auto' }} />
      </div>
    ))}
  </div>
);

export function DashboardSkeleton() {
  return (
    <Busy>
      <HeadSk />
      <div className="dash">
        <div className="hero"><Sk dark w={150} h={13} /><Sk dark w={260} h={52} r={8} style={{ marginTop: 14 }} /><Sk dark w={220} h={13} style={{ marginTop: 14 }} /><Sk dark w="min(620px,100%)" h={6} r={3} style={{ marginTop: 28 }} /></div>
        <div className="tiles">{[0, 1, 2].map((i) => <div className="card tile" key={i}><Sk w={36} h={36} r={9} /><Sk w={90} h={13} style={{ marginTop: 14 }} /><Sk w={120} h={24} style={{ marginTop: 8 }} /></div>)}</div>
        <div className="dash-row">
          <div className="card pad dash-main">{[0, 1, 2, 3].map((i) => <div className="sk-line" key={i}><Sk w={32} h={32} r={16} /><div style={{ flex: 1 }}><Sk w="60%" h={13} /><Sk w="30%" h={11} style={{ marginTop: 7 }} /></div></div>)}</div>
          <div className="card pad dash-side">{[0, 1, 2].map((i) => <div className="sk-line" key={i}><Sk w={32} h={32} r={16} /><div style={{ flex: 1 }}><Sk w="50%" h={13} /></div><Sk w={60} h={13} /></div>)}</div>
        </div>
        <div className="card pad"><Sk w={180} h={16} /><div className="sk-bars">{[30, 55, 38, 18, 44, 6, 86, 6].map((h, i) => <Sk key={i} w={24} h={`${h}%`} r={4} />)}</div></div>
      </div>
    </Busy>
  );
}

export function ListSkeleton({ stats = 0, rows = 6 }) {
  return (
    <Busy>
      <HeadSk eyebrow={false} />
      {stats > 0 && <div className="stats">{Array.from({ length: stats }, (_, i) => <div className="card stat" key={i}><Sk w={110} h={12} /><Sk w={90} h={22} style={{ marginTop: 8 }} /></div>)}</div>}
      <div className="chips" style={{ marginTop: 24 }}>{[60, 90, 70, 90, 100].map((w, i) => <Sk key={i} w={w} h={40} r={8} />)}</div>
      <RowsSk rows={rows} />
    </Busy>
  );
}

export function DetailSkeleton() {
  return (
    <Busy>
      <Sk w={110} h={13} />
      <HeadSk eyebrow={false} />
      <Sk h={64} r={10} style={{ marginTop: 20 }} />
      <Sk h={150} r={12} style={{ marginTop: 16 }} />
      <div className="dgrid" style={{ marginTop: 22 }}>
        {[0, 1, 2, 3].map((i) => <div className="card pad" key={i}><Sk w={180} h={16} /><Sk h={12} style={{ marginTop: 16 }} /><Sk w="80%" h={12} style={{ marginTop: 10 }} /><Sk w="60%" h={12} style={{ marginTop: 10 }} /></div>)}
      </div>
    </Busy>
  );
}

export function ReportSkeleton() {
  return (
    <Busy>
      <HeadSk />
      <div className="kpis">{[0, 1, 2, 3, 4].map((i) => <div className="card kpi" key={i}><Sk w={90} h={12} /><Sk w={70} h={26} style={{ marginTop: 10 }} /><Sk w={110} h={11} style={{ marginTop: 10 }} /></div>)}</div>
      <div className="two">{[0, 1].map((i) => <div className="card pad" key={i}><Sk w={200} h={16} /><Sk h={120} r={8} style={{ marginTop: 18 }} /></div>)}</div>
    </Busy>
  );
}
