'use client';

/** Plain SVG bar chart: data = [{ label, value }]. The highest bar is marked in amber. */
export default function BarChart({ data, unit = '', height = 180, labelEvery = 1, title }) {
  if (!data?.length) return <p className="empty">No readings in this period.</p>;
  const W = 720;
  const H = height;
  const pad = { l: 44, r: 8, t: 10, b: 26 };
  const max = Math.max(...data.map((d) => d.value), 0.0001);
  const nice = Math.ceil(max / Math.pow(10, Math.floor(Math.log10(max)))) * Math.pow(10, Math.floor(Math.log10(max)));
  const bw = (W - pad.l - pad.r) / data.length;
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / nice);

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title || 'Bar chart'}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line className="axis" x1={pad.l} x2={W - pad.r} y1={y(nice * f)} y2={y(nice * f)} />
          <text x={pad.l - 6} y={y(nice * f) + 4} textAnchor="end">{+(nice * f).toFixed(nice < 10 ? 1 : 0)}</text>
        </g>
      ))}
      {data.map((d, i) => (
        <g key={d.label}>
          <rect
            className={`bar ${d === peak ? 'peak' : ''}`}
            x={pad.l + i * bw + bw * 0.15}
            y={y(d.value)}
            width={bw * 0.7}
            height={Math.max(0, H - pad.b - y(d.value))}
          >
            <title>{`${d.label}: ${d.value} ${unit}`}</title>
          </rect>
          {i % labelEvery === 0 && (
            <text x={pad.l + i * bw + bw / 2} y={H - 8} textAnchor="middle">{d.short ?? d.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}
