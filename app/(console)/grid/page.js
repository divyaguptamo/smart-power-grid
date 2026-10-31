'use client';
import { useEffect, useState } from 'react';
import { ErrorNotice, Meter, Notice, PageHead, Tag, apiFetch, fmtDate, fmtNum, label, mw, useAction, useApi, useForm } from '@/components/ui';

function PlantRow({ p, run, busy }) {
  const [gen, setGen] = useState(p.current_generation_mw);
  useEffect(() => setGen(p.current_generation_mw), [p.current_generation_mw]);
  return (
    <tr>
      <td>{p.plant_name}<div className="muted">{label(p.plant_type)}, {p.location}, since {fmtDate(p.commissioned_date)}</div></td>
      <td className="num">{mw(p.capacity_mw)}</td>
      <td>
        <form className="actions" onSubmit={(e) => { e.preventDefault(); run(() => apiFetch(`/api/plants/${p.plant_id}`, { method: 'PATCH', body: { current_generation_mw: gen } }), `${p.plant_name} generation updated.`); }}>
          <input type="number" step="0.01" min="0" value={gen} onChange={(e) => setGen(e.target.value)} style={{ width: 96 }} aria-label={`Generation for ${p.plant_name} in MW`} />
          <button className="btn small ghost" disabled={busy || Number(gen) === Number(p.current_generation_mw)}>Save</button>
        </form>
      </td>
      <td><Meter pct={p.utilization_pct} />{fmtNum(p.utilization_pct)}%</td>
      <td className="num">{mw(p.committed_mw)}</td>
      <td>
        <select value={p.status} disabled={busy} aria-label={`Status of ${p.plant_name}`}
          onChange={(e) => run(() => apiFetch(`/api/plants/${p.plant_id}`, { method: 'PATCH', body: { status: e.target.value } }), `${p.plant_name} is now ${e.target.value.toLowerCase()}.`)}>
          {['ACTIVE', 'OFFLINE', 'MAINTENANCE'].map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
      </td>
    </tr>
  );
}

function ZoneRow({ z, run, busy }) {
  const [demand, setDemand] = useState(z.current_demand_mw);
  useEffect(() => setDemand(z.current_demand_mw), [z.current_demand_mw]);
  return (
    <tr>
      <td>{z.zone_name}<div className="muted">{label(z.zone_type)}, priority {z.priority_level}, {z.meter_count} meters</div></td>
      <td><Tag value={z.status} /></td>
      <td className="num">{mw(z.max_capacity_mw)}</td>
      <td className="num">{mw(z.allocated_power_mw)}</td>
      <td>
        <form className="actions" onSubmit={(e) => { e.preventDefault(); run(() => apiFetch(`/api/zones/${z.zone_id}`, { method: 'PATCH', body: { current_demand_mw: demand } }), `${z.zone_name} demand updated.`); }}>
          <input type="number" step="0.01" min="0" value={demand} onChange={(e) => setDemand(e.target.value)} style={{ width: 96 }} aria-label={`Demand for ${z.zone_name} in MW`} />
          <button className="btn small ghost" disabled={busy || Number(demand) === Number(z.current_demand_mw)}>Save</button>
        </form>
      </td>
      <td className="num">{z.deficit_mw > 0 ? <span style={{ color: 'var(--amber)' }}>{mw(z.deficit_mw)}</span> : '-'}</td>
    </tr>
  );
}

export default function GridPage() {
  const plants = useApi('/api/plants');
  const zones = useApi('/api/zones');
  const me = useApi('/api/me');
  const action = useAction(async () => { await Promise.all([plants.reload(), zones.reload()]); });
  const form = useForm({ plant_name: '', plant_type: 'SOLAR', location: '', capacity_mw: '', current_generation_mw: '0', commissioned_date: '' });
  const isAdmin = me.data?.user.role === 'ADMIN';

  return (
    <>
      <PageHead title="Plants and zones" intro="Record live generation and measured demand. The database rejects values outside each plant's or zone's limits." />
      <ErrorNotice error={plants.error || zones.error} />
      <Notice message={action.message} />

      <section className="panel">
        <h2>Power plants</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Plant</th><th className="num">Capacity</th><th>Generating (MW)</th><th>Utilisation</th><th className="num">Committed</th><th>Status</th></tr></thead>
            <tbody>{plants.data?.plants.map((p) => <PlantRow key={p.plant_id} p={p} run={action.run} busy={action.busy} />)}</tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Grid zones</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Zone</th><th>Status</th><th className="num">Capacity</th><th className="num">Allocated</th><th>Demand (MW)</th><th className="num">Unmet</th></tr></thead>
            <tbody>{zones.data?.zones.map((z) => <ZoneRow key={z.zone_id} z={z} run={action.run} busy={action.busy} />)}</tbody>
          </table>
        </div>
      </section>

      {isAdmin && (
        <section className="panel">
          <h2>Commission a plant</h2>
          <form className="form" onSubmit={(e) => { e.preventDefault(); action.run(async () => { await apiFetch('/api/plants', { method: 'POST', body: form.values }); form.reset(); }, 'Plant added.'); }}>
            <label className="field">Name<input {...form.bind('plant_name')} required minLength={3} /></label>
            <label className="field">Type<select {...form.bind('plant_type')}>{['SOLAR', 'WIND', 'HYDRO', 'THERMAL'].map((t) => <option key={t} value={t}>{label(t)}</option>)}</select></label>
            <label className="field">Location<input {...form.bind('location')} required /></label>
            <label className="field">Capacity (MW)<input type="number" step="0.01" min="0.01" {...form.bind('capacity_mw')} required /></label>
            <label className="field">Commissioned on<input type="date" {...form.bind('commissioned_date')} /></label>
            <div><button className="btn" disabled={action.busy}>Add plant</button></div>
          </form>
        </section>
      )}
    </>
  );
}
