import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import { Icon } from './icons.jsx';

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

// How long "Undo" stays open before an email actually goes.
export const HOLD_MS = import.meta.env.MODE === 'test' ? 400 : 5000;

const Check = () => (
  <svg className="toast-check" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="m7.5 12.5 3 3 6-6.5" />
  </svg>
);

// Holds the signed-in user and business, the sidebar counts, and the toast.
export function AppProvider({ children }) {
  const [session, setSession] = useState({ user: null, business: null, ready: false });
  const [counts, setCounts] = useState(null);
  const [toastState, setToast] = useState(null);
  const timer = useRef();
  const holdRef = useRef(null);

  useEffect(() => {
    api.get('/auth/me')
      .then(({ user, business }) => setSession({ user, business, ready: true }))
      .catch(() => setSession({ user: null, business: null, ready: true }));
  }, []);

  // toast('Saved.') · toast('Failed', 'error') · toast('Lost.', { action: { label: 'Undo', onClick } })
  const toast = useCallback((message, opts = {}) => {
    const o = typeof opts === 'string' ? { kind: opts } : opts;
    const kind = o.kind || 'ok';
    clearTimeout(timer.current);
    setToast({ message, kind, action: o.action, ms: o.ms, id: Date.now() + Math.random() });
    if (kind !== 'pending') timer.current = setTimeout(() => setToast(null), o.action ? 7000 : kind === 'error' ? 5000 : 3400);
  }, []);

  // Shows "message · Undo" for a few seconds. Resolves true if it should go ahead, false if undone.
  const hold = useCallback((message, ms = HOLD_MS) => new Promise((resolve) => {
    if (holdRef.current) holdRef.current.finish(true);
    let done = false;
    const finish = (go) => {
      if (done) return;
      done = true;
      clearTimeout(t);
      holdRef.current = null;
      if (!go) toast('Cancelled. Nothing was sent.');
      resolve(go);
    };
    const t = setTimeout(() => finish(true), ms);
    holdRef.current = { finish };
    toast(message, { kind: 'pending', ms, action: { label: 'Undo', onClick: () => finish(false) } });
  }), [toast]);

  const refreshCounts = useCallback(async () => {
    if (!session.user || session.user.role === 'jobsheets') return;
    try { setCounts(await api.get('/counts')); } catch { /* sidebar counts are optional */ }
  }, [session.user]);

  useEffect(() => { refreshCounts(); }, [refreshCounts]);

  const signIn = useCallback(({ user, business }) => setSession({ user, business, ready: true }), []);
  const signOut = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* already logged out */ }
    setSession({ user: null, business: null, ready: true });
    setCounts(null);
  }, []);
  const setBusiness = useCallback((business) => setSession((s) => ({ ...s, business })), []);

  const value = useMemo(
    () => ({ ...session, counts, refreshCounts, toast, hold, signIn, signOut, setBusiness }),
    [session, counts, refreshCounts, toast, hold, signIn, signOut, setBusiness],
  );

  const t = toastState;
  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className={`toast ${t ? 'show' : ''} ${t?.kind || ''}`} role="status" aria-live="polite">
        {t && (
          <>
            <span className="toast-ic" key={t.id}>
              {t.kind === 'ok' ? <Check /> : t.kind === 'error' ? <Icon name="alert" /> : <span className="toast-ring" />}
            </span>
            <span className="toast-msg">{t.message}</span>
            {t.action && (
              <button className="toast-act" onClick={() => { const fn = t.action.onClick; setToast(null); fn(); }}>{t.action.label}</button>
            )}
            {t.kind === 'pending' && t.ms && <i className="toast-bar" key={`b${t.id}`} style={{ animationDuration: `${t.ms}ms` }} />}
          </>
        )}
      </div>
    </AppCtx.Provider>
  );
}
