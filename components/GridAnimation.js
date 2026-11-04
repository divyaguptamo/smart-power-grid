export default function GridAnimation({ className = "" }) {
  const inLines = [
    "M70,90 C190,90 260,200 420,200",
    "M70,200 L420,200",
    "M70,310 C190,310 260,200 420,200",
  ];
  const outLines = [
    { d: "M420,200 C560,200 600,70 790,70", z: "res", label: "Residential", y: 70 },
    { d: "M420,200 C560,200 600,150 790,150", z: "com", label: "Commercial", y: 150 },
    { d: "M420,200 C560,200 600,250 790,250", z: "ind", label: "Industrial", y: 250 },
    { d: "M420,200 C560,200 600,330 790,330", z: "hos", label: "Hospital", y: 330 },
  ];
  return (
    <svg viewBox="0 0 900 400" className={`grid-anim ${className}`} aria-hidden="true">
      {[...inLines, ...outLines.map((o) => o.d)].map((d, i) => (
        <path key={"b" + i} d={d} className="line" />
      ))}
      {inLines.map((d, i) => (
        <path key={"i" + i} d={d} className="flow" style={{ animationDelay: i * 0.3 + "s" }} />
      ))}
      {outLines.map((o, i) => (
        <path key={"o" + i} d={o.d} className="flow out" style={{ animationDelay: i * 0.25 + "s" }} />
      ))}
      {inLines.map((d, i) => (
        <circle key={"pi" + i} r="4" className="spark">
          <animateMotion dur={3 + i * 0.6 + "s"} repeatCount="indefinite" path={d} />
        </circle>
      ))}
      {outLines.map((o, i) => (
        <circle key={"po" + i} r="4" className="spark out">
          <animateMotion dur={3.5 + i * 0.5 + "s"} repeatCount="indefinite" path={o.d} />
        </circle>
      ))}
      {[90, 200, 310].map((y, i) => (
        <g key={"p" + i}>
          <circle cx="70" cy={y} r="18" className="plant-ring" />
          <circle cx="70" cy={y} r="9" className="node plant" style={{ animationDelay: i * 0.4 + "s" }} />
          <text x="70" y={y + 38} textAnchor="middle">Plant {String.fromCharCode(65 + i)}</text>
        </g>
      ))}
      <circle cx="420" cy="200" r="30" className="plant-ring" />
      <circle cx="420" cy="200" r="14" className="node sub" />
      <text x="420" y="252" textAnchor="middle">Substation</text>
      {outLines.map((o, i) => (
        <g key={"z" + i}>
          <circle cx="790" cy={o.y} r="9" className={`node zone ${o.z}`} style={{ animationDelay: i * 0.3 + "s" }} />
          <text x="808" y={o.y + 4}>{o.label}</text>
        </g>
      ))}
    </svg>
  );
}
