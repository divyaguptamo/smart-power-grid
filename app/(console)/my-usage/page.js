'use client';
import { useState } from 'react';
import Link from 'next/link';
import BarChart from '@/components/BarChart';
import { ErrorNotice, PageHead, Tag, fmtDate, fmtNum, label, useApi } from '@/components/ui';

export default function MyUsage() {
  const [days, setDays] = useState(30);
  const [meter, setMeter] = useState('');
  const { data, error } = useApi(`/api/readings?days=${days}${meter ? `&meter_id=${meter}` : ''}`);
  const meters = useApi('/api/meters');
  const s = data?.summary;
  const peakHour = data?.hourly?.length ? data.hourly.reduce((a, b) => (b.avg_kwh > a.avg_kwh ? b : a)) : null;

  return (
    <>
      <PageHead title="My usage" intro="Your smart-meter readings, updated every hour.">
        <div className="toolbar" style={{ marginBottom: 0 }}>
          {meters.data?.meters.length > 1 && (
            <label className="field">Meter
              <select value={meter} onChange={(e) => setMeter(e.target.value)}>
                <option value="">All my meters</option>
                {meters.data.meters.map((m) => <option key={m.meter_id} value={m.meter_id}>#{m.meter_id}, {m.address}</option>)}
              </select>
            </label>
          )}
          <label className="field">Period
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option>
            </select>
          </label>
        </div>
      </PageHead>
      <ErrorNotice error={error || meters.error} />

      {s && (
        <div className="figures">
          <div className="figure"><div className="v">{fmtNum(s.total_kwh, 0)}<small>kWh</small></div><div className="l">Used in {days} days</div></div>
          <div className="figure"><div className="v">{fmtNum(s.total_kwh / Math.max(1, data.daily.length), 1)}<small>kWh</small></div><div className="l">Average per day</div></div>
          <div className="figure"><div className="v">{peakHour ? `${String(peakHour.hour).padStart(2, '0')}:00` : '-'}</div><div className="l">Your busiest hour</div></div>
          <div className={`figure ${s.voltage_issues ? 'warn' : ''}`}><div className="v">{fmtNum(s.avg_voltage)}<small>V</small></div><div className="l">Average supply voltage, {s.voltage_issues} readings out of range</div></div>
        </div>
      )}

      {data && !s && <section className="panel"><p className="empty">No readings yet for this period. Readings appear once your smart meter reports.</p></section>}

      {s && (
        <div className="stack">
          <section className="panel">
            <h2>Daily consumption</h2>
            <p className="sub">The amber bar is your highest day.</p>
            <BarChart title="Daily consumption" unit="kWh" labelEvery={Math.ceil(data.daily.length / 10)}
              data={data.daily.map((d) => ({ label: d.day, short: d.day.slice(5).replace('-', '/'), value: d.kwh }))} />
          </section>
          <section className="panel">
            <h2>Typical day</h2>
            <p className="sub">Average kWh in each hour. Shifting use away from the amber hour eases zone load.</p>
            <BarChart title="Average hourly use" unit="kWh" height={200} labelEvery={3}
              data={data.hourly.map((h) => ({ label: `${h.hour}:00`, short: String(h.hour), value: h.avg_kwh }))} />
          </section>
        </div>
      )}

      <section className="panel" style={{ marginTop: 18 }}>
        <h2>My connections</h2>
        <table>
          <thead><tr><th>Meter</th><th>Address</th><th>Zone</th><th>Zone status</th><th>Installed</th></tr></thead>
          <tbody>
            {meters.data?.meters.map((m) => (
              <tr key={m.meter_id}>
                <td>#{m.meter_id}<div className="muted">{label(m.meter_type)} meter, <Tag value={m.meter_status} /></div></td>
                <td>{m.address}</td><td>{m.zone_name}</td><td><Tag value={m.zone_status} /></td><td>{fmtDate(m.installation_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 12 }}>Power out? <Link href="/outages">Report an outage</Link></p>
      </section>
    </>
  );
}
