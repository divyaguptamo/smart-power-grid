'use client';
import { ErrorNotice, Notice, PageHead, Tag, apiFetch, fmtDate, label, useAction, useApi, useForm } from '@/components/ui';

export default function Users() {
  const list = useApi('/api/users');
  const me = useApi('/api/me');
  const action = useAction(list.reload);
  const form = useForm({ name: '', email: '', phone: '', role: 'OPERATOR', password: '' });

  return (
    <>
      <PageHead title="Users" intro="Admins add staff accounts and can deactivate any account. Consumers register themselves." />
      <ErrorNotice error={list.error} />
      <Notice message={action.message} />
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Contact</th><th>Status</th><th className="num">Allocation changes</th><th>Joined</th><th /></tr></thead>
            <tbody>
              {list.data?.users.map((u) => (
                <tr key={u.user_id}>
                  <td>{u.name}{u.consumer_type && <div className="muted">{label(u.consumer_type)} connection, {u.address}</div>}</td>
                  <td>{label(u.role)}</td>
                  <td>{u.email}<div className="muted">{u.phone || 'No phone'}</div></td>
                  <td><Tag value={u.status} /></td>
                  <td className="num">{u.changes_made}</td>
                  <td>{fmtDate(u.created_at?.slice(0, 10))}</td>
                  <td>
                    {u.user_id !== me.data?.user.userId && (
                      <button className={`btn small ${u.status === 'ACTIVE' ? 'danger' : 'ghost'}`} disabled={action.busy}
                        onClick={() => action.run(() => apiFetch(`/api/users/${u.user_id}`, { method: 'PATCH', body: { status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } }), `${u.name} updated.`)}>
                        {u.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Add a staff account</h2>
        <form className="form" onSubmit={(e) => { e.preventDefault(); action.run(async () => { await apiFetch('/api/users', { method: 'POST', body: form.values }); form.reset(); }, 'Account created.'); }}>
          <label className="field">Full name<input {...form.bind('name')} required minLength={2} /></label>
          <label className="field">Email<input type="email" {...form.bind('email')} required /></label>
          <label className="field">Mobile number<input {...form.bind('phone')} pattern="[6-9][0-9]{9}" title="10-digit mobile number" /></label>
          <label className="field">Role<select {...form.bind('role')}><option value="OPERATOR">Operator</option><option value="ADMIN">Admin</option></select></label>
          <label className="field">Temporary password<input type="password" autoComplete="new-password" {...form.bind('password')} required minLength={8} /></label>
          <div><button className="btn" disabled={action.busy}>Create account</button></div>
        </form>
      </section>
    </>
  );
}
