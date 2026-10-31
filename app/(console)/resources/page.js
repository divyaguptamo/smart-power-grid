'use client';
import { useEffect, useState } from 'react';
import { ErrorNotice, Meter, Notice, PageHead, Tag, apiFetch, label, mw, useAction, useApi, useForm } from '@/components/ui';

const TYPES = ['BATTERY', 'GENERATOR', 'RESERVE', 'STORAGE'];

export default function Resources() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(t); }, [q]);
  const qs = new URLSearchParams(Object.entries({ q: debounced, type, status }).filter(([, v]) => v)).toString();
  const list = useApi(`/api/resources?${qs}`);
  const me = useApi('/api/me');
  const action = useAction(list.reload);
  const form = useForm({ resource_name: '', resource_type: 'BATTERY', capacity_mw: '', location: '' });
  const isAdmin = me.data?.user.role === 'ADMIN';

  return (
    <>
      <PageHead title="Backup resources" intro="Batteries, generators and reserves that can top up an allocation. Search uses the database's full-text index on name and location." />
      <ErrorNotice error={list.error} />
      <Notice message={action.message} />
      <section className="panel">
        <div className="toolbar">
          <label className="field grow">Search by name or location
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="For example: storage, central, generator" />
          </label>
          <label className="field">Type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>{TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
            </select>
          </label>
          <label className="field">Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any status</option>{['AVAILABLE', 'IN_USE', 'MAINTENANCE'].map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Resource</th><th>Type</th><th className="num">Capacity</th><th>Available</th><th>Status</th>{isAdmin && <th />}</tr></thead>
            <tbody>
              {list.data?.resources.map((r) => (
                <tr key={r.resource_id}>
                  <td>{r.resource_name}<div className="muted">{r.location || 'No location'}</div></td>
                  <td>{label(r.resource_type)}</td>
                  <td className="num">{mw(r.capacity_mw)}</td>
                  <td><Meter pct={r.available_pct} warnAt={101} />{mw(r.available_power_mw)}</td>
                  <td>
                    <select value={r.status} disabled={action.busy} aria-label={`Status of ${r.resource_name}`}
                      onChange={(e) => action.run(() => apiFetch(`/api/resources/${r.resource_id}`, { method: 'PATCH', body: { status: e.target.value } }), `${r.resource_name} updated.`)}>
                      {['AVAILABLE', 'IN_USE', 'MAINTENANCE'].map((s) => <option key={s} value={s}>{label(s)}</option>)}
                    </select>
                  </td>
                  {isAdmin && (
                    <td><button className="btn small danger" disabled={action.busy}
                      onClick={() => confirm(`Delete ${r.resource_name}?`) && action.run(() => apiFetch(`/api/resources/${r.resource_id}`, { method: 'DELETE' }), `${r.resource_name} deleted.`)}>Delete</button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {list.data && !list.data.resources.length && <p className="empty">No resources match. Try a shorter search word.</p>}
        </div>
      </section>
      {isAdmin && (
        <section className="panel">
          <h2>Add a resource</h2>
          <form className="form" onSubmit={(e) => { e.preventDefault(); action.run(async () => { await apiFetch('/api/resources', { method: 'POST', body: form.values }); form.reset(); }, 'Resource added.'); }}>
            <label className="field">Name<input {...form.bind('resource_name')} required minLength={3} /></label>
            <label className="field">Type<select {...form.bind('resource_type')}>{TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select></label>
            <label className="field">Capacity (MW)<input type="number" step="0.01" min="0" {...form.bind('capacity_mw')} required /></label>
            <label className="field">Location<input {...form.bind('location')} /></label>
            <div><button className="btn" disabled={action.busy}>Add resource</button></div>
          </form>
        </section>
      )}
    </>
  );
}
