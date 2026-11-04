'use client';
import Link from 'next/link';
import { ErrorNotice, PageHead, Tag, fmtNum, fmtTime, label, mw, useApi } from '@/components/ui';
import { CountUp, LiveClock, LoadTrend, ThermalUnit, ZoneHeat } from '@/components/DashWidgets';

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

function PlantCard({ p }) {
  const u = Math.min(100, Number(p.utilization_pct) || 0);
  const warm = /thermal/i.test(String(p.plant_type));
  const idle = String(p.status).toUpperCase() !== 'ACTIVE';
  return (
    <div className={`plant-card${warm ? ' warm' : ''}${idle ? ' idle' : ''}`}>
      <div className="ring-wrap">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="26" className="ring-bg" />
          <circle cx="32" cy="32" r="26" pathLength="100" className="ring-fg" style={{ strokeDasharray: `${u} 100` }} transform="rotate(-90 32 32)" />
        </svg>
        <b>{fmtNum(u, 0)}%</b>
      </div>
      <div className="pc-body">
        <div className="pc-name">{p.plant_name}</div>
        <div className="pc-sub">{label(p.plant_type)}, {p.location}</div>
        <div className="pc-row"><Tag value={p.status} /><span>{mw(p.headroom_mw)} uncommitted</span></div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, error } = useApi('/api/dashboard');
  const t = data?.totals;
  const gen = Number(t?.generation_mw) || 0;
  const dem = Number(t?.demand_mw) || 0;
  const res = Number(t?.reserve_mw) || 0;
  const outs = Number(t?.active_outages) || 0;
  const pend = Number(t?.pending_allocations) || 0;
  const thermal = data?.plants?.find((p) => /thermal/i.test(String(p.plant_type))) || data?.plants?.[0];

  return (
    <>
      <div className="dash-top">
        <PageHead title="Control room" intro="Live balance of generation, allocation and demand across the grid." />
        <LiveClock />
      </div>
      <ErrorNotice error={error} />

      {t && (
        <div className="kpis">
          <div className="kpi k-gen">
            <div className="kl">Generating now</div>
            <div className="kv"><CountUp value={gen} /><small>MW</small></div>
            <div className="ks">{gen ? Math.round((dem / gen) * 100) : 0}% of it is demanded</div>
            <div className="kbar"><i style={{ width: `${gen + res ? Math.min(100, (gen / (gen + res)) * 100) : 0}%` }} /></div>
          </div>
          <div className="kpi k-dem">
            <div className="kl">Zone demand</div>
            <div className="kv"><CountUp value={dem} /><small>MW</small></div>
            <div className="ks">Measured across all zones</div>
            <div className="kbar"><i style={{ width: `${gen ? Math.min(100, (dem / gen) * 100) : 0}%` }} /></div>
          </div>
          <div className="kpi k-res">
            <div className="kl">Backup ready</div>
            <div className="kv"><CountUp value={res} /><small>MW</small></div>
            <div className="ks">Reserve resources available</div>
            <div className="kbar"><i style={{ width: `${gen + res ? Math.min(100, (res / (gen + res)) * 100) : 0}%` }} /></div>
          </div>
          <Link href="/outages" className={`kpi k-out${outs ? ' alert' : ''}`}>
            <div className="kl">Active outages</div>
            <div className="kv"><CountUp value={outs} /></div>
            <div className="ks">{outs ? 'Zones affected right now' : 'All zones healthy'}</div>
            <div className="kbar"><i style={{ width: `${Math.min(100, outs * 25)}%` }} /></div>
          </Link>
          <Link href="/allocations" className="kpi k-pen">
            <div className="kl">Awaiting approval</div>
            <div className="kv"><CountUp value={pend} /></div>
            <div className="ks">Allocations pending</div>
            <div className="kbar"><i style={{ width: `${Math.min(100, pend * 25)}%` }} /></div>
          </Link>
        </div>
      )}

      {data && (
        <>
          <div className="dash-row">
            <section className="panel">
              <h2>Zone heat map</h2>
              <p className="sub">Tile colour shows how much of each zone&rsquo;s capacity is allocated: green is light, red is near the limit.</p>
              <ZoneHeat zones={data.zones} />
            </section>
            <section className="panel">
              <h2>Generation and demand</h2>
              <p className="sub">Rolling live view around the current figures.</p>
              <LoadTrend gen={gen} demand={dem} />
            </section>
          </div>

          {thermal && (
            <section className="panel" style={{ marginBottom: 18 }}>
              <ThermalUnit plant={thermal} />
            </section>
          )}

          <section className="panel">
            <h2>Zone supply</h2>
            <p className="sub">Each rail is the zone&rsquo;s capacity. Blue is power allocated; the tick is measured demand.</p>
            <div className="busbars">{data.zones.map((z) => <Busbar key={z.zone_id} z={z} />)}</div>
            <div className="legend">
              <span><i style={{ background: 'var(--blue)' }} />Allocated</span>
              <span><i style={{ background: 'repeating-linear-gradient(135deg, var(--amber) 0 3px, transparent 3px 7px)' }} />Unmet demand</span>
              <span><i style={{ background: 'var(--red)' }} />Zone in outage</span>
            </div>
          </section>

          <section className="panel" style={{ marginTop: 18 }}>
            <h2>Power plants</h2>
            <div className="plants">{data.plants.map((p) => <PlantCard key={p.plant_id} p={p} />)}</div>
          </section>

          <div className="grid-2" style={{ marginTop: 18 }}>
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

          <section className="panel" style={{ marginTop: 18 }}>
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
        </>
      )}
    </>
  );
}
