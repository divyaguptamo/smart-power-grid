import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Rail from '@/components/Rail';

export default async function ConsoleLayout({ children }) {
  const session = await getSession();
  if (!session) redirect('/login');
  return (
    <div className="shell">
      <Rail user={session} />
      <main className="main">{children}</main>
    </div>
  );
}
