import { useEffect, useState } from 'react';
import Layout, { TabItem } from '../../components/Layout';
import { getEmployee } from '../../api/employee.api';
import { Employee } from '../../types';
import AddEmployeeModal from './AddEmployeeModal';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchEmployees, removeEmployee, setPage } from '../../store/employeeSlice';
import { getApiErrorMessage } from '../../utils/errors';

const TABS: TabItem[] = [
  { label: 'Employee List', path: '/employees' },
  { label: 'My Info', path: '/my-info' },
  { label: 'Directory', path: '#' },
  { label: 'Buzz', path: '#' },
];

const COLS = ['', 'Profile', 'Emp ID', 'Job Title', 'Status', 'Sub Unit', 'Location', 'Supervisor', ''];

export default function EmployeeListPage() {
  const dispatch = useAppDispatch();
  const { data, loading, page } = useAppSelector(state => state.employees);
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => { dispatch(fetchEmployees(page)); }, [page]);

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this employee?')) return;
    try {
      await dispatch(removeEmployee(id)).unwrap();
      flash('Employee deleted successfully.');
      dispatch(fetchEmployees(page));
    } catch (err: unknown) {
      flash(getApiErrorMessage(err, 'Failed to delete employee.'));
    }
  };

  const fetchData = (pageNum: number) => dispatch(fetchEmployees(pageNum));

  const openAdd  = () => { setEditEmployee(null); setShowModal(true); };

  const openEdit = async (emp: Employee) => {
    try {
      const { data: full } = await getEmployee(emp.id!);
      setEditEmployee(full);
    } catch {
      setEditEmployee(emp);
    }
    setShowModal(true);
  };

  const rows = (data?.data || []).filter(user => 
    !search ||
    (user.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (user.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (user.job_title || '').toLowerCase().includes(search.toLowerCase())
  );

  const getSupervisorLabel = (emp: Employee): string => {
    if (!emp.supervisors || !Array.isArray(emp.supervisors) || emp.supervisors.length === 0) return '—';
    return String(emp.supervisors[0]);
  };

  const initials = (emp: Employee) => {
    const fullName = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
    return fullName ? fullName.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase() : 'EE';
  };

  return (
    <Layout title="Employee Management" tabs={TABS} activeTab="Employee List" onFab={openAdd}>
      {success && (
        <div className="mb-3.5 p-2.5 bg-green-50 border-l-4 border-green-400 rounded text-green-900 text-sm">
          {success}
        </div>
      )}

      <div className="mb-3.5 flex items-center justify-between">
        <div className="relative w-80">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by name, username, job title…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border-1.5 border-slate-200 rounded-lg text-sm outline-none bg-white focus:border-slate-300 transition"
          />
        </div>
        {data && (
          <span className="text-xs text-slate-400">{data.total} employee{data.total !== 1 ? 's' : ''} total</span>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-100 bg-slate-50">
              {COLS.map((header, i) => (
                <th
                  key={i}
                  className={`px-3.5 py-2.75 text-left text-xs font-bold text-slate-600 whitespace-nowrap ${
                    i === 0 ? 'w-9' : i === 8 ? 'w-20' : ''
                  }`}
                >
                  {i === 0
                    ? <input type="checkbox" className="w-3.5 h-3.5 accent-blue-900" />
                    : header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={COLS.length} className="text-center py-14 text-slate-400">
                  <div className="text-sm">Loading employees…</div>
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={COLS.length} className="text-center py-14 text-slate-400">
                  <div className="text-4xl mb-2">👥</div>
                  <div className="text-sm">No employees found</div>
                </td>
              </tr>
            )}
            {!loading && rows.map((emp, i) => {
              const displayName = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || '—';
              return (
                <tr
                  key={emp.id}
                  className={`border-b border-slate-100 transition-colors hover:bg-emerald-50 ${
                    i % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                  }`}
                >

                  <td className="px-3.5 py-2.5">
                    <input type="checkbox" className="w-3.5 h-3.5 accent-blue-900" />
                  </td>

                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-full flex-shrink-0 bg-gradient-to-r from-blue-900 to-teal-600 flex items-center justify-center overflow-hidden text-white text-xs font-bold`}>
                        {emp.avatar
                          ? <img src={`/${emp.avatar}`} className="w-full h-full object-cover" alt="" />
                          : initials(emp)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-sm leading-tight">{displayName}</div>
                        <div className="text-xs text-slate-400">{emp.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-3.5 py-2.5 text-slate-700 text-sm font-mono">
                    {emp.employee_id || <span className="text-slate-300">—</span>}
                  </td>

                  <td className="px-3.5 py-2.5 text-slate-700 text-sm">
                    {emp.job_title || <span className="text-slate-300">—</span>}
                  </td>

                  <td className="px-3.5 py-2.5">
                    <span className={`inline-block text-xs font-semibold px-2.5 py-0.75 rounded-full ${
                      emp.status === 'Active'
                        ? 'bg-green-50 text-green-600'
                        : 'bg-slate-50 text-slate-400'
                    }`}>
                      {emp.status || 'Active'}
                    </span>
                  </td>

                  <td className="px-3.5 py-2.5 text-slate-600 text-xs">
                    {emp.sub_unit || <span className="text-slate-300">—</span>}
                  </td>

                  <td className="px-3.5 py-2.5 text-slate-600 text-xs">
                    {emp.location || <span className="text-slate-300">—</span>}
                  </td>

                  <td className="px-3.5 py-2.5 text-slate-600 text-xs">
                    {getSupervisorLabel(emp)}
                  </td>

                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(emp)}
                        title="Edit employee"
                        className="bg-blue-50 border border-blue-200 rounded px-2.5 py-1 cursor-pointer text-blue-700 text-xs font-semibold hover:bg-blue-100 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id!)}
                        title="Delete employee"
                        className="bg-red-50 border border-red-200 rounded px-2.5 py-1 cursor-pointer text-red-600 text-xs font-semibold hover:bg-red-100 transition"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-3 text-sm text-slate-600">
            <button
              onClick={() => dispatch(setPage(page - 1))}
              disabled={page === 1}
              className="px-4 py-1.5 rounded border border-slate-200 bg-white cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              ← Prev
            </button>
            <span>Page {data.page} of {data.totalPages} &nbsp;·&nbsp; {data.total} employees</span>
            <button
              onClick={() => dispatch(setPage(page + 1))}
              disabled={page === data.totalPages}
              className="px-4 py-1.5 rounded border border-slate-200 bg-white cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <AddEmployeeModal
          employee={editEmployee}
          onClose={() => { setShowModal(false); setEditEmployee(null); }}
          onSaved={() => {
            fetchData(page);
            flash(editEmployee ? 'Employee updated successfully.' : 'Employee created successfully.');
          }}
        />
      )}
    </Layout>
  );
}
