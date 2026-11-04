'use client';
import { useEffect, useState } from 'react';

const frac = (n) => n - Math.floor(n);
const TOWERS = [600, 830, 1060];
const CITY = [[1230, 44, 150], [1282, 38, 230], [1330, 52, 180], [1390, 40, 270]];
const TURBINES = [[505, 0.8, 7], [690, 1, 9], [940, 0.9, 8], [1000, 0.7, 6]];
const MESH = [[620, 160], [720, 110], [820, 170], [910, 120], [970, 215], [700, 235], [830, 270], [600, 265]];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 0], [5, 6], [2, 6], [6, 4], [0, 7], [7, 5]];
const ZONES = [['Residential', 120, 170], ['Commercial', 95, 140], ['Industrial', 160, 200], ['Hospital', 45, 70]];
const EVENTS = [
  'Plant B ramped to 142 MW',
  'Zone Hospital: supply stable',
  'Maintenance window closed: Plant C',
  'Industrial zone peak shaving active',
  'Substation 2 load balanced',
  'Smart meters reporting: 100%',
];

const span = (x1, x2, y) => `M${x1},${y} Q${(x1 + x2) / 2},${y + 46} ${x2},${y}`;
const SPANS = [];
[[625, 34], [660, 26]].forEach(([y, d]) => {
  const pts = [470, ...TOWERS.flatMap((x) => [x - d, x + d]), 1135];
  for (let i = 0; i < pts.length; i += 2) SPANS.push(span(pts[i], pts[i + 1], y));
});

const STARS = Array.from({ length: 80 }, (_, i) => ({
  x: Number((frac(Math.sin(i * 12.9898) * 43758.5453) * 1440).toFixed(1)),
  y: Number((frac(Math.sin(i * 78.233) * 12345.6789) * 480).toFixed(1)),
  r: Number((0.8 + frac(i * 0.37) * 1.4).toFixed(1)),
  d: Number((frac(i * 0.61) * 4).toFixed(1)),
}));

const WINDOWS = [];
CITY.forEach(([x, w, h], b) => {
  const cols = Math.floor((w - 10) / 14);
  const rows = Math.floor((h - 16) / 18);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = b * 100 + r * 10 + c;
      if (frac(Math.sin(k * 3.7) * 9999) > 0.35) {
        WINDOWS.push({ x: x + 8 + c * 14, y: 760 - h + 10 + r * 18, d: Number((frac(k * 0.173) * 5).toFixed(1)) });
      }
    }
  }
});

function Tower({ x }) {
  return (
    <g transform={`translate(${x},600)`} className="tower">
      <path d="M-22,160 L-4,0 M22,160 L4,0 M-18,120 L18,80 M18,120 L-18,80 M-12,60 L12,30 M12,60 L-12,30 M-34,25 H34 M-26,60 H26" />
      {[[-34, 25], [34, 25], [-26, 60], [26, 60]].map(([cx, cy]) => (
        <circle key={cx + '_' + cy} cx={cx} cy={cy} r="3" className="ins" />
      ))}
    </g>
  );
}

function Turbine({ x, s, dur }) {
  return (
    <g transform={`translate(${x},760) scale(${s})`} className="turb">
      <path d="M-3,0 L-1.5,-120 H1.5 L3,0 Z" className="turb-mast" />
      <g transform="translate(0,-120)">
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur={dur + 's'} repeatCount="indefinite" />
          <path d="M0,0 L0,-52 M0,0 L45,26 M0,0 L-45,26" className="turb-blade" />
        </g>
        <circle r="4" className="turb-hub" />
      </g>
    </g>
  );
}

export default function AuthSide() {
  const [m, setM] = useState({ load: 428, freq: 50.0 });
  const [zl, setZl] = useState(ZONES.map((z) => z[1]));
  const [ev, setEv] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setM({ load: Math.round(415 + Math.random() * 45), freq: 49.95 + Math.random() * 0.1 });
      setZl(ZONES.map(([, base]) => Math.round(base * (0.85 + Math.random() * 0.3))));
    }, 1500);
    const e = setInterval(() => setEv((i) => (i + 1) % EVENTS.length), 3500);
    return () => { clearInterval(t); clearInterval(e); };
  }, []);

  return (
    <section className="auth-side">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="shoot s1" /><div className="shoot s2" /><div className="shoot s3" />

      <svg className="scene" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} className="twinkle" style={{ animationDelay: s.d + 's' }} />
        ))}
        <circle cx="1120" cy="130" r="34" className="moon" />

        <text x="600" y="92" className="mesh-label">GRID TOPOLOGY - LIVE</text>
        {EDGES.map(([a, b], i) => (
          <line key={'e' + i} x1={MESH[a][0]} y1={MESH[a][1]} x2={MESH[b][0]} y2={MESH[b][1]} className="mesh-line" style={{ animationDelay: (i % 5) * 0.3 + 's' }} />
        ))}
        {EDGES.map(([a, b], i) => (
          <circle key={'p' + i} r="3" className="spark">
            <animateMotion dur={3 + (i % 4) * 0.8 + 's'} repeatCount="indefinite" path={`M${MESH[a][0]},${MESH[a][1]} L${MESH[b][0]},${MESH[b][1]}`} />
          </circle>
        ))}
        {MESH.map(([x, y], i) => (
          <g key={'n' + i}>
            <circle cx={x} cy={y} r="11" className="mesh-ring" />
            <circle cx={x} cy={y} r="5" className="mesh-node" style={{ animationDelay: i * 0.35 + 's' }} />
          </g>
        ))}

        <ellipse cx="720" cy="760" rx="820" ry="90" className="horizon" />

        {TURBINES.map(([x, s, d]) => <Turbine key={x} x={x} s={s} dur={d} />)}

        {CITY.map(([x, w, h], i) => (
          <rect key={i} x={x} y={760 - h} width={w} height={h} className="bldg" />
        ))}
        {WINDOWS.map((w, i) => (
          <rect key={i} x={w.x} y={w.y} width="7" height="9" className="win" style={{ animationDelay: w.d + 's' }} />
        ))}

        <path d="M300,760 C330,690 330,620 318,560 H402 C390,620 390,690 420,760 Z" className="cooling" />
        <rect x="426" y="580" width="16" height="180" className="chimney" />
        <circle cx="434" cy="574" r="4" className="beacon" />
        {[0, 1.6, 3.2].map((d, i) => (
          <circle key={i} cx={345 + i * 12} cy="548" r="16" className="steam" style={{ animationDelay: d + 's' }} />
        ))}

        <rect x="440" y="712" width="60" height="48" className="bldg" />
        <path d="M470,615 V712" className="pole" />
        <circle cx="470" cy="625" r="3" className="ins" /><circle cx="470" cy="660" r="3" className="ins" />

        {TOWERS.map((x) => <Tower key={x} x={x} />)}

        {SPANS.map((d, i) => <path key={'b' + i} d={d} className="wire-base" />)}
        {SPANS.map((d, i) => <path key={'f' + i} d={d} className="wire-flow" style={{ animationDelay: (i % 4) * 0.2 + 's' }} />)}
        {SPANS.map((d, i) => (
          <circle key={'s' + i} r="4" className="spark">
            <animateMotion dur={2.5 + (i % 4) * 0.7 + 's'} repeatCount="indefinite" path={d} />
          </circle>
        ))}

        <rect x="1110" y="712" width="70" height="48" className="bldg" />
        <path d="M1135,615 V712" className="pole" />
        <circle cx="1135" cy="625" r="3" className="ins" /><circle cx="1135" cy="660" r="3" className="ins" />
        {[1125, 1145, 1165].map((x) => <circle key={x} cx={x} cy="735" r="7" className="xfmr" />)}

        <rect x="0" y="760" width="1440" height="140" className="ground" />
        <line x1="0" y1="760" x2="1440" y2="760" className="ground-line" />
      </svg>

      <div className="auth-left">
        <div className="auth-intro">
          <span className="live-badge"><i className="live-dot" /> Grid online</span>
          <h1>Smart Grid Console</h1>
          <p>Allocate generation to grid zones, track outages and maintenance, and read smart-meter telemetry in one place.</p>
        </div>
        <div className="auth-zones" title="Simulated values for the sign-in screen">
          <div className="zones-head"><span>Live zone load</span><em>MW</em></div>
          {ZONES.map(([name, , cap], i) => (
            <div className="zrow" key={name}>
              <span className="zname">{name}</span>
              <div className="zbar"><i className={zl[i] / cap > 0.88 ? 'hot' : ''} style={{ width: Math.min(100, (zl[i] / cap) * 100) + '%' }} /></div>
              <b>{zl[i]}</b>
            </div>
          ))}
          <div className="zevent" key={ev}>{EVENTS[ev]}</div>
        </div>
      </div>

      <div className="auth-hud" title="Simulated values for the sign-in screen">
        <div><b>{m.load}<small> MW</small></b><span>System load</span></div>
        <div><b>{m.freq.toFixed(2)}<small> Hz</small></b><span>Frequency</span></div>
        <div><b>3<small>/3</small></b><span>Plants online</span></div>
        <div><b>4</b><span>Zones supplied</span></div>
      </div>
    </section>
  );
}
