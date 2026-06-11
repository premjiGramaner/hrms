import React, { useEffect, useState } from 'react';
import Layout, { TabItem } from '../../components/Layout';
import { getAuditTrail } from '../../api/hradmin.api';

const TABS: TabItem[] = [
  { label: 'Users', path: '/hradmin/users' },
  { label: 'Manage User Roles', path: '/roles' },
  { label: 'Job', path: '#' },
  { label: 'Organization', path: '#' },
  { label: 'Audit Trail', path: '/hradmin/audit-trail' },
];

interface Rec { id: number; name?: string; username: string; created_on: string; updated_on: string; }

export default function AuditTrailPage() {
  const [records, setRecords] = useState<Rec[]>([]);
  const [filtered, setFiltered] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAuditTrail().then(r => { setRecords(r.data); setFiltered(r.data); }).finally(() => setLoading(false));
  }, []);

  const handleSearch = (v: string) => {
    setSearch(v); const t = v.toLowerCase();
    setFiltered(records.filter(r => (r.name || '').toLowerCase().includes(t) || r.username.toLowerCase().includes(t)));
  };

  return (
    <Layout title="HR Administration" tabs={TABS} activeTab="Audit Trail">
      <div className="mb-4 w-72 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input type="text" placeholder="Search audit trail…" value={search} onChange={e => handleSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-teal-400" />
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Date & Time','Username','Employee Name','Action','Updated On'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="text-center py-12 text-gray-400">Loading…</td></tr>}
            {!loading && filtered.map(r => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.created_on).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{r.username}</td>
                <td className="px-4 py-3 text-gray-700">{r.name || '—'}</td>
                <td className="px-4 py-3"><span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700">UPDATE</span></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.updated_on).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
