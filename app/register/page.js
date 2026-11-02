'use client';
import { useState } from 'react';
import Link from 'next/link';
import AuthSide from '@/components/AuthSide';
import { apiFetch, label, useApi, useForm } from '@/components/ui';

export default function RegisterPage() {
  const { data } = useApi('/api/auth/register');
  const { values, bind } = useForm({ name: '', email: '', phone: '', password: '', consumer_type: 'RESIDENTIAL', address: '', zone_id: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiFetch('/api/auth/register', { method: 'POST', body: values });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <AuthSide />
      <div className="auth-main">
        <div className="auth-card">
          <h2>Register a connection</h2>
          <p className="muted">Creates your account, consumer profile and smart meter together.</p>
          {done ? (
            <div className="notice ok" style={{ marginTop: 20 }}>
              Connection registered. <Link href="/login">Sign in</Link> to see your usage.
            </div>
          ) : (
            <form onSubmit={submit}>
              {error && <div className="notice error" role="alert">{error}</div>}
              <label className="field">Full name<input {...bind('name')} required minLength={2} maxLength={100} /></label>
              <label className="field">Email<input type="email" {...bind('email')} required maxLength={150} /></label>
              <label className="field">Mobile number<input {...bind('phone')} inputMode="numeric" pattern="[6-9][0-9]{9}" title="10-digit mobile number" /></label>
              <label className="field">Password<input type="password" autoComplete="new-password" {...bind('password')} required minLength={8} /></label>
              <label className="field">Connection type
                <select {...bind('consumer_type')}>
                  {['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL'].map((t) => <option key={t} value={t}>{label(t)}</option>)}
                </select>
              </label>
              <label className="field">Address<input {...bind('address')} required minLength={5} maxLength={255} /></label>
              <label className="field">Grid zone
                <select {...bind('zone_id')} required>
                  <option value="">Choose your zone</option>
                  {data?.zones.map((z) => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
                </select>
              </label>
              <button className="btn" disabled={busy}>{busy ? 'Registering…' : 'Register connection'}</button>
              <p className="muted">Already registered? <Link href="/login">Sign in</Link></p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
