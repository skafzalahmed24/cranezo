import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../utils/api';
import { PageHeader, Section, Table, Badge, ErrorBox, OkBox, input, label, muted, when } from './financeUi';

const EMPTY_ROLE = { id: null, name: '', description: '', permissions: [], is_active: true };
const EMPTY_STAFF = { id: null, name: '', email: '', password: '', access_role_id: '', is_active: true };

/**
 * Admin > Admins & Roles (Super Admin only).
 *  - Roles: a role is a named set of side-menu modules (for example Finance or Support Agent)
 *  - Staff logins: each person gets their own email and password and one role; they only see and use their modules
 */
export const AdminAccess = () => {
  const [tab, setTab] = useState('staff');
  const [catalog, setCatalog] = useState([]);
  const [roles, setRoles] = useState([]);
  const [staff, setStaff] = useState([]);
  const [roleForm, setRoleForm] = useState(null);
  const [staffForm, setStaffForm] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, r, s] = await Promise.all([
        apiRequest('/admin/permissions/catalog', { method: 'POST', body: {} }),
        apiRequest('/admin/access-roles/list', { method: 'POST', body: {} }),
        apiRequest('/admin/staff/list', { method: 'POST', body: {} }),
      ]);
      setCatalog(c.data);
      setRoles(r.data);
      setStaff(s.data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const out = [];
    catalog.forEach((m) => {
      let g = out.find((x) => x.name === m.group);
      if (!g) {
        g = { name: m.group, modules: [] };
        out.push(g);
      }
      g.modules.push(m);
    });
    return out;
  }, [catalog]);

  const run = async (work, message) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await work();
      setNotice(message);
      await load();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------ roles
  const toggleModule = (key) => {
    const has = roleForm.permissions.includes(key);
    setRoleForm({ ...roleForm, permissions: has ? roleForm.permissions.filter((k) => k !== key) : [...roleForm.permissions, key] });
  };
  const toggleGroup = (g) => {
    const keys = g.modules.map((m) => m.key);
    const all = keys.every((k) => roleForm.permissions.includes(k));
    const rest = roleForm.permissions.filter((k) => !keys.includes(k));
    setRoleForm({ ...roleForm, permissions: all ? rest : [...rest, ...keys] });
  };
  const saveRole = async () => {
    const body = { name: roleForm.name, description: roleForm.description, permissions: roleForm.permissions };
    const ok = await run(
      () => (roleForm.id
        ? apiRequest(`/admin/access-roles/${roleForm.id}`, { method: 'PUT', body: { ...body, is_active: roleForm.is_active } })
        : apiRequest('/admin/access-roles', { method: 'POST', body })),
      'Role saved. It applies to every login with this role right away.'
    );
    if (ok) setRoleForm(null);
  };
  const deleteRole = (r) => {
    if (!window.confirm(`Delete the role "${r.name}"?`)) return;
    run(() => apiRequest(`/admin/access-roles/${r.id}`, { method: 'DELETE' }), 'Role deleted.');
  };

  // ------------------------------------------------------------ staff
  const saveStaff = async () => {
    const ok = await run(
      () => (staffForm.id
        ? apiRequest(`/admin/staff/${staffForm.id}`, {
          method: 'PUT',
          body: {
            name: staffForm.name, access_role_id: staffForm.is_super_admin ? undefined : Number(staffForm.access_role_id),
            is_active: staffForm.is_active, ...(staffForm.password ? { password: staffForm.password } : {}),
          },
        })
        : apiRequest('/admin/staff', {
          method: 'POST',
          body: { name: staffForm.name, email: staffForm.email, password: staffForm.password, access_role_id: Number(staffForm.access_role_id) },
        })),
      staffForm.id ? 'Login saved.' : 'Login created. Share the email and password with the person; they can sign in right away.'
    );
    if (ok) setStaffForm(null);
  };

  const roleRows = roles.map((r) => [
    <div key="n"><strong>{r.name}</strong><div style={{ ...muted, fontSize: 12 }}>{r.description || ''}</div></div>,
    `${r.permissions.length} module${r.permissions.length === 1 ? '' : 's'}`,
    r.staff_count,
    <Badge key="s" tone={r.is_active ? 'good' : 'bad'}>{r.is_active ? 'Active' : 'Off'}</Badge>,
    <div key="a" style={{ display: 'flex', gap: 8 }}>
      <button type="button" className="cranzo-btn-secondary" onClick={() => setRoleForm({ ...r })}>Edit</button>
      <button type="button" className="cranzo-btn-secondary" onClick={() => deleteRole(r)}>Delete</button>
    </div>,
  ]);

  const staffRows = staff.map((s) => [
    <div key="n"><strong>{s.name}</strong><div style={{ ...muted, fontSize: 12 }}>{s.email}</div></div>,
    s.access_role || '-',
    <Badge key="s" tone={s.is_active ? 'good' : 'bad'}>{s.is_active ? 'Active' : 'Off'}</Badge>,
    s.last_login ? when(s.last_login) : 'Never',
    <button key="a" type="button" className="cranzo-btn-secondary" onClick={() => setStaffForm({ ...s, password: '', access_role_id: s.access_role_id || '' })}>Edit</button>,
  ]);

  return (
    <div className="cranzo-content-view animate-fade-in">
      <PageHeader
        title="Admins & Roles"
        subtitle="Give each person their own login and decide which side-menu pages they can open. Only the Super Admin sees this page."
      />
      <ErrorBox message={error} />
      <OkBox message={notice} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" className={tab === 'staff' ? 'cranzo-btn-primary-amber' : 'cranzo-btn-secondary'} onClick={() => setTab('staff')}>Staff logins</button>
        <button type="button" className={tab === 'roles' ? 'cranzo-btn-primary-amber' : 'cranzo-btn-secondary'} onClick={() => setTab('roles')}>Roles</button>
      </div>

      {tab === 'staff' && !staffForm && (
        <Section title="Staff logins" right={<button type="button" className="cranzo-btn-primary" onClick={() => setStaffForm({ ...EMPTY_STAFF })} disabled={!roles.length}>New login</button>}>
          {!roles.length && <div style={{ ...muted, marginBottom: 10 }}>Create a role first (Roles tab), then add a login.</div>}
          <Table headers={['Person', 'Role', 'Status', 'Last sign-in', '']} rows={staffRows} empty="No logins yet." minWidth={640} />
        </Section>
      )}

      {tab === 'staff' && staffForm && (
        <Section title={staffForm.id ? 'Edit login' : 'New login'}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div>
              <label style={label}>Name</label>
              <input style={input} value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
            </div>
            <div>
              <label style={label}>Email (the login)</label>
              <input style={input} type="email" value={staffForm.email} disabled={!!staffForm.id} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
            </div>
            <div>
              <label style={label}>{staffForm.id ? 'New password (leave empty to keep)' : 'Password'}</label>
              <input style={input} type="password" autoComplete="new-password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} />
              <div style={{ ...muted, fontSize: 11, marginTop: 4 }}>At least 8 characters, with letters and numbers.</div>
            </div>
            {!staffForm.is_super_admin && (
              <div>
                <label style={label}>Role</label>
                <select style={input} value={staffForm.access_role_id} onChange={(e) => setStaffForm({ ...staffForm, access_role_id: e.target.value })}>
                  <option value="">Choose a role</option>
                  {roles.filter((r) => r.is_active || r.id === staffForm.access_role_id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            )}
            {staffForm.id && !staffForm.is_super_admin && (
              <div style={{ alignSelf: 'end' }}>
                <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={staffForm.is_active} onChange={(e) => setStaffForm({ ...staffForm, is_active: e.target.checked })} />
                  Can sign in
                </label>
              </div>
            )}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button type="button" className="cranzo-btn-primary" disabled={saving} onClick={saveStaff}>{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" className="cranzo-btn-secondary" onClick={() => setStaffForm(null)}>Cancel</button>
          </div>
        </Section>
      )}

      {tab === 'roles' && !roleForm && (
        <Section title="Roles" right={<button type="button" className="cranzo-btn-primary" onClick={() => setRoleForm({ ...EMPTY_ROLE })}>New role</button>}>
          <Table headers={['Role', 'Pages', 'Logins', 'Status', '']} rows={roleRows} empty="No roles yet." minWidth={640} />
        </Section>
      )}

      {tab === 'roles' && roleForm && (
        <Section title={roleForm.id ? 'Edit role' : 'New role'}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={label}>Role name</label>
              <input style={input} maxLength={60} placeholder="Finance" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} />
            </div>
            <div>
              <label style={label}>Description</label>
              <input style={input} maxLength={200} placeholder="Payments and settlements" value={roleForm.description || ''} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} />
            </div>
            {roleForm.id && (
              <div style={{ alignSelf: 'end' }}>
                <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={roleForm.is_active} onChange={(e) => setRoleForm({ ...roleForm, is_active: e.target.checked })} />
                  Role is on (switching it off stops every login with this role)
                </label>
              </div>
            )}
          </div>

          <label style={label}>Pages this role can open</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {groups.map((g) => {
              const all = g.modules.every((m) => roleForm.permissions.includes(m.key));
              return (
                <div key={g.name} style={{ border: '1px solid var(--dash-border)', borderRadius: 10, padding: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 8 }}>
                    <input type="checkbox" checked={all} onChange={() => toggleGroup(g)} />
                    {g.name}
                  </label>
                  {g.modules.map((m) => (
                    <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 13 }}>
                      <input type="checkbox" checked={roleForm.permissions.includes(m.key)} onChange={() => toggleModule(m.key)} />
                      {m.label}
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
          <div style={{ ...muted, fontSize: 12, marginTop: 10 }}>Admins & Roles and the Super Admin settings are never given to a role.</div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button type="button" className="cranzo-btn-primary" disabled={saving} onClick={saveRole}>{saving ? 'Saving…' : 'Save role'}</button>
            <button type="button" className="cranzo-btn-secondary" onClick={() => setRoleForm(null)}>Cancel</button>
          </div>
        </Section>
      )}
    </div>
  );
};

export default AdminAccess;
