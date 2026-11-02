'use client';
import { useState } from 'react';
import { ErrorNotice, Notice, PageHead, Tag, apiFetch, fmtTime, label, useAction, useApi, useForm } from '@/components/ui';

function duration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return h < 48 ? `${h} h ${min % 60} min` : `${Math.floor(h / 24)} days`;
}

export default function Outages() {
  const [status, setStatus] = useState('');
  const list = useApi(`/api/outages${status ? `?status=${status}` : ''}`);
  const me = useApi('/api/me');
  const action = useAction(list.reload);
  const form = useForm({ zone_id: '', severity: 'MEDIUM', reason: '' });
  const staff = me.data && me.data.user.role !== 'CONSUMER';

  return (
    <>
      <PageHead title="Outages" intro={staff ? 'Reported supply interruptions. Resolving one restores the zone status in a single transaction.' : 'Supply interruptions in your area. Report one if your power is out.'} />
      <ErrorNotice error={list.error} />
      <Notice message={action.message} />
      <section className="panel">
        <h2>Report an outage</h2>
        <form className="form" onSubmit={(e) => { e.preventDefault(); action.run(async () => { await apiFetch('/api/outages', { method: 'POST', body: form.values }); form.reset(); }, 'Outage reported. The zone is now marked as in outage.'); }}>
          <label className="field">Zone
            <select {...form.bind('zone_id')} required>
              <option value="">Choose a zone</option>
              {list.data?.zones.map((z) => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
            </select>
          </label>
          <label className="field">Severity
            <select {...form.bind('severity')}>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
          </label>
          <label className="field" style={{ gridColumn: 'span 2' }}>What happened<input {...form.bind('reason')} required minLength={5} maxLength={255} placeholder="For example: no power on 4th Cross since 7 pm" /></label>
          <div><button className="btn" disabled={action.busy}>Report outage</button></div>
        </form>
      </section>
      <section className="panel">
        <div className="toolbar">
          <label className="field">Show
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All outages</option><option value="ACTIVE">Active only</option><option value="RESOLVED">Resolved only</option>
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Zone</th><th>Cause</th><th>Severity</th><th>Status</th><th>Started</th><th>Duration</th>{staff && <th />}</tr></thead>
            <tbody>
              {list.data?.outages.map((o) => (
                <tr key={o.outage_id}>
                  <td>{o.zone_name}</td>
                  <td>{o.reason}<div className="muted">Reported by {o.reported_by_name}</div></td>
                  <td><Tag value={o.severity} /></td>
                  <td><Tag value={o.status} /></td>
                  <td>{fmtTime(o.start_time)}</td>
                  <td>{duration(o.duration_min)}{o.status === 'ACTIVE' && <div className="muted">ongoing</div>}</td>
                  {staff && (
                    <td>{o.status === 'ACTIVE' && (
                      <button className="btn small" disabled={action.busy}
                        onClick={() => action.run(() => apiFetch(`/api/outages/${o.outage_id}/resolve`, { method: 'POST' }), `Outage in ${o.zone_name} resolved.`)}>Resolve</button>
                    )}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {list.data && !list.data.outages.length && <p className="empty">No outages to show.</p>}
        </div>
      </section>
    </>
  );
}
