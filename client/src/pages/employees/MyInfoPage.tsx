import React, { useEffect, useState } from 'react';
import Layout, { TabItem } from '../../components/Layout';
import { getMyInfo } from '../../api/employee.api';
import { Employee } from '../../types';
import AddEmployeeModal from './AddEmployeeModal';
import { COLOR_NAV, COLOR_GRADIENT } from '../../constants/styles';

const TABS: TabItem[] = [
  { label: 'Employee List', path: '/employees' },
  { label: 'My Info', path: '/my-info' },
  { label: 'Directory', path: '#' },
  { label: 'Buzz', path: '#' },
];

const NAV = COLOR_NAV;
const GRAD = COLOR_GRADIENT;

const STATUS_ACTIVE_BG = '#f0fdf4';
const STATUS_ACTIVE_COLOR = '#16a34a';
const STATUS_INACTIVE_BG = '#f8fafc';
const STATUS_INACTIVE_COLOR = '#94a3b8';

export default function MyInfoPage() {
  const [employee, setEmp] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [success, setSuccess] = useState('');

  const loadProfile = () => {
    setLoading(true);
    setError('');
    getMyInfo()
      .then(r => setEmp(r.data))
      .catch(error => {
        const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(msg || 'Could not load your profile. Please try again.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProfile(); }, []);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  if (loading) return (
    <Layout title="Employee Management" tabs={TABS} activeTab="My Info">
      <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', fontSize: 14 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        Loading your profile…
      </div>
    </Layout>
  );

  if (error || !employee) return (
    <Layout title="Employee Management" tabs={TABS} activeTab="My Info">
      <div style={{ padding: '14px 18px', background: '#fef2f2', borderLeft: '3px solid #f87171', borderRadius: 10, color: '#b91c1c', fontSize: 13, maxWidth: 480 }}>
        <strong>Could not load profile</strong><br />
        {error || 'No profile data found for your account.'}<br /><br />
        <button onClick={loadProfile} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: NAV, color: '#fff', cursor: 'pointer', fontSize: 13 }}>
          Retry
        </button>
      </div>
    </Layout>
  );

  const displayName = employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Employee';
  const initials = displayName.split(' ').map((word: string) => word[0]).slice(0, 2).join('').toUpperCase();

  const formatDate = (dateStr?: string | null) => dateStr ? new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
  const fmt = formatDate;

  return (
    <Layout title="Employee Management" tabs={TABS} activeTab="My Info">
      {success && (
        <div style={{ marginBottom: 14, padding: '10px 16px', background: '#f0fff4', borderLeft: '3px solid #48bb78', borderRadius: 8, color: '#276749', fontSize: 13 }}>
          ✓ {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ════════════════ LEFT COLUMN ════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Profile card */}
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            {/* Banner */}
            <div style={{ height: 64, background: GRAD }} />
            <div style={{ padding: '0 20px 20px', textAlign: 'center' }}>
              {/* Avatar */}
              <div style={{ marginTop: -34, marginBottom: 10, display: 'inline-block' }}>
                <div style={{
                  width: 68, height: 68, borderRadius: '50%',
                  border: '3px solid #fff', boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                  background: employee.avatar ? 'transparent' : GRAD,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', fontSize: 22, fontWeight: 700, color: '#fff',
                }}>
                  {employee.avatar
                    ? <img src={`/uploads/${employee.avatar}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : initials}
                </div>
              </div>

              <div style={{ fontWeight: 700, fontSize: 15.5, color: '#1e293b' }}>{displayName}</div>
              <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 3 }}>{employee.job_title || 'Employee'}</div>

              {/* Status badge */}
              <div style={{ marginTop: 8 }}>
                <span style={{
                  fontSize: 11.5, fontWeight: 600, padding: '3px 14px', borderRadius: 20,
                  background: employee.status === 'Active' ? STATUS_ACTIVE_BG : STATUS_INACTIVE_BG,
                  color: employee.status === 'Active' ? STATUS_ACTIVE_COLOR : STATUS_INACTIVE_COLOR,
                }}>
                  {employee.status || 'Active'}
                </span>
              </div>
              {/* Edit button */}
              <button onClick={() => setShowEdit(true)} style={{
                marginTop: 14, width: '100%', padding: '9px', borderRadius: 10,
                border: 'none', background: GRAD, color: '#fff',
                fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
              }}>
                ✎ Edit My Profile
              </button>
            </div>
          </div>

          {/* Quick Info */}
          <Card title="Quick Info">
            {[
              ['Employee ID', employee.employee_id],
              ['Username', employee.username],
              ['Role', employee.role],
              ['Sub Unit', employee.sub_unit],
              ['Location', employee.location],
              ['Joined', formatDate(employee.joined_date)],
            ].filter(([, value]) => value).map(([label, value]) => (
              <QuickRow key={label as string} label={label as string} value={value as string} />
            ))}
          </Card>

          {/* Leave Balance */}
          <Card title="Leave Balance">
            {[
              { l: 'Privilege Leave', v: 4, max: 5, c: '#3b82f6' },
              { l: 'Carry Forward', v: 1, max: 4, c: '#06b6d4' },
              { l: 'Sick Leave', v: 0, max: 10, c: '#ef4444' },
            ].map(item => (
              <div key={item.l} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, color: '#475569' }}>{item.l}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{item.v.toFixed(2)}</span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 999 }}>
                  <div style={{ height: '100%', borderRadius: 999, background: item.c, width: `${(item.v / item.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* ════════════════ RIGHT COLUMN ════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Personal Information */}
          <DetailCard title="Personal Information" icon="👤">
            <TwoColGrid rows={[
              ['Full Name', displayName],
              ['Employee ID', employee.employee_id],
              ['Gender', employee.gender],
              ['Date of Birth', fmt(employee.dob)],
              ['Real DOB', fmt(employee.real_dob)],
              ['Nationality', employee.nationality],
              ['Marital Status', employee.marital_status],
              ['Blood Group', employee.blood_group],
              ["Driver's License", employee.license_number],
              ['License Expiry', fmt(employee.license_expiry)],
            ]} />
          </DetailCard>

          {/* Job Details */}
          <DetailCard title="Job Details" icon="💼">
            <TwoColGrid rows={[
              ['Job Title', employee.job_title],
              ['Employment Status', employee.employment_status],
              ['Job Category', employee.job_category],
              ['Job Specification', employee.job_specification],
              ['Sub Unit', employee.sub_unit],
              ['Location', employee.location],
              ['Attendance Calc', employee.attendance_calc],
              ['Joined Date', fmt(employee.joined_date)],
              ['Probation End', fmt(employee.probation_end_date)],
              ['Date of Permanence', fmt(employee.date_of_permanence)],
              ['Contract Start', fmt(employee.contract_start_date)],
              ['Contract End', fmt(employee.contract_end_date)],
            ]} />
            {employee.comments && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#475569', borderLeft: '3px solid #e2e8f0' }}>
                <strong>Comments:</strong> {employee.comments}
              </div>
            )}
          </DetailCard>

          {/* Contact Information */}
          <DetailCard title="Contact Information" icon="📞">
            <TwoColGrid rows={[
              ['Work Email', employee.email],
              ['Other Email', employee.other_email],
              ['Mobile', employee.mobile],
              ['Work Tel', employee.work_tel],
              ['Home Tel', employee.home_tel],
              ['Address Line 1', employee.address1],
              ['Address Line 2', employee.address2],
              ['City', employee.city],
              ['State', employee.state],
              ['Country', employee.country],
              ['ZIP Code', employee.zip],
            ]} />
          </DetailCard>

        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <AddEmployeeModal
          employee={employee}
          onClose={() => setShowEdit(false)}
          onSaved={() => { loadProfile(); flash('Profile updated successfully.'); }}
        />
      )}
    </Layout>
  );
}

/* ── Helpers ── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
      <div style={{ padding: '11px 16px', borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: NAV, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function QuickRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
      <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b', maxWidth: 160, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

function DetailCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
      <div style={{ padding: '13px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>{title}</span>
      </div>
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </div>
  );
}

function TwoColGrid({ rows }: { rows: [string, string | null | undefined][] }) {
  const filled = rows.filter(([, value]) => value && String(value).trim());
  if (!filled.length) return (
    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No information available.</p>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px' }}>
      {filled.map(([label, value]) => (
        <div key={label}>
          <div style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b', wordBreak: 'break-word' }}>{value}</div>
        </div>
      ))}
    </div>
  );
}
