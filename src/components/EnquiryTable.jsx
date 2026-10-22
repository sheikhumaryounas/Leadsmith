import { useNavigate } from 'react-router-dom';
import { Avatar, StagePill, Confidence } from './ui.jsx';
import { gbp, fRel } from '../lib/format.js';
import { nextShort, STATUS_LABEL } from '../lib/status.js';

export const FILTERS = [
  ['all', 'All', () => true],
  ['you', 'Needs you', (e) => e.stage === 'you'],
  ['wait', 'Waiting', (e) => e.stage === 'wait'],
  ['sent', 'Quote sent', (e) => e.stage === 'sent'],
  ['closed', 'Won or lost', (e) => e.status === 'won' || e.status === 'lost'],
];

export const matches = (e, q) => {
  const s = q.trim().toLowerCase();
  return !s || `${e.name} ${e.job} ${e.town} ${e.postcode} ${e.message}`.toLowerCase().includes(s);
};

export function FilterChips({ list, value, onChange }) {
  return (
    <div className="chips" role="group" aria-label="Filter enquiries">
      {FILTERS.map(([k, label, fn]) => (
        <button key={k} className="chip" aria-pressed={value === k} onClick={() => onChange(k)}>
          {label} <span>{list.filter(fn).length}</span>
        </button>
      ))}
    </div>
  );
}

export function EnquiryTable({ rows, showCame = false }) {
  const navigate = useNavigate();
  const open = (e) => navigate(`/enquiries/${e.id}`);
  return (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr><th>Customer</th><th>Status</th><th>Next step</th>{showCame && <th>Came in</th>}<th className="r">Value</th></tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} data-go tabIndex={0} onClick={() => open(e)} onKeyDown={(ev) => ev.key === 'Enter' && open(e)}>
              <td>
                <div className="who-cell">
                  <Avatar name={e.name} size="sm" />
                  <div><span className="nm">{e.name}</span><span className="sub">{e.job}{e.town ? ` · ${e.town}` : ''}</span></div>
                </div>
              </td>
              <td><StagePill stage={e.stage} /></td>
              <td className="muted">{nextShort(e)}</td>
              {showCame && <td>{fRel(e.createdAt)}<span className="sub">{e.channel}</span></td>}
              <td className="r"><span className="val">{gbp(e.value)}</span>{!e.quote?.price && <span className="sub">estimate</span>}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={showCame ? 5 : 4} className="empty"><b>No enquiries here</b>Try another filter or clear the search.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const BOARD = [['needs_info', 'Needs your OK'], ['waiting', 'Waiting on customer'], ['ready', 'Ready to price'], ['quoted', 'Quote sent'], ['won', 'Won']];

export function EnquiryBoard({ rows }) {
  const navigate = useNavigate();
  return (
    <div className="board-wrap">
      <div className="board">
        {BOARD.map(([status, label]) => {
          const xs = rows.filter((e) => e.status === status);
          return (
            <div className="col" key={status}>
              <div className="col-head"><span>{label}</span><span>{xs.length}</span></div>
              {xs.map((e) => (
                <button key={e.id} className="kcard" onClick={() => navigate(`/enquiries/${e.id}`)}>
                  <span className="n">{e.name}</span>
                  <span className="j">{e.job}{e.town ? ` · ${e.town}` : ''}</span>
                  <span className="f"><Confidence c={e.confidence} /><span className={`val ${e.quote?.price ? '' : 'est'}`}>{e.quote?.price ? '' : '~'}{gbp(e.value)}</span></span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { STATUS_LABEL };
