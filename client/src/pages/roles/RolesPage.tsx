import React, { useEffect, useState } from 'react';
import Layout, { TabItem } from '../../components/Layout';
import { getRoles, createRole, deleteRole } from '../../api/role.api';
import { UserRole } from '../../types';
import { getApiErrorMessage } from '../../utils/errors';
import { validateRole } from '../../validations/role.validation';

const TABS: TabItem[] = [
  { label: 'Users', path: '/hradmin/users' },
  { label: 'Manage User Roles', path: '/roles' },
  { label: 'Job', path: '#' },
  { label: 'Organization', path: '#' },
  { label: 'More', path: '#' },
];

export default function RolesPage() {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchRoles = () => { setLoading(true); getRoles().then(response => setRoles(response.data)).finally(() => setLoading(false)); };
  useEffect(fetchRoles, []);

  const typeBadge = (roleType?: string): React.CSSProperties =>
    roleType === 'System' ? { background: '#fef2f2', color: '#b91c1c' } :
    roleType === 'Management' ? { background: '#fefce8', color: '#92400e' } :
    { background: '#f0fdf4', color: '#15803d' };

  return (
    <Layout title="HR Administration" tabs={TABS} activeTab="Manage User Roles" onFab={() => setShowModal(true)}>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {['', '#', 'Role Name', 'Role Type', 'Description', 'Status', ''].map((header, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 text-nowrap">
                  {i === 0 ? <input type="checkbox" className="w-3.5 h-3.5 accent-blue-900" /> : header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading…</td></tr>}
            {!loading && roles.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-slate-400">No roles found</td></tr>}
            {!loading && roles.map((role, i) => (
              <tr key={role.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className="px-4 py-3"><input type="checkbox" className="w-3.5 h-3.5 accent-blue-900" /></td>
                <td className="px-4 py-3 text-slate-400 text-xs">{role.id}</td>
                <td className="px-4 py-3 font-semibold text-blue-900">{role.role_name}</td>
                <td className="px-4 py-3">
                  <span style={typeBadge(role.role_type)} className="rounded-full px-2.5 py-0.5 text-xs font-semibold inline-block">
                    {role.role_type || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 text-sm">{role.description || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold ${role.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                    {role.is_active ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button className="bg-none border-none cursor-pointer text-slate-400 text-base hover:text-slate-600 transition">✎</button>
                  <button
                    onClick={() => { if (confirm('Delete?')) deleteRole(role.id).then(fetchRoles); }}
                    className="bg-none border-none cursor-pointer text-red-300 text-base hover:text-red-500 transition"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <AddRoleModal onClose={() => setShowModal(false)} onSaved={fetchRoles} />}
    </Layout>
  );
}

function AddRoleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ role_name: '', role_type: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const validationError = validateRole(form.role_name);
    if (validationError) { setError(validationError); return; }
    setSaving(true);
    try { await createRole(form); onSaved(); onClose(); }
    catch (e: unknown) { setError(getApiErrorMessage(e, 'Failed.')); }
    finally { setSaving(false); }
  };

  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-6 pt-5 pb-0 flex items-center justify-between">
          <h2 className="m-0 text-lg font-bold text-blue-900">Add Role</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-100 border-none cursor-pointer text-sm text-slate-600 hover:bg-slate-200 transition">✕</button>
        </div>
        <div className="px-6 py-4.5 flex flex-col gap-3.5">
          {error && <div className="px-3 py-2 bg-red-50 text-red-900 rounded border-l-4 border-red-300 text-sm">{error}</div>}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.25">Role Name <span className="text-red-600">*</span></label>
            <input
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none bg-white focus:border-teal-600 focus:shadow-sm focus:shadow-teal-600/20 transition"
              placeholder="e.g. HR Admin"
              value={form.role_name}
              onChange={e => setForm(formState => ({ ...formState, role_name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.25">Role Type</label>
              <div className="relative">
                <select
                  className="w-full px-3 py-2.5 pr-7 border border-slate-200 rounded-lg text-sm outline-none bg-white appearance-none focus:border-teal-600 focus:shadow-sm focus:shadow-teal-600/20 transition"
                  value={form.role_type}
                  onChange={e => setForm(formState => ({ ...formState, role_type: e.target.value }))}
                >
                  <option value="">-- Select --</option>
                  <option>System</option>
                  <option>Management</option>
                  <option>User</option>
                </select>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.25">Description</label>
              <input
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none bg-white focus:border-teal-600 focus:shadow-sm focus:shadow-teal-600/20 transition"
                value={form.description}
                onChange={e => setForm(formState => ({ ...formState, description: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400"><span className="text-red-600">*</span> Required</span>
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="px-5.5 py-2 rounded-full border border-slate-200 bg-white text-sm font-semibold cursor-pointer text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-7 py-2 rounded-full border-none bg-gradient-to-r from-blue-900 to-teal-600 text-white text-sm font-bold cursor-pointer hover:shadow-lg transition disabled:opacity-70"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
