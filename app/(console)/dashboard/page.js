'use client';
import Link from 'next/link';
import { ErrorNotice, Meter, PageHead, Tag, fmtNum, fmtTime, label, mw, useApi } from '@/components/ui';

function Busbar({ z }) {
  const cap = Number(z.max_capacity_mw);
  const alloc = Number(z.allocated_power_mw);
  const demand = Number(z.current_demand_mw);
  const pct = (v) => `${Math.min(100, (v / cap) * 100)}%`;
  const deficit = demand > alloc;
  return (
    <div className="busbar">
      <div className="name">
        <span className={`lamp ${z.status}`} style={{ display: 'inline-block' }} />
        {z.zone_name}
        <span>{label(z.zone_type)}, priority {z.priority_level}{z.active_outages > 0 ? `, ${z.active_outages} active outage` : ''}</span>
      </div>
      <div className="track" role="img"
        aria-label={`${z.zone_name}: ${alloc} of ${cap} megawatts allocated, demand ${demand} megawatts`}>
        <div className={`fill ${z.status === 'OUTAGE' ? 'OUTAGE' : ''}`} style={{ width: pct(alloc) }} />
        {deficit && <div className="gap" style={{ left: pct(alloc), width: `calc(${pct(demand)} - ${pct(alloc)})` }} />}
        <div className="demand" style={{ left: pct(demand) }} title={`Demand ${demand} MW`} />
      </div>
      <div className="read">
        {fmtNum(alloc)} / {fmtNum(cap)} MW
        <span>{deficit ? `${fmtNum(demand - alloc)} MW short of demand` : `${fmtNum(z.load_pct)}% of capacity`}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, error } = useApi('/api/dashboard');
  const t = data?.totals;
  return (
    <>
      <PageHead title="Control room" intro="Live balance of generation, allocation and demand across the grid." />
      <ErrorNotice error={error} />
      {t && (
        <div className="figures">
          <div className="figure"><div className="v">{fmtNum(t.generation_mw, 0)}<small>MW</small></div><div className="l">Generating now</div></div>
          <div className="figure"><div className="v">{fmtNum(t.demand_mw, 0)}<small>MW</small></div><div className="l">Zone demand</div></div>
          <div className="figure"><div className="v">{fmtNum(t.reserve_mw, 0)}<small>MW</small></div><div className="l">Backup ready</div></div>
          <div className={`figure ${t.active_outages ? 'bad' : ''}`}><div className="v">{t.active_outages}</div><div className="l">Active outages</div></div>
          <div className={`figure ${t.pending_allocations ? 'warn' : ''}`}><div className="v">{t.pending_allocations}</div><div className="l">Allocations awaiting approval</div></div>
        </div>
      )}

      {data && (
        <>
          <section className="panel">
            <h2>Zone supply</h2>
            <p className="sub">Each rail is the zone&rsquo;s capacity. Blue is power allocated; the black tick is measured demand.</p>
            <div className="busbars">{data.zones.map((z) => <Busbar key={z.zone_id} z={z} />)}</div>
            <div className="legend">
              <span><i style={{ background: 'var(--blue)' }} />Allocated</span>
              <span><i style={{ background: 'repeating-linear-gradient(135deg, var(--amber) 0 3px, transparent 3px 7px)' }} />Unmet demand</span>
              <span><i style={{ background: 'var(--red)' }} />Zone in outage</span>
            </div>
          </section>

          <div className="grid-2" style={{ marginTop: 18 }}>
            <section className="panel">
              <h2>Power plants</h2>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Plant</th><th>Status</th><th>Utilisation</th><th className="num">Uncommitted</th></tr></thead>
                  <tbody>
                    {data.plants.map((p) => (
                      <tr key={p.plant_id}>
                        <td>{p.plant_name}<div className="muted">{label(p.plant_type)}, {p.location}</div></td>
                        <td><Tag value={p.status} /></td>
                        <td><Meter pct={p.utilization_pct} />{fmtNum(p.utilization_pct)}%</td>
                        <td className="num">{mw(p.headroom_mw)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel">
              <h2>Unacknowledged grid events</h2>
              {!data.events.available ? (
                <p className="empty">Telemetry store is offline; events will appear when MongoDB is reachable.</p>
              ) : data.events.latest.length === 0 ? (
                <p className="empty">Nothing needs attention.</p>
              ) : (
                <>
                  <p className="sub">{data.events.unacknowledged} open. Latest:</p>
                  <table><tbody>
                    {data.events.latest.map((e) => (
                      <tr key={e.id}>
                        <td><Tag value={e.severity} /></td>
                        <td>{e.message}<div className="muted">{label(e.type)}, {fmtTime(e.ts)}</div></td>
                      </tr>
                    ))}
                  </tbody></table>
                  <p style={{ marginTop: 10 }}><Link href="/analytics">Review all events</Link></p>
                </>
              )}
            </section>
          </div>

          <div className="grid-even" style={{ marginTop: 18 }}>
            <section className="panel">
              <h2>Allocations by status</h2>
              <table>
                <thead><tr><th>Status</th><th className="num">Count</th><th className="num">Power</th></tr></thead>
                <tbody>
                  {data.allocationStatus.map((s) => (
                    <tr key={s.status}><td><Tag value={s.status} /></td><td className="num">{s.count}</td><td className="num">{mw(s.total_mw)}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="panel">
              <h2>Recent allocation changes</h2>
              <p className="sub">Recorded automatically by the audit trigger.</p>
              <table><tbody>
                {data.recentChanges.map((c) => (
                  <tr key={c.log_id}>
                    <td>
                      #{c.allocation_id} {c.zone_name}: {c.old_power_mw === null ? 'created at' : `${fmtNum(c.old_power_mw)} to`} {fmtNum(c.new_power_mw)} MW
                      <div className="muted">{c.changed_by_name}, {fmtTime(c.changed_at)}{c.reason ? `: ${c.reason}` : ''}</div>
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </section>
          </div>
        </>
      )}
    </>
  );
}
