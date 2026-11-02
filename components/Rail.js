'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/my-usage', text: 'My usage', roles: ['CONSUMER'] },
  { href: '/dashboard', text: 'Control room', roles: ['ADMIN', 'OPERATOR'] },
  { href: '/allocations', text: 'Allocations', roles: ['ADMIN', 'OPERATOR'] },
  { href: '/grid', text: 'Plants and zones', roles: ['ADMIN', 'OPERATOR'] },
  { href: '/resources', text: 'Backup resources', roles: ['ADMIN', 'OPERATOR'] },
  { href: '/outages', text: 'Outages', roles: ['ADMIN', 'OPERATOR', 'CONSUMER'] },
  { href: '/maintenance', text: 'Maintenance', roles: ['ADMIN', 'OPERATOR'] },
  { href: '/analytics', text: 'Telemetry', roles: ['ADMIN', 'OPERATOR'] },
  { href: '/users', text: 'Users', roles: ['ADMIN'] },
];

export default function Rail({ user }) {
  const pathname = usePathname();
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };
  return (
    <aside className="rail">
      <div className="brand">
        Smart Grid Console
        <small>Karnataka regional grid</small>
      </div>
      <nav className="nav" aria-label="Main">
        {LINKS.filter((l) => l.roles.includes(user.role)).map((l) => (
          <Link key={l.href} href={l.href} aria-current={pathname.startsWith(l.href) ? 'page' : undefined}>
            {l.text}
          </Link>
        ))}
      </nav>
      <div className="who">
        <strong>{user.name}</strong>
        {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
        <div><button type="button" onClick={logout}>Sign out</button></div>
      </div>
    </aside>
  );
}
