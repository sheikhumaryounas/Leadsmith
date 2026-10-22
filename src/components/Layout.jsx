import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/app-context.jsx';
import { useStored } from '../lib/hooks.js';
import { NewEnquiryModal } from './NewEnquiryModal.jsx';
import { Modal } from './ui.jsx';

const NAV = [
  ['Work', [['/', 'Dashboard', 'grid', null, true], ['/today', 'Today', 'cal', 'needsYou'], ['/enquiries', 'All enquiries', 'inbox', 'enquiries']]],
  ['Money', [['/quotes', 'Quotes', 'doc', 'quotes'], ['/jobs', 'Jobs', 'wrench', 'jobsOpen']]],
];
const WORKSHOP_NAV = [['Workshop', [['/jobs', 'Jobs', 'wrench', null]]]];
const KEYS = [['Dashboard', '0'], ['Today', '1'], ['All enquiries', '2'], ['Follow-ups', '3'], ['Quotes', '4'], ['Jobs', '5'], ['Weekly report', '6'], ['Settings', ','], ['Hide or show sidebar', '['], ['Add enquiry', 'N'], ['Shortcuts', '?'], ['Close', 'Esc']];
const ROUTES = { 0: '/', 1: '/today', 2: '/enquiries', 3: '/follow-ups', 4: '/quotes', 5: '/jobs', 6: '/report' };

function NavItem({ to, label, icon, count, hot, end }) {
  return (
    <NavLink to={to} end={end} className="nav-btn" title={label} aria-label={hot && count ? `${label}, ${count} need you` : label}>
      <Icon name={icon} />
      <span className="txt">{label}</span>
      {count ? <span className={`count ${hot ? 'hot' : ''}`}>{count}</span> : null}
      {hot && count ? <span className="dot" /> : null}
    </NavLink>
  );
}

export function Layout() {
  const { user, business, counts, refreshCounts, signOut } = useApp();
  const [mini, setMini] = useStored('leadsmith-sidebar-mini', false);
  const [adding, setAdding] = useState(false);
  const [keys, setKeys] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const office = user.role !== 'jobsheets';

  useEffect(() => { refreshCounts(); window.scrollTo(0, 0); }, [location.pathname, refreshCounts]);

  const onKey = useCallback((e) => {
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (typing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('.modal')) return;
    if (e.key === '[') setMini(!mini);
    else if (e.key === '?') setKeys(true);
    else if (!office) return;
    else if (ROUTES[e.key]) navigate(ROUTES[e.key]);
    else if (e.key === ',') navigate('/settings');
    else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setAdding(true); }
  }, [mini, setMini, navigate, office]);
  useEffect(() => {
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onKey]);

  const hot = { needsYou: true };
  return (
    <div className={`app ${mini ? 'mini' : ''}`}>
      <aside className="side" aria-label="Sidebar">
        <div className="side-head">
          <div className="brand">
            <i><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2.5 7h14.2c.4 2.2 2.1 3.6 4.8 3.8v1.7c-2.7.2-4.3 1.3-4.6 3.5H7.4c-.2-1.9-1.6-3.1-4-3.6z" /><path d="M8.4 17.2h7.2l1.6 3.3H6.8z" /></svg></i>
            <div className="brand-txt"><b>{business.name}</b><small>Leadsmith</small></div>
          </div>
          <button className="collapse" onClick={() => setMini(!mini)} aria-label={mini ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!mini} title={mini ? 'Expand sidebar' : 'Collapse sidebar'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M9.5 4.5v15" />{mini ? <path d="m13.5 10 2 2-2 2" /> : <path d="m15.5 10-2 2 2 2" />}</svg>
          </button>
        </div>
        {office && (
          <button className="add-btn" onClick={() => setAdding(true)} aria-label="Add enquiry" title="Add enquiry">
            <Icon name="plus" /><span className="txt">Add enquiry</span>
          </button>
        )}
        <nav className="nav" aria-label="Main">
          {(office ? NAV : WORKSHOP_NAV).map(([group, items]) => (
            <div key={group} className="nav-group">
              <div className="nav-label">{group}</div>
              <div className="nav-sep" role="separator" />
              {items.map(([to, label, icon, key, end]) => (
                <NavItem key={to} to={to} label={label} icon={icon} end={end} count={key ? counts?.[key] : 0} hot={hot[key]} />
              ))}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          {office && <div className="nav"><NavItem to="/settings" label="Settings" icon="sliders" /></div>}
          <div className="who">
            <div className="av">{user.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</div>
            <div className="who-txt"><b>{user.name}</b><span>{user.email}</span></div>
            <button className="logout" onClick={signOut} title="Log out" aria-label="Log out"><Icon name="back" /></button>
          </div>
        </div>
      </aside>
      <main className="main"><div className="wrap"><Outlet context={{ openNew: () => setAdding(true) }} /></div></main>
      {adding && <NewEnquiryModal onClose={() => setAdding(false)} onCreated={(e) => { setAdding(false); refreshCounts(); navigate(`/enquiries/${e.id}`); }} />}
      {keys && (
        <Modal title="Keyboard shortcuts" icon="kbd" onClose={() => setKeys(false)}>
          <div className="keys">{KEYS.map(([l, k]) => <div key={l}><span>{l}</span><kbd>{k}</kbd></div>)}</div>
        </Modal>
      )}
    </div>
  );
}
