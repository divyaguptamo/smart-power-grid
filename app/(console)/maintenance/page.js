'use client';
import { ErrorNotice, Notice, PageHead, Tag, apiFetch, fmtDate, label, useAction, useApi, useForm } from '@/components/ui';

export default function Maintenance() {
  const list = useApi('/api/maintenance');
  const action = useAction(list.reload);
  const form = useForm({ target: '', maintenance_type: 'ROUTINE', scheduled_date: '', performed_by: '', description: '' });

  const submit = (e) => {
    e.preventDefault();
    const [kind, id] = form.values.target.split(':');
    const body = { ...form.values, plant_id: kind === 'plant' ? id : null, resource_id: kind === 'resource' ? id : null };
    action.run(async () => { await apiFetch('/api/maintenance', { method: 'POST', body }); form.reset(); }, 'Maintenance scheduled.');
  };
  const setStatus = (m, status, text) =>
    action.run(() => apiFetch(`/api/maintenance/${m.maintenance_id}`, { method: 'PATCH', body: { status } }), text);

  return (
    <>
      <PageHead title="Maintenance" intro="Starting work on a plant takes it out of service automatically; completing it brings the plant back." />
      <ErrorNotice error={list.error} />
      <Notice message={action.message} />
      <section className="panel">
        <h2>Schedule maintenance</h2>
        <form className="form" onSubmit={submit}>
          <label className="field">Equipment
            <select {...form.bind('target')} required>
              <option value="">Choose a plant or resource</option>
              <optgroup label="Power plants">{list.data?.plants.map((p) => <option key={p.plant_id} value={`plant:${p.plant_id}`}>{p.plant_name}</option>)}</optgroup>
              <optgroup label="Backup resources">{list.data?.resources.map((r) => <option key={r.resource_id} value={`resource:${r.resource_id}`}>{r.resource_name}</option>)}</optgroup>
            </select>
          </label>
          <label className="field">Type<select {...form.bind('maintenance_type')}>{['ROUTINE', 'REPAIR', 'EMERGENCY'].map((t) => <option key={t} value={t}>{label(t)}</option>)}</select></label>
          <label className="field">Scheduled for<input type="date" {...form.bind('scheduled_date')} required /></label>
          <label className="field">Assigned to
            <select {...form.bind('performed_by')} required>
              <option value="">Choose a person</option>
              {list.data?.staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.name}</option>)}
            </select>
          </label>
          <label className="field wide">Work description<input {...form.bind('description')} maxLength={500} /></label>
          <div><button className="btn" disabled={action.busy}>Schedule</button></div>
        </form>
      </section>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Equipment</th><th>Type</th><th>Status</th><th>Scheduled</th><th>Completed</th><th>Assigned to</th><th /></tr></thead>
            <tbody>
              {list.data?.maintenance.map((m) => (
                <tr key={m.maintenance_id}>
                  <td>{m.target_name}<div className="muted">{m.target_kind}{m.description ? `: ${m.description}` : ''}</div></td>
                  <td>{label(m.maintenance_type)}</td>
                  <td><Tag value={m.status} /></td>
                  <td>{fmtDate(m.scheduled_date)}</td>
                  <td>{fmtDate(m.completion_date)}</td>
                  <td>{m.performed_by_name}</td>
                  <td>
                    <div className="actions">
                      {m.status === 'SCHEDULED' && <button className="btn small" disabled={action.busy} onClick={() => setStatus(m, 'IN_PROGRESS', 'Work started.')}>Start work</button>}
                      {m.status === 'IN_PROGRESS' && <button className="btn small" disabled={action.busy} onClick={() => setStatus(m, 'COMPLETED', 'Work completed.')}>Complete</button>}
                      {m.status === 'SCHEDULED' && (
                        <button className="btn small danger" disabled={action.busy}
                          onClick={() => confirm('Cancel this job?') && action.run(() => apiFetch(`/api/maintenance/${m.maintenance_id}`, { method: 'DELETE' }), 'Job cancelled.')}>Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
