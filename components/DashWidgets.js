'use client';
import { useEffect, useRef, useState } from 'react';

const jitter = (v, amt) => v + (Math.random() - 0.5) * 2 * amt;

export function CountUp({ value, decimals = 0, duration = 900 }) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const to = Number(value) || 0;
    const from = prev.current;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setV(from + (to - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}

export function LiveClock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="live-clock">
      <span className="live-badge"><i className="live-dot" /> Live</span>
      <time>{now ? now.toLocaleTimeString('en-IN', { hour12: false }) : '--:--:--'}</time>
      <em>{now ? now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}</em>
    </div>
  );
}

export function Gauge({ value, min = 0, max = 100, unit = '', label, warn, danger, decimals = 0 }) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const state = danger != null && value >= danger ? 'hot' : warn != null && value >= warn ? 'warn' : 'ok';
  return (
    <div className={`gauge ${state}`}>
      <svg viewBox="0 0 200 118" aria-hidden="true">
        <path d="M20,100 A80,80 0 0 1 180,100" pathLength="100" className="g-bg" />
        <path d="M20,100 A80,80 0 0 1 180,100" pathLength="100" className="g-val" style={{ strokeDasharray: `${pct * 100} 100` }} />
        <g className="g-needle" style={{ transformOrigin: '100px 100px', transform: `rotate(${180 * pct}deg)` }}>
          <line x1="100" y1="100" x2="36" y2="100" />
        </g>
        <circle cx="100" cy="100" r="6" className="g-hub" />
      </svg>
      <div className="gv">{value.toFixed(decimals)}<small>{unit}</small></div>
      <div className="gl">{label}</div>
    </div>
  );
}

function Spark({ a, b }) {
  const all = [...a, ...b];
  const lo = Math.min(...all) * 0.97;
  const hi = Math.max(...all) * 1.03 || 1;
  const W = 400;
  const H = 90;
  const pts = (arr) => arr.map((v, i) => [(i / (arr.length - 1)) * W, H - ((v - lo) / (hi - lo || 1)) * H]);
  const line = (arr) => pts(arr).map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg className="spark-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${line(a)} L${W},${H} L0,${H} Z`} className="spark-area" />
      <path d={line(a)} className="spark-gen" vectorEffect="non-scaling-stroke" />
      <path d={line(b)} className="spark-dem" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function LoadTrend({ gen, demand }) {
  const N = 40;
  const [s, setS] = useState({ g: Array(N).fill(gen), d: Array(N).fill(demand) });
  const latest = useRef({ gen, demand });
  latest.current = { gen, demand };
  useEffect(() => {
    const t = setInterval(() => {
      setS((p) => ({
        g: [...p.g.slice(1), jitter(latest.current.gen, latest.current.gen * 0.015)],
        d: [...p.d.slice(1), jitter(latest.current.demand, latest.current.demand * 0.03)],
      }));
    }, 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <Spark a={s.g} b={s.d} />
      <div className="trend-legend">
        <span><i className="lg-gen" />Generation {Math.round(gen)} MW</span>
        <span><i className="lg-dem" />Demand {Math.round(demand)} MW</span>
        <span>Margin {Math.round(gen - demand)} MW</span>
      </div>
    </>
  );
}

export function ZoneHeat({ zones }) {
  return (
    <div className="heat-grid">
      {zones.map((z) => {
        const cap = Number(z.max_capacity_mw);
        const alloc = Number(z.allocated_power_mw);
        const demand = Number(z.current_demand_mw);
        const load = cap ? (alloc / cap) * 100 : 0;
        const out = z.status === 'OUTAGE';
        const hue = Math.max(0, 140 - load * 1.4);
        return (
          <div key={z.zone_id} className={`heat-tile${out ? ' out' : ''}`} style={{ '--h': hue }}>
            <div className="ht-top">
              <span className="ht-name">{z.zone_name}</span>
              <span className="ht-type">{String(z.zone_type).toLowerCase().replace(/_/g, ' ')}</span>
            </div>
            <div className="ht-load"><CountUp value={load} /><small>%</small></div>
            <div className="ht-sub">
              {Math.round(alloc)} / {Math.round(cap)} MW
              {demand > alloc ? ` - ${Math.round(demand - alloc)} MW short` : ''}
            </div>
            {out && <div className="ht-flag">Outage</div>}
          </div>
        );
      })}
    </div>
  );
}

const level = (v, w, d) => (v >= d ? 2 : v >= w ? 1 : 0);

export function ThermalUnit({ plant }) {
  const util = Number(plant?.utilization_pct) || 75;
  const [n, setN] = useState([0, 0, 0, 0, 0]);
  useEffect(() => {
    const t = setInterval(
      () => setN([(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 0.6]),
      1600
    );
    return () => clearInterval(t);
  }, []);
  const temp = 440 + util * 1.2 + n[0];
  const pressure = 120 + util * 0.55 + n[1];
  const rpm = 3000 + n[2];
  const flue = 100 + util * 0.45 + n[3];
  const eff = 33 + util * 0.07 + n[4];
  const worst = Math.max(level(temp, 560, 580), level(pressure, 175, 185), level(rpm, 3150, 3250), level(flue, 160, 190));
  const alarm = ['ok', 'warn', 'hot'][worst];
  const alarmText = ['All parameters normal', 'Elevated reading', 'High reading alarm'][worst];
  const flame = 0.45 + (Math.min(util, 110) / 100) * 0.9;

  return (
    <>
      <div className="thermal-head">
        <h2>Thermal unit: {plant?.plant_name || 'Thermal power station'}</h2>
        <span className={`alarm ${alarm}`}>{alarmText}</span>
      </div>
      <div className="thermal-body">
        <svg className="thermal-flow" viewBox="0 0 520 160" aria-hidden="true">
          <rect x="20" y="30" width="110" height="90" rx="8" className="t-box" />
          <rect x="26" y="62" width="98" height="52" rx="4" className="t-water" />
          <g style={{ transform: `scaleY(${flame})`, transformOrigin: '75px 120px' }}>
            {[45, 75, 105].map((x, i) => (
              <g key={x} className="flame" style={{ animationDelay: i * 0.18 + 's' }}>
                <path d={`M${x},122 Q${x - 11},102 ${x},82 Q${x + 11},102 ${x},122Z`} className="fl-out" />
                <path d={`M${x},122 Q${x - 5},108 ${x},96 Q${x + 5},108 ${x},122Z`} className="fl-in" />
              </g>
            ))}
          </g>
          <path d="M130,60 H256" className="t-steam" />
          <circle cx="290" cy="75" r="34" className="t-box" />
          <g>
            <animateTransform attributeName="transform" type="rotate" from="0 290 75" to="360 290 75" dur="1.2s" repeatCount="indefinite" />
            <path d="M290,45 V105 M260,75 H320 M269,54 L311,96 M311,54 L269,96" className="t-blade" />
          </g>
          <path d="M324,75 H345" className="t-steam" />
          <rect x="345" y="50" width="60" height="50" rx="6" className="t-box" />
          <text x="375" y="80" className="t-gen">GEN</text>
          <path d="M300,108 C310,125 400,125 430,100" className="t-steam" />
          <rect x="420" y="45" width="80" height="60" rx="6" className="t-box" />
          <path d="M432,58 H488 M432,72 H488 M432,86 H488" className="t-tube" />
          <path d="M485,105 V135 H12 V90 H20" className="t-return" />
          <g className="t-lbl">
            <text x="75" y="152">Boiler</text>
            <text x="290" y="152">Turbine</text>
            <text x="375" y="152">Generator</text>
            <text x="460" y="152">Condenser</text>
          </g>
        </svg>
        <div className="gauges">
          <Gauge value={temp} min={0} max={600} unit=" C" label="Boiler temperature" warn={560} danger={580} />
          <Gauge value={pressure} min={0} max={200} unit=" bar" label="Steam pressure" warn={175} danger={185} />
          <Gauge value={rpm} min={0} max={3600} unit=" rpm" label="Turbine speed" warn={3150} danger={3250} />
          <Gauge value={flue} min={0} max={250} unit=" C" label="Flue gas temperature" warn={160} danger={190} />
        </div>
      </div>
      <div className="thermal-foot">
        <span>Thermal efficiency <b>{eff.toFixed(1)}%</b></span>
        <span>Plant utilisation <b>{util.toFixed(1)}%</b></span>
        <span className="sim-note">Boiler, steam and turbine readings are simulated from the plant utilisation for this demo; they are not stored in the database.</span>
      </div>
    </>
  );
}
