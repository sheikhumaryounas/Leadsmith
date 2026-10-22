import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useLoad } from '../lib/hooks.js';
import { useApp } from '../lib/app-context.jsx';
import { fLong, first, greeting } from '../lib/format.js';
import { needMessage } from '../lib/status.js';
import { Icon } from '../lib/icons.jsx';
import { Avatar, ErrorBox, EmptyArt, ListSkeleton } from '../components/ui.jsx';
import { EnquiryTable, FilterChips, FILTERS, matches } from '../components/EnquiryTable.jsx';

export function Search({ value, onChange }) {
  return (
    <label className="search">
      <Icon name="search" />
      <input type="search" placeholder="Search by name, job or town" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Search enquiries" />
    </label>
  );
}

const WORDS = ['Nothing needs', 'One thing needs', '2 things need', '3 things need', '4 things need', '5 things need', '6 things need'];
const BTN = { needs_info: ['Review reply', 'btn-accent'], ready: ['Add price', 'btn-accent'], quoted: ['Read message', 'btn-ghost'] };

export default function Today() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const { data, error, loading, reload } = useLoad(() => api.get('/enquiries'));
  if (!data) return loading ? <ListSkeleton /> : <ErrorBox error={error} onRetry={reload} />;
  const list = data.enquiries;
  const need = list.filter((e) => e.stage === 'you');
  const fn = FILTERS.find((f) => f[0] === filter)[2];
  return (
    <>
      <div className="ph-head">
        <div><div className="eyebrow">{fLong()}</div><h1>{greeting()}, {first(user.name)}. {WORDS[need.length] || `${need.length} things need`} you.</h1></div>
        <Search value={q} onChange={setQ} />
      </div>
      <section className="sec">
        <h2>Needs you</h2>
        {need.length ? (
          <div className="card needs">
            {need.map((e) => {
              const [label, cls] = BTN[e.status];
              return (
                <article className="need" key={e.id}>
                  <Avatar name={e.name} />
                  <div className="tx"><b>{e.name} <span>· {e.job}</span></b><p>{needMessage(e)}</p></div>
                  <button className={`btn ${cls}`} onClick={() => navigate(`/enquiries/${e.id}`)}>{label}</button>
                </article>
              );
            })}
          </div>
        ) : <div className="card empty"><EmptyArt /><b>You’re all caught up</b>Leadsmith is chasing the rest.</div>}
        <p className="note">Nothing is sent to a customer until you approve it.</p>
      </section>
      <section className="card sec list-card">
        <div className="list-head"><h2>All enquiries</h2><FilterChips list={list} value={filter} onChange={setFilter} /></div>
        <EnquiryTable rows={list.filter(fn).filter((e) => matches(e, q))} />
      </section>
    </>
  );
}
