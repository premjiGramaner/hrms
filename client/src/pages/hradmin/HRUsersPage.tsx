import React, { useEffect, useState } from 'react';
import Layout, { TabItem } from '../../components/Layout';
import { getHRUsers } from '../../api/hradmin.api';

interface HRUser { id: number; username: string; name?: string; email: string; role: string; is_active: boolean; }

const TABS: TabItem[] = [
  { label: 'Users', path: '/hradmin/users' },
  { label: 'Manage User Roles', path: '/roles' },
  { label: 'Job', path: '#' },
  { label: 'Organization', path: '#' },
  { label: 'More', path: '#' },
];

export default function HRUsersPage() {
  const [users, setUsers] = useState<HRUser[]>([]);
  const [filtered, setFiltered] = useState<HRUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    getHRUsers().then(r => { setUsers(r.data); setFiltered(r.data); }).finally(() => setLoading(false));
  };
  useEffect(fetchUsers, []);

  const handleSearch = (v: string) => {
    setSearch(v);
    const t = v.toLowerCase();
    setFiltered(users.filter(u => u.username.toLowerCase().includes(t) || (u.name || '').toLowerCase().includes(t)));
  };

  return (
    <Layout title="HR Administration" tabs={TABS} activeTab="Users" onFab={() => setShowModal(true)}>
      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', width: 280 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input type="text" placeholder="Search users…" value={search} onChange={e => handleSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13.5, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              {['', '', 'Username ↑', 'User Role(s)', 'Employee Name', 'Status', 'Regions', ''].map((h, i) => (
                <th key={i} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  {i === 1 ? <input type="checkbox" style={{ accentColor: '#1b2a6b', width: 14, height: 14 }} /> : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No users found</td></tr>
            )}
            {!loading && filtered.map((user, i) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#fff' : '#fafbff' }}>
                <td style={{ padding: '12px 16px' }}></td>
                <td style={{ padding: '12px 16px' }}><input type="checkbox" style={{ accentColor: '#1b2a6b', width: 14, height: 14 }} /></td>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1e293b' }}>{user.username}</td>
                <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12.5 }}>
                  {user.role === 'hradmin' ? 'Default ESS, Default Supervisor, Global Admin'
                    : user.role === 'empmanager' ? 'Default ESS, Default Supervisor' : 'Default ESS'}
                </td>
                <td style={{ padding: '12px 16px', color: '#374151' }}>{user.name || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: user.is_active ? '#16a34a' : '#94a3b8' }}>
                    {user.is_active ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>—</td>
                <td style={{ padding: '12px 16px' }}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, padding: 4 }}>✎</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <AddUserModal onClose={() => setShowModal(false)} onSaved={fetchUsers} />}
    </Layout>
  );
}

/* ── Add User Modal ── */
function AddUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    employee_name: '', username: '',
    ess_role: 'Default ESS', supervisor_role: 'Default Supervisor',
    admin_role: '', status: 'Enabled', set_password: true,
  });
  const [saving, setSaving] = useState(false);

  const inp = (value: string, onChange: (v: string) => void, placeholder = '') => (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13.5, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
  );

  const sel = (value: string, onChange: (v: string) => void, opts: string[]) => (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px 32px 10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13.5, outline: 'none', appearance: 'none', background: '#fff', boxSizing: 'border-box' }}>
        {opts.map(o => <option key={o} value={o}>{o || '-- Select --'}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8', fontSize: 11 }}>▼</span>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1b2a6b' }}>Add User</h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: 14, color: '#64748b' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Row>
            <Field label="Employee Name" required>{inp(form.employee_name, v => setForm(f => ({ ...f, employee_name: v })), 'Type for hints…')}</Field>
            <Field label="Username" required>{inp(form.username, v => setForm(f => ({ ...f, username: v })))}</Field>
          </Row>
          <Row>
            <Field label="ESS Role" required>{sel(form.ess_role, v => setForm(f => ({ ...f, ess_role: v })), ['Default ESS', 'Custom ESS'])}</Field>
            <Field label="Supervisor Role" required>{sel(form.supervisor_role, v => setForm(f => ({ ...f, supervisor_role: v })), ['Default Supervisor', 'Custom Supervisor'])}</Field>
          </Row>
          <Row>
            <Field label="Admin Role">{sel(form.admin_role, v => setForm(f => ({ ...f, admin_role: v })), ['', 'Global Admin', 'HR Admin'])}</Field>
            <Field label="Status">
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingTop: 6 }}>
                {['Enabled', 'Disabled'].map(v => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, cursor: 'pointer', color: '#374151' }}>
                    <input type="radio" name="add_status" value={v} checked={form.status === v}
                      onChange={() => setForm(f => ({ ...f, status: v }))}
                      style={{ accentColor: '#1b2a6b', width: 15, height: 15 }} />
                    {v}
                  </label>
                ))}
              </div>
            </Field>
          </Row>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer', color: '#374151' }}>
            <input type="checkbox" checked={form.set_password} onChange={e => setForm(f => ({ ...f, set_password: e.target.checked }))}
              style={{ accentColor: '#1b2a6b', width: 15, height: 15 }} />
            Set password on first login
          </label>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}><span style={{ color: '#ef4444' }}>*</span> Required</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose}
              style={{ padding: '9px 22px', borderRadius: 999, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', color: '#64748b' }}>
              Cancel
            </button>
            <button onClick={() => { onSaved(); onClose(); }} disabled={saving}
              style={{ padding: '9px 28px', borderRadius: 999, border: 'none', background: 'linear-gradient(90deg,#1b2a6b,#16a085)', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>{children}</div>;
}
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: '#4a5568' }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}
