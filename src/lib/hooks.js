import { useCallback, useEffect, useRef, useState } from 'react';

// Loads data from the API and re-loads when deps change. Keeps the last good data while reloading.
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      setState((s) => ({ ...s, error, loading: false }));
      return null;
    }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, deps);
  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), []);
  return { ...state, reload: load, setData };
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Animates a number from where it was to `target` (eased). Jumps straight there if motion is reduced.
export function useCountUp(target, ms = 800) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const from = useRef(prefersReducedMotion() ? target : 0);
  useEffect(() => {
    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      setValue(target);
      from.current = target;
      return undefined;
    }
    const a = from.current;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms);
      setValue(Math.round(a + (target - a) * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

// Runs an action, tracks "busy", and reports errors through the given toast.
// `ok` can be a message, or a function of the result returning a message or { message, action }.
export function useAction(toast) {
  const [busy, setBusy] = useState(null);
  const run = useCallback(async (key, fn, ok) => {
    setBusy(key);
    try {
      const out = await fn();
      const msg = out != null && ok ? (typeof ok === 'function' ? ok(out) : ok) : null;
      if (typeof msg === 'string') toast(msg);
      else if (msg) toast(msg.message, msg);
      return out;
    } catch (err) {
      toast(err.message, 'error');
      return null;
    } finally {
      setBusy(null);
    }
  }, [toast]);
  return { busy, run };
}

export function useDebounced(fn, ms = 600) {
  const t = useRef();
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => () => clearTimeout(t.current), []);
  return useCallback((...args) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => fnRef.current(...args), ms);
  }, [ms]);
}

export function useStored(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      return v === null ? initial : JSON.parse(v);
    } catch {
      return initial;
    }
  });
  const set = useCallback((v) => {
    setValue(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ }
  }, [key]);
  return [value, set];
}
