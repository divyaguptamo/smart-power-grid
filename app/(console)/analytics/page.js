'use client';
import { useEffect, useState } from 'react';
import BarChart from '@/components/BarChart';
import { ErrorNotice, Notice, PageHead, Tag, apiFetch, fmtNum, fmtTime, label, useAction, useApi } from '@/components/ui';

const hourText = (h) => `${String(h).padStart(2, '0')}:00 to ${String((h + 1) % 24).padStart(2, '0')}:00`;

function Events() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [openOnly, setOpenOnly] = useState(true);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t); }, [q]);
  const qs = new URLSearchParams({ ...(debounced ? { q: debounced } : {}), ...(openOnly ? { open: '1' } : {}) }).toString();
  const list = useApi(`/api/events?${qs}`);
  const action = useAction(list.reload);
  return (
    <section className="panel">
      <h2>Grid events</h2>
      <p className="sub">Stored in MongoDB; each event type carries its own set of fields.</p>
      <Notice message={action.message} />
      <ErrorNotice error={list.error} />
      <div className="toolbar">
        <label className="field grow">Search event text<input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="For example: transformer, voltage" /></label>
        <label className="field">Show
          <select value={openOnly ? '1' : '0'} onChange={(e) => setOpenOnly(e.target.value === '1')}>
            <option value="1">Needs acknowledgement</option><option value="0">All events</option>
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Severity</th><th>Event</th><th>Details</th><th>When</th><th /></tr></thead>
          <tbody>
            {list.data?.events.map((e) => (
              <tr key={e.id}>
                <td><Tag value={e.severity} /></td>
                <td>{e.message}<div className="muted">{label(e.type)}, from {label(e.source)}{e.zone_id ? `, zone ${e.zone_id}` : ''}</div></td>
                <td className="muted" style={{ fontSize: 13 }}>
                  {Object.entries(e.payload || {}).map(([k, v]) => <div key={k}>{label(k)}: {String(v)}</div>)}
                </td>
                <td>{fmtTime(e.ts)}</td>
                <td>{!e.acknowledged
                  ? <button className="btn small ghost" disabled={action.busy} onClick={() => action.run(() => apiFetch(`/api/events/${e.id}`, { method: 'PATCH' }), 'Event acknowledged.')}>Acknowledge</button>
                  : <span className="muted">Acknowledged</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.data && !list.data.events.length && <p className="empty">No events match.</p>}
      </div>
    </section>
  );
}

export default function Analytics() {
  const [days, setDays] = useState(14);
  const { data, error } = useApi(`/api/analytics?days=${days}`);
  const zoneIds = data ? [...new Set(data.zoneDaily.map((r) => r.zone_id))] : [];

  return (
    <>
      <PageHead title="Telemetry" intro="Smart-meter readings and grid events aggregated in MongoDB.">
        <label className="field">Period
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option><option value={14}>Last 14 days</option><option value={30}>Last 30 days</option>
          </select>
        </label>
      </PageHead>
      <ErrorNotice error={error} />
      {data && (
        <>
          <section className="panel">
            <h2>Daily energy by zone</h2>
            <p className="sub">Metered kWh per day. The amber bar is the busiest day.</p>
            {zoneIds.length === 0 && <p className="empty">No meter readings yet. Run the MongoDB seed script or post readings to the API.</p>}
            <div className="grid-even">
              {zoneIds.map((id) => {
                const rows = data.zoneDaily.filter((r) => r.zone_id === id);
                return (
                  <div key={id}>
                    <strong>{rows[0].zone_name}</strong>
                    <BarChart title={`Daily kWh, ${rows[0].zone_name}`} unit="kWh" height={160} labelEvery={Math.ceil(rows.length / 7)}
                      data={rows.map((r) => ({ label: r.day, short: r.day.slice(8), value: r.kwh }))} />
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid-even" style={{ marginTop: 18 }}>
            <section className="panel">
              <h2>Peak hour per zone</h2>
              <table>
                <thead><tr><th>Zone</th><th>Busiest hour</th><th className="num">Avg kWh per meter</th></tr></thead>
                <tbody>{data.peakHour.map((p) => <tr key={p.zone_id}><td>{p.zone_name}</td><td>{hourText(p.hour)}</td><td className="num">{fmtNum(p.avg_kwh, 2)}</td></tr>)}</tbody>
              </table>
            </section>
            <section className="panel">
              <h2>Supply voltage quality</h2>
              <p className="sub">Readings outside 230 V plus or minus 6 percent.</p>
              <table>
                <thead><tr><th>Zone</th><th className="num">Readings</th><th className="num">Out of band</th><th className="num">Range</th></tr></thead>
                <tbody>{data.voltage.map((v) => (
                  <tr key={v.zone_id}><td>{v.zone_name}</td><td className="num">{v.readings}</td>
                    <td className="num">{v.issues} ({fmtNum(v.issue_pct, 2)}%)</td><td className="num">{fmtNum(v.min_v)} to {fmtNum(v.max_v)} V</td></tr>
                ))}</tbody>
              </table>
            </section>
            <section className="panel">
              <h2>Highest-consuming meters</h2>
              <table>
                <thead><tr><th>Meter</th><th>Consumer</th><th className="num">Energy</th></tr></thead>
                <tbody>{data.topMeters.map((m) => (
                  <tr key={m.meter_id}><td>#{m.meter_id}</td><td>{m.consumer_name}<div className="muted">{m.zone_name}</div></td><td className="num">{fmtNum(m.kwh)} kWh</td></tr>
                ))}</tbody>
              </table>
            </section>
            <section className="panel">
              <h2>Events in this period</h2>
              <table>
                <thead><tr><th>Type</th><th className="num">Count</th></tr></thead>
                <tbody>{data.events.byType.map((e) => <tr key={e.type}><td>{label(e.type)}</td><td className="num">{e.count}</td></tr>)}</tbody>
              </table>
              <p className="muted" style={{ marginTop: 10 }}>
                By severity: {data.events.bySeverity.map((s) => `${label(s.severity)} ${s.count}`).join(', ')}
              </p>
            </section>
          </div>
        </>
      )}
      <div style={{ marginTop: 18 }}><Events /></div>
    </>
  );
}
