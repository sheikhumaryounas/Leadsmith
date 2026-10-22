import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app-context.jsx';

const Brand = () => (
  <div className="auth-brand">
    <i><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2.5 7h14.2c.4 2.2 2.1 3.6 4.8 3.8v1.7c-2.7.2-4.3 1.3-4.6 3.5H7.4c-.2-1.9-1.6-3.1-4-3.6z" /><path d="M8.4 17.2h7.2l1.6 3.3H6.8z" /></svg></i>
    <b>Leadsmith</b>
  </div>
);

function useSubmit(fn) {
  const { signIn } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const session = await fn();
      signIn(session);
      navigate(session.user.role === 'jobsheets' ? '/jobs' : '/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

export function Login() {
  const [f, setF] = useState({ email: '', password: '' });
  const { busy, error, submit } = useSubmit(() => api.post('/auth/login', f));
  return (
    <div className="auth">
      <div className="auth-card">
        <Brand />
        <h1>Log in</h1>
        <p className="lede">Your enquiries, quotes and jobs in one place.</p>
        <form className="form" onSubmit={submit}>
          <div><label htmlFor="li-email">Email</label><input id="li-email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
          <div><label htmlFor="li-pw">Password</label><input id="li-pw" type="password" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></div>
          {error && <div className="err" role="alert">{error}</div>}
          <button className="btn btn-accent" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        </form>
        <p className="auth-alt">New to Leadsmith? <Link to="/signup">Create an account</Link></p>
        {import.meta.env.DEV && (
          <div className="demo-hint">Demo account: <code>dave@ridgewayfab.co.uk</code> / <code>leadsmith-demo</code></div>
        )}
      </div>
    </div>
  );
}

export function Signup() {
  const [f, setF] = useState({ businessName: '', name: '', email: '', password: '' });
  const { busy, error, submit } = useSubmit(() => api.post('/auth/register', f));
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="auth">
      <div className="auth-card">
        <Brand />
        <h1>Create your account</h1>
        <p className="lede">Set up Leadsmith for your business. It takes a minute.</p>
        <form className="form" onSubmit={submit}>
          <div><label htmlFor="su-biz">Business name</label><input id="su-biz" value={f.businessName} onChange={set('businessName')} maxLength={120} required /></div>
          <div><label htmlFor="su-name">Your name</label><input id="su-name" autoComplete="name" value={f.name} onChange={set('name')} maxLength={120} required /></div>
          <div><label htmlFor="su-email">Email</label><input id="su-email" type="email" autoComplete="email" value={f.email} onChange={set('email')} required /></div>
          <div><label htmlFor="su-pw">Password</label><input id="su-pw" type="password" autoComplete="new-password" minLength={8} value={f.password} onChange={set('password')} required /><span className="hint">At least 8 characters.</span></div>
          {error && <div className="err" role="alert">{error}</div>}
          <button className="btn btn-accent" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        </form>
        <p className="auth-alt">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
}

export function AcceptInvite() {
  const { token } = useParams();
  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [f, setF] = useState({ name: '', password: '' });
  const { busy, error, submit } = useSubmit(() => api.post(`/auth/invite/${token}/accept`, f));
  useEffect(() => {
    api.get(`/auth/invite/${token}`).then(setInvite).catch((e) => setLoadError(e.message));
  }, [token]);
  return (
    <div className="auth">
      <div className="auth-card">
        <Brand />
        {loadError ? (
          <><h1>Invite not found</h1><p className="lede">{loadError}</p><p className="auth-alt"><Link to="/login">Go to log in</Link></p></>
        ) : !invite ? (
          <p className="lede">Checking your invite…</p>
        ) : (
          <>
            <h1>Join {invite.businessName}</h1>
            <p className="lede">You’re joining as <b>{invite.email}</b>{invite.role === 'jobsheets' ? '. You’ll see job sheets for the workshop.' : '.'}</p>
            <form className="form" onSubmit={submit}>
              <div><label htmlFor="ai-name">Your name</label><input id="ai-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={120} required /></div>
              <div><label htmlFor="ai-pw">Choose a password</label><input id="ai-pw" type="password" autoComplete="new-password" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></div>
              {error && <div className="err" role="alert">{error}</div>}
              <button className="btn btn-accent" disabled={busy}>{busy ? 'Joining…' : 'Join'}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
