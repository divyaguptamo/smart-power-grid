export default function AuthSide() {
  return (
    <section className="auth-side">
      <div>
        <h1>Smart Grid Console</h1>
        <p>Allocate generation to grid zones, track outages and maintenance, and read smart-meter telemetry in one place.</p>
      </div>
      {/* single-line diagram: plants feed a busbar that supplies four zones */}
      <svg viewBox="0 0 420 170" aria-hidden="true">
        <g stroke="#6fa3dc" strokeWidth="2" fill="none">
          <circle cx="40" cy="40" r="16" /><circle cx="40" cy="120" r="16" />
          <path d="M33 40c4-8 10 8 14 0M33 120c4-8 10 8 14 0" />
          <path d="M56 40h50M56 120h50M106 40v80" />
          <circle cx="136" cy="80" r="12" /><circle cx="150" cy="80" r="12" />
          <path d="M106 80h18M162 80h28" />
        </g>
        <path d="M190 22v116" stroke="#ffffff" strokeWidth="5" />
        <g stroke="#c9d3db" strokeWidth="2">
          <path d="M190 30h150M190 63h150M190 97h150M190 130h150" />
        </g>
        <g fill="#2d7a48"><circle cx="352" cy="30" r="6" /><circle cx="352" cy="63" r="6" /><circle cx="352" cy="130" r="6" /></g>
        <circle cx="352" cy="97" r="6" fill="#b77e05" />
        <g fill="#c9d3db" fontSize="11" fontFamily="Barlow, sans-serif">
          <text x="366" y="34">Residential</text><text x="366" y="67">Commercial</text>
          <text x="366" y="101">Industrial</text><text x="366" y="134">Hospital</text>
        </g>
      </svg>
    </section>
  );
}
