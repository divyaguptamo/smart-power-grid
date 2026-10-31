'use client';
import { Fragment, useState } from 'react';
import { ErrorNotice, Notice, PageHead, Tag, apiFetch, fmtNum, fmtTime, mw, useAction, useApi, useForm } from '@/components/ui';

const NEXT_STATUS = { PENDING: 'APPROVED', APPROVED: 'COMPLETED' };
const NEXT_LABEL = { PENDING: 'Approve', APPROVED: 'Mark completed' };

function History({ id }) {
  const { data, error } = useApi(`/api/allocations/${id}/log`);
  if (error) return <ErrorNotice error={error} />;
  if (!data) return <span className="muted">Loading history…</span>;
  if (!data.log.length) return <span className="muted">No changes recorded.</span>;
  return (
    <table>
      <thead><tr><th>When</th><th>By</th><th className="num">From</th><th className="num">To</th><th>Reason</th></tr></thead>
      <tbody>
        {data.log.map((l) => (
          <tr key={l.log_id}>
            <td>{fmtTime(l.changed_at)}</td><td>{l.changed_by_name}</td>
            <td className="num">{l.old_power_mw === null ? 'new' : mw(l.old_power_mw)}</td>
            <td className="num">{mw(l.new_power_mw)}</td><td>{l.reason}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Allocations() {
  const [filters, setFilters] = useState({ status: '', zone_id: '', sort: 'newest' });
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  const list = useApi(`/api/allocations?${qs}`);
  const grid = useApi('/api/dashboard');
  const reloadAll = async () => { await Promise.all([list.reload(), grid.reload()]); };
  const action = useAction(reloadAll);
  const form = useForm({ plant_id: '', zone_id: '', allocated_power_mw: '', priority_level: '3', notes: '' });
  const [open, setOpen] = useState(null);
  const [adjust, setAdjust] = useState(null); // { id, power, reason }

  const create = (e) => {
    e.preventDefault();
    action.run(async () => {
      await apiFetch('/api/allocations', { method: 'POST', body: form.values });
      form.reset();
    }, 'Allocation created and logged. It is waiting for approval.');
  };

  const plants = grid.data?.plants || [];
  const zones = grid.data?.zones || [];

  return (
    <>
      <PageHead title="Allocations" intro="Assign plant output to zones. Every request is checked against plant headroom and zone capacity inside a database transaction." />
      <ErrorNotice error={list.error || grid.error} />
      <Notice message={action.message} />

      <section className="panel">
        <h2>New allocation</h2>
        <form className="form" onSubmit={create}>
          <label className="field">From plant
            <select {...form.bind('plant_id')} required>
              <option value="">Choose a plant</option>
              {plants.map((p) => (
                <option key={p.plant_id} value={p.plant_id} disabled={p.status !== 'ACTIVE'}>
                  {p.plant_name} ({fmtNum(p.headroom_mw)} MW free{p.status !== 'ACTIVE' ? `, ${p.status.toLowerCase()}` : ''})
                </option>
              ))}
            </select>
          </label>
          <label className="field">To zone
            <select {...form.bind('zone_id')} required>
              <option value="">Choose a zone</option>
              {zones.map((z) => (
                <option key={z.zone_id} value={z.zone_id}>
                  {z.zone_name} ({fmtNum(z.max_capacity_mw - z.allocated_power_mw)} MW room)
                </option>
              ))}
            </select>
          </label>
          <label className="field">Power (MW)<input type="number" min="0.01" step="0.01" {...form.bind('allocated_power_mw')} required /></label>
          <label className="field">Priority (1 low, 5 critical)
            <select {...form.bind('priority_level')}>{[1, 2, 3, 4, 5].map((p) => <option key={p}>{p}</option>)}</select>
          </label>
          <label className="field wide">Notes<input {...form.bind('notes')} maxLength={500} placeholder="Why this allocation is needed" /></label>
          <div><button className="btn" disabled={action.busy}>Create allocation</button></div>
        </form>
      </section>

      <section className="panel">
        <div className="toolbar">
          <label className="field">Status
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="COMPLETED">Completed</option>
            </select>
          </label>
          <label className="field">Zone
            <select value={filters.zone_id} onChange={(e) => setFilters({ ...filters, zone_id: e.target.value })}>
              <option value="">All zones</option>
              {zones.map((z) => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
            </select>
          </label>
          <label className="field">Sort by
            <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
              <option value="power">Largest power</option><option value="priority">Highest priority</option>
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Plant to zone</th><th className="num">Power</th><th>Priority</th><th>Status</th><th>Backup</th><th>Requested</th><th /></tr></thead>
            <tbody>
              {list.data?.allocations.map((a) => (
                <Fragment key={a.allocation_id}>
                  <tr className={open === a.allocation_id ? 'expanded' : ''}>
                    <td>{a.allocation_id}</td>
                    <td>{a.plant_name} to {a.zone_name}{a.notes && <div className="muted">{a.notes}</div>}</td>
                    <td className="num">{mw(a.allocated_power_mw)}</td>
                    <td>{a.priority_level}</td>
                    <td><Tag value={a.status} /></td>
                    <td>{a.backup_mw > 0 ? <>{mw(a.backup_mw)}<div className="muted">{a.backup_resources}</div></> : <span className="muted">None</span>}</td>
                    <td>{fmtTime(a.allocation_time)}</td>
                    <td>
                      <div className="actions">
                        {NEXT_STATUS[a.status] && (
                          <button className="btn small" disabled={action.busy}
                            onClick={() => action.run(() => apiFetch(`/api/allocations/${a.allocation_id}`, { method: 'PATCH', body: { status: NEXT_STATUS[a.status] } }), `Allocation #${a.allocation_id} updated.`)}>
                            {NEXT_LABEL[a.status]}
                          </button>
                        )}
                        {a.status !== 'COMPLETED' && (
                          <button className="btn small ghost" onClick={() => setAdjust({ id: a.allocation_id, power: a.allocated_power_mw, reason: '' })}>Change power</button>
                        )}
                        <button className="btn small ghost" onClick={() => setOpen(open === a.allocation_id ? null : a.allocation_id)}>
                          {open === a.allocation_id ? 'Hide history' : `History (${a.change_count})`}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {adjust?.id === a.allocation_id && (
                    <tr className="expanded"><td colSpan={8}>
                      <form className="form" onSubmit={(e) => {
                        e.preventDefault();
                        action.run(async () => {
                          await apiFetch(`/api/allocations/${a.allocation_id}`, { method: 'PATCH', body: { allocated_power_mw: adjust.power, reason: adjust.reason } });
                          setAdjust(null);
                        }, `Power for allocation #${a.allocation_id} changed and logged.`);
                      }}>
                        <label className="field">New power (MW)<input type="number" min="0.01" step="0.01" value={adjust.power} onChange={(e) => setAdjust({ ...adjust, power: e.target.value })} required /></label>
                        <label className="field" style={{ gridColumn: 'span 2' }}>Reason for change<input value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} required minLength={3} /></label>
                        <div className="actions"><button className="btn" disabled={action.busy}>Save change</button><button type="button" className="btn ghost" onClick={() => setAdjust(null)}>Cancel</button></div>
                      </form>
                    </td></tr>
                  )}
                  {open === a.allocation_id && <tr className="expanded"><td colSpan={8}><History key={a.change_count} id={a.allocation_id} /></td></tr>}
                </Fragment>
              ))}
            </tbody>
          </table>
          {list.data && !list.data.allocations.length && <p className="empty">No allocations match these filters.</p>}
        </div>
      </section>
    </>
  );
}
