import React, { useCallback, useEffect, useState } from 'react';
import { call, when } from './ownerApi';

const LABELS = { pending: 'Waiting for approval', active: 'Active', blocked: 'Blocked' };

/** The owner's employees: approve them, choose what each one may do, block or remove them. */
export function OwnerTeam() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState({}); // staff id -> permission list being edited

  const load = useCallback(() => call('/owner/staff/list').then((r) => setData(r.data)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, okMsg) => {
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(okMsg);
      setDraft({});
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const perms = (s) => draft[s.id] || s.permissions || [];
  const toggle = (s, key) => {
    const cur = perms(s);
    setDraft({ ...draft, [s.id]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] });
  };

  if (!data && !error) return <p className="op-muted">Loading…</p>;
  return (
    <>
      <h2>My team</h2>
      <p className="op-muted">Employees join with your owner ID. You approve them and choose what each one may do. They only see your account.</p>
      {error && <div className="op-alert bad">{error}</div>}
      {notice && <div className="op-alert ok">{notice}</div>}
      {data && data.items.length === 0 && <p className="op-muted">No employees yet. Share your owner ID (in your app profile) so they can register at the “Join a team” tab of this page.</p>}
      {data && data.items.map((s) => (
        <div className="op-card" key={s.id}>
          <div className="op-row spread">
            <div>
              <h3 style={{ margin: 0 }}>{s.full_name}</h3>
              <span className="op-muted small">{s.email}{s.mobile_number ? ` · ${s.mobile_number}` : ''} · last sign-in {when(s.last_login_at)}</span>
            </div>
            <span className={`op-pill ${s.status}`}>{LABELS[s.status] || s.status}</span>
          </div>
          <div className="op-perms">
            {data.permissions.map((p) => (
              <label key={p.key} className="op-check">
                <input type="checkbox" checked={perms(s).includes(p.key)} onChange={() => toggle(s, p.key)} />
                {p.label}
              </label>
            ))}
          </div>
          <div className="op-row">
            {s.status !== 'active' && (
              <button type="button" className="op-btn" disabled={perms(s).length === 0} onClick={() => act(() => call('/owner/staff/update', { staff_id: s.id, status: 'active', permissions: perms(s) }), `${s.full_name} can sign in now.`)}>
                {s.status === 'pending' ? 'Approve' : 'Allow again'}
              </button>
            )}
            {s.status === 'active' && draft[s.id] && (
              <button type="button" className="op-btn" disabled={perms(s).length === 0} onClick={() => act(() => call('/owner/staff/update', { staff_id: s.id, permissions: perms(s) }), 'Permissions saved.')}>Save permissions</button>
            )}
            {s.status === 'active' && (
              <button type="button" className="op-btn ghost" onClick={() => act(() => call('/owner/staff/update', { staff_id: s.id, status: 'blocked' }), `${s.full_name} is blocked.`)}>Block</button>
            )}
            <button
              type="button"
              className="op-btn danger"
              onClick={() => { if (window.confirm(`Remove ${s.full_name}? They will not be able to sign in.`)) act(() => call('/owner/staff/remove', { staff_id: s.id }), 'Employee removed.'); }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
