'use client';
import { useCallback, useEffect, useState } from 'react';

/** fetch JSON from our API; throws an Error with the server's message on failure */
export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== 'undefined') window.location.href = '/login';
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function useApi(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    try {
      setData(await apiFetch(url));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [url]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload };
}

/** Runs an action, shows its result, then reloads data */
export function useAction(onDone) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const run = async (fn, successText) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      if (successText) setMessage({ type: 'ok', text: successText });
      if (onDone) await onDone();
      return true;
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, message, setMessage, run };
}

export function Notice({ message }) {
  if (!message) return null;
  return <div className={`notice ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</div>;
}

export function ErrorNotice({ error }) {
  if (!error) return null;
  return <div className="notice error" role="alert">{error}</div>;
}

const TONE = {
  ACTIVE: 'good', NORMAL: 'good', AVAILABLE: 'good', COMPLETED: 'good', RESOLVED: 'good', OK: 'good',
  APPROVED: 'info', IN_USE: 'info', SCHEDULED: 'info', IN_PROGRESS: 'warn', INFO: 'info',
  PENDING: 'warn', HIGH_DEMAND: 'warn', MAINTENANCE: 'warn', MEDIUM: 'warn', LOW: '',
  OUTAGE: 'bad', OFFLINE: 'bad', HIGH: 'bad', CRITICAL: 'bad', INACTIVE: 'bad', FAULTY: 'bad', DISCONNECTED: 'bad',
};

export function Tag({ value }) {
  if (!value) return null;
  return <span className={`tag ${TONE[value] ?? ''}`}>{label(value)}</span>;
}

/** HIGH_DEMAND -> High demand */
export function label(value) {
  const s = String(value).replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const mw = (v) => (v === null || v === undefined ? '-' : `${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })} MW`);
export const fmtNum = (v, d = 1) => (v === null || v === undefined ? '-' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: d }));

export function fmtTime(v) {
  if (!v) return '-';
  const d = new Date(typeof v === 'string' && !v.includes('T') ? v.replace(' ', 'T') : v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(v) {
  if (!v) return '-';
  const d = new Date(v + (String(v).length === 10 ? 'T00:00:00' : ''));
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Meter({ pct, warnAt = 90 }) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <span className={`meter ${p >= warnAt ? 'warn' : ''}`} role="img" aria-label={`${p.toFixed(0)} percent`}>
      <b style={{ width: `${p}%` }} />
    </span>
  );
}

export function PageHead({ title, intro, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
      {children}
    </div>
  );
}

/** Small form state helper */
export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const bind = (name) => ({
    name,
    value: values[name] ?? '',
    onChange: (e) => setValues((v) => ({ ...v, [name]: e.target.value })),
  });
  return { values, setValues, bind, reset: () => setValues(initial) };
}
