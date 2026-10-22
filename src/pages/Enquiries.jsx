import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useLoad, useStored } from '../lib/hooks.js';
import { gbp } from '../lib/format.js';
import { Icon } from '../lib/icons.jsx';
import { ErrorBox, ListSkeleton } from '../components/ui.jsx';
import { EnquiryTable, EnquiryBoard, FilterChips, FILTERS, matches } from '../components/EnquiryTable.jsx';
import { Search } from './Today.jsx';

export default function Enquiries() {
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.some((f) => f[0] === params.get('filter')) ? params.get('filter') : 'all';
  const [q, setQ] = useState('');
  const [mode, setMode] = useStored('leadsmith-enquiries-mode', 'list');
  const { data, error, loading, reload } = useLoad(() => api.get('/enquiries'));
  if (!data) return loading ? <ListSkeleton /> : <ErrorBox error={error} onRetry={reload} />;
  const list = data.enquiries;
  const rows = list.filter(FILTERS.find((f) => f[0] === filter)[2]).filter((e) => matches(e, q));
  const need = list.filter((e) => e.stage === 'you').length;
  const waiting = list.filter((e) => e.stage === 'wait').length;
  const out = list.filter((e) => e.status === 'quoted').reduce((a, e) => a + (e.quote?.price || 0), 0);
  return (
    <>
      <div className="ph-head">
        <div><h1>All enquiries</h1><p className="lede"><b>{need}</b> need you · <b>{waiting}</b> waiting on customers · <b>{gbp(out)}</b> in quotes out</p></div>
        <div className="seg" role="group" aria-label="Layout">
          <button aria-pressed={mode === 'list'} onClick={() => setMode('list')}><Icon name="list" />List</button>
          <button aria-pressed={mode === 'board'} onClick={() => setMode('board')}><Icon name="board" />Pipeline</button>
        </div>
      </div>
      <div className="toolbar"><Search value={q} onChange={setQ} /></div>
      <section className="sec" style={{ marginTop: 24 }}>
        {mode === 'list' ? (
          <>
            <FilterChips list={list} value={filter} onChange={(f) => setParams(f === 'all' ? {} : { filter: f })} />
            <EnquiryTable rows={rows} showCame />
          </>
        ) : <EnquiryBoard rows={list.filter((e) => matches(e, q))} />}
      </section>
    </>
  );
}
