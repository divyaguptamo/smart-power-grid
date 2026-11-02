'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthSide from '@/components/AuthSide';
import { apiFetch } from '@/components/ui';

const DEMO = [
  { label: 'Admin', email: 'arjun@gmail.com' },
  { label: 'Operator', email: 'meera@gmail.com' },
  { label: 'Consumer', email: 'rahul@gmail.com' },
];

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { user } = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
      const next = params.get('next');
      window.location.href = next && next.startsWith('/') ? next : user.role === 'CONSUMER' ? '/my-usage' : '/dashboard';
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>Sign in</h2>
      <p className="muted">Use your grid account.</p>
      <form onSubmit={submit}>
        {error && <div className="notice error" role="alert">{error}</div>}
        <label className="field">Email
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">Password
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="muted" style={{ marginTop: 16 }}>New consumer? <Link href="/register">Register a connection</Link></p>
      <div className="demo">
        Demo accounts (password Grid@2026):{' '}
        {DEMO.map((d, i) => (
          <span key={d.email}>
            <button type="button" onClick={() => { setEmail(d.email); setPassword('Grid@2026'); }}>{d.label}</button>
            {i < DEMO.length - 1 ? ', ' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="auth">
      <AuthSide />
      <div className="auth-main">
        <Suspense><LoginForm /></Suspense>
      </div>
    </div>
  );
}
