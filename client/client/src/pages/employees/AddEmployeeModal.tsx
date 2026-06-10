import React, { useState, useRef, ChangeEvent, useEffect, useMemo } from 'react';
import { Employee } from '../../types';
import { createEmployee, updateEmployee, getSupervisors } from '../../api/employee.api';
import { getApiErrorMessage } from '../../utils/errors';
import { validateEmployeeStep } from '../../validations/employee.validation';

interface Props { employee: Employee | null; onClose: () => void; onSaved: () => void; }
interface Supervisor { id: number; name: string; job_title: string; }

function toDateStr(val?: string | null): string {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  try { return new Date(val).toISOString().slice(0, 10); } catch { return ''; }
}

const STEPS = ['Basic Info', 'Personal', 'Job Details', 'Contact', 'Report To'];
const LOCATIONS    = ['Bangalore', 'Coimbatore', 'Hyderabad', 'Chennai', 'Mumbai', 'Delhi'];
const JOB_TITLES   = ['Software Consultant', 'HR Manager', 'Accountant', 'Team Lead', 'Director', 'Talent Acquisition Specialist', 'Business Analyst'];
const EMP_STATUS   = ['Full-Time Permanent', 'Part-Time', 'Contract', 'Intern'];
const JOB_CATS     = ['Delivery Team', 'Officials & Managers', 'Professionals', 'Sales Team', 'Support Function'];
const SUB_UNITS    = ['Networking- IT Services', 'Finance- IT Services', 'Admin- IT Services', 'HR- IT Services', 'Delivery- IT Services', 'Sales- IT Services'];
const COUNTRIES    = ['India', 'Malaysia', 'Singapore', 'Indonesia', 'United States', 'United Kingdom', 'Other'];
const NATIONALITIES = ['Indian', 'Malaysian', 'Singaporean', 'Indonesian', 'American', 'British', 'Australian', 'Canadian', 'Chinese', 'Japanese', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function AddEmployeeModal({ employee, onClose, onSaved }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState<number[]>([]);
  const avatarRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<Record<keyof typeof initialForm, string>>({} as any);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    getSupervisors().then(r => setSupervisors(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (employee?.supervisors && Array.isArray(employee.supervisors)) {
      setSelectedSupervisors(employee.supervisors.map(Number).filter(Boolean));
    }
  }, [employee?.id]);

  const initialForm = useMemo(() => ({
    first_name: employee?.first_name || '',
    middle_name: employee?.middle_name || '',
    last_name: employee?.last_name || '',
    employee_id: employee?.employee_id || '',
    joined_date: toDateStr(employee?.joined_date) || today,
    location: employee?.location || '',
    role: employee?.role || 'employee',
    gender: employee?.gender || '',
    dob: toDateStr(employee?.dob) || '',
    nationality: employee?.nationality || '',
    marital_status: employee?.marital_status || '',
    blood_group: employee?.blood_group || '',
    real_dob: toDateStr(employee?.real_dob) || '',
    license_number: employee?.license_number || '',
    license_expiry: toDateStr(employee?.license_expiry) || '',
    job_title: employee?.job_title || '',
    employment_status: employee?.employment_status || '',
    job_category: employee?.job_category || '',
    sub_unit: employee?.sub_unit || '',
    job_specification: employee?.job_specification || '',
    attendance_calc: employee?.attendance_calc || '',
    probation_end_date: toDateStr(employee?.probation_end_date) || '',
    date_of_permanence: toDateStr(employee?.date_of_permanence) || '',
    contract_start_date: toDateStr(employee?.contract_start_date) || '',
    contract_end_date: toDateStr(employee?.contract_end_date) || '',
    comments: employee?.comments || '',
    work_email: employee?.email || '',
    other_email: employee?.other_email || '',
    mobile: employee?.mobile || '',
    home_tel: employee?.home_tel || '',
    work_tel: employee?.work_tel || '',
    address1: employee?.address1 || '',
    address2: employee?.address2 || '',
    city: employee?.city || '',
    state: employee?.state || '',
    country: employee?.country || '',
    zip: employee?.zip || '',
  }), [employee, today]);

  useEffect(() => { formRef.current = initialForm; }, [initialForm]);

  const set = (k: keyof typeof initialForm) => (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    formRef.current[k] = e.target.value;
    if (errors[k]) setErrors(er => { const n = { ...er }; delete n[k]; return n; });
  };

  const validate: Record<number, () => boolean> = {
    1: () => validateCurrentStep(1),
    2: () => validateCurrentStep(2),
    3: () => validateCurrentStep(3),
    4: () => validateCurrentStep(4),
    5: () => validateCurrentStep(5),
  };

  function validateCurrentStep(stepNumber: number) {
    const nextErrors = validateEmployeeStep(stepNumber, formRef.current, selectedSupervisors);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  const handleNext = () => {
    if (validate[step] && !validate[step]()) return;
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!validate[5]()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(formRef.current).forEach(([k, v]) => {
        const value = String(v).trim();
        if (value) fd.append(k, value);
      });
      if (avatarFile) fd.append('avatar', avatarFile);
      fd.append('supervisors', JSON.stringify(selectedSupervisors));
      if (employee?.id) await updateEmployee(employee.id, fd);
      else await createEmployee(fd);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setErrors({ submit: getApiErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  /* ── Render helpers ── */
  const inp = (name: keyof typeof initialForm, placeholder = '', type = 'text') => (
    <div>
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={formRef.current[name]}
        onChange={set(name)}
        className={`w-full px-3 py-2 border-1.5 rounded-lg text-sm outline-none transition-colors ${
          errors[name] ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50 focus:border-slate-300'
        }`}
      />
      {errors[name] && <span className="text-xs text-red-600 mt-1 block">{errors[name]}</span>}
    </div>
  );

  const sel = (name: keyof typeof initialForm, opts: string[], placeholder = '-- Select --') => (
    <div className="relative">
      <select
        defaultValue={formRef.current[name]}
        onChange={set(name)}
        className={`w-full px-3 py-2 pr-7 border-1.5 rounded-lg text-sm outline-none appearance-none transition-colors ${
          errors[name] ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50 focus:border-slate-300'
        }`}
      >
        <option value="">{placeholder}</option>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</span>
      {errors[name] && <span className="text-xs text-red-600 mt-1 block">{errors[name]}</span>}
    </div>
  );

  const lbl = (text: string, req = false) => (
    <label className="text-xs font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
      {text}{req && <span className="text-red-600 ml-0.5">*</span>}
    </label>
  );

  const F = (label: string, el: React.ReactNode, req = false) => (
    <div key={label}>{lbl(label, req)}{el}</div>
  );

  const G2 = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
  );

  const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 mb-4">
      <div className="text-xs font-bold text-blue-900 uppercase tracking-widest pb-2 mb-3 border-b border-slate-100">
        {title}
      </div>
      {children}
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-teal-600">
          <h2 className="m-0 text-base font-bold text-white">
            {employee ? 'Edit Employee' : 'Add New Employee'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/20 border-0 cursor-pointer text-white text-sm hover:bg-white/30 transition">✕</button>
        </div>

        {/* Stepper */}
        <div className="flex p-3 pb-2.5 bg-blue-50 border-b border-slate-100">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step, active = n === step;
            return (
              <div key={n} className="flex flex-col items-center flex-1 relative">
                {i < STEPS.length - 1 && (
                  <div className={`absolute top-3.5 left-1/2 w-full h-0.5 -z-0 ${done ? 'bg-teal-600' : 'bg-slate-200'}`} />
                )}
                <div className={`w-7 h-7 rounded-full z-10 flex items-center justify-center text-xs font-bold border-2 ${
                  done ? 'bg-teal-600 border-teal-600 text-white'
                    : active ? 'bg-blue-900 border-blue-900 text-white'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  {done ? '✓' : n}
                </div>
                <span className={`text-xs font-semibold mt-1.5 whitespace-nowrap ${
                  active ? 'text-blue-900' : done ? 'text-teal-600' : 'text-slate-400'
                }`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {errors.submit && (
            <div className="p-2.5 bg-red-50 border-l-4 border-red-300 rounded text-red-800 text-sm mb-3.5">
              {errors.submit}
            </div>
          )}

          {/* ══ STEP 1: Basic Info ══ */}
          {step === 1 && (
            <Sec title="Basic Information">
              <div className="flex gap-4 mb-3">
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div
                    onClick={() => avatarRef.current?.click()}
                    className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer overflow-hidden flex items-center justify-center hover:bg-slate-100 transition"
                  >
                    {avatarPreview
                      ? <img src={avatarPreview} className="w-full h-full object-cover" alt="preview" />
                      : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300">
                          <circle cx="12" cy="8" r="4"/><path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6"/>
                        </svg>
                    }
                  </div>
                  <span className="text-xs text-slate-400 text-center leading-tight">Click to<br/>upload</span>
                  <input
                    ref={avatarRef} type="file" accept="image/*" className="hidden"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setAvatarFile(f);
                      const r = new FileReader(); r.onload = ev => setAvatarPreview(ev.target?.result as string); r.readAsDataURL(f);
                    }}
                  />
                </div>
                <div className="flex-1">
                  <G2>
                    {F('First Name', inp('first_name', 'First Name'), true)}
                    {F('Last Name', inp('last_name', 'Last Name'), true)}
                    {F('Middle Name', inp('middle_name', 'Optional'))}
                    {F('Employee ID', inp('employee_id', 'e.g. EMP-001'))}
                    {F('Joined Date', inp('joined_date', '', 'date'), true)}
                    {F('Location', sel('location', LOCATIONS, '-- Select Location --'), true)}
                  </G2>
                </div>
              </div>
              <G2>
                {F('Role', sel('role', ['employee', 'empmanager', 'hradmin']))}
              </G2>
            </Sec>
          )}

          {/* ══ STEP 2: Personal ══ */}
          {step === 2 && (
            <Sec title="Personal Details">
              <G2>
                {F('Gender', sel('gender', ['Male', 'Female', 'Prefer not to say'], '-- Select --'), true)}
                {F('Date of Birth', inp('dob', '', 'date'))}
                {F('Nationality', sel('nationality', NATIONALITIES))}
                {F('Marital Status', sel('marital_status', ['Single', 'Married', 'Common Law', 'Separated', 'Divorced', 'Widowed', 'Other']))}
                {F('Blood Group', sel('blood_group', BLOOD_GROUPS))}
                {F('Real DOB', inp('real_dob', '', 'date'))}
                {F("Driver's License No.", inp('license_number', 'License number'))}
                {F('License Expiry', inp('license_expiry', '', 'date'))}
              </G2>
            </Sec>
          )}

          {/* ══ STEP 3: Job Details ══ */}
          {step === 3 && (
            <Sec title="Job Details">
              <G2>
                {F('Job Title', sel('job_title', JOB_TITLES, '-- Select Job Title --'), true)}
                {F('Employment Status', sel('employment_status', EMP_STATUS, '-- Select --'), true)}
                {F('Job Category', sel('job_category', JOB_CATS))}
                {F('Sub Unit', sel('sub_unit', SUB_UNITS))}
                {F('Job Specification', sel('job_specification', ['Technical', 'Non-Technical'], 'Not Defined'))}
                {F('Attendance Calc', sel('attendance_calc', ['Work Schedule', 'Clock In/Out', 'Manual Entry']))}
                {F('Probation End Date', inp('probation_end_date', '', 'date'))}
                {F('Date of Permanence', inp('date_of_permanence', '', 'date'))}
                {F('Contract Start', inp('contract_start_date', '', 'date'))}
                {F('Contract End', inp('contract_end_date', '', 'date'))}
              </G2>
              <div className="mt-3">
                {F('Comments',
                  <textarea
                    defaultValue={formRef.current.comments}
                    onChange={set('comments')}
                    placeholder="Any notes…"
                    className="w-full px-3 py-2 border-1.5 border-slate-200 rounded-lg text-sm outline-none bg-slate-50 focus:border-slate-300 resize-none h-16"
                  />
                )}
              </div>
            </Sec>
          )}

          {/* ══ STEP 4: Contact ══ */}
          {step === 4 && (
            <Sec title="Contact Information">
              <G2>
                {F('Work Email', inp('work_email', 'work@company.com', 'email'), true)}
                {F('Other Email', inp('other_email', 'personal@email.com', 'email'))}
                {F('Mobile', inp('mobile', '+91 99999 00000', 'tel'), true)}
                {F('Work Tel', inp('work_tel', 'Work telephone', 'tel'))}
                {F('Home Tel', inp('home_tel', 'Home telephone', 'tel'))}
                {F('Address Line 1', inp('address1', 'Street address'))}
                {F('Address Line 2', inp('address2', 'Apt, suite, etc.'))}
                {F('City', inp('city', 'City'))}
                {F('State', inp('state', 'State / Province'))}
                {F('Country', sel('country', COUNTRIES))}
                {F('ZIP Code', inp('zip', 'Postal code'))}
              </G2>
            </Sec>
          )}

          {/* ══ STEP 5: Report To ══ */}
          {step === 5 && (
            <Sec title="Report To — Assign Supervisors (max 3)">
              <p className="text-sm text-slate-600 mb-3.5">Select up to 3 supervisors this employee reports to.</p>
              {supervisors.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No supervisors available. Users with Manager or HR Admin role appear here.</p>
              ) : (
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  {supervisors.map((sup, i) => {
                    const checked = selectedSupervisors.includes(sup.id);
                    return (
                      <label
                        key={sup.id}
                        className={`flex items-center gap-3 p-2.75 cursor-pointer transition-colors ${
                          checked ? 'bg-emerald-50' : i % 2 === 0 ? 'bg-white' : 'bg-blue-50'
                        } ${i < supervisors.length - 1 ? 'border-b border-slate-100' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!checked && selectedSupervisors.length >= 3}
                          onChange={() => {
                            setSelectedSupervisors(prev =>
                              checked ? prev.filter(id => id !== sup.id)
                                : prev.length < 3 ? [...prev, sup.id] : prev
                            );
                            if (errors.supervisors) setErrors(e => { const n = { ...e }; delete n.supervisors; return n; });
                          }}
                          className="w-4 h-4 accent-blue-900 flex-shrink-0"
                        />
                        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-900 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(sup.name || 'S').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-900">{sup.name}</div>
                          <div className="text-xs text-slate-600">{sup.job_title || 'Employee'}</div>
                        </div>
                        {checked && <span className="text-xs font-semibold text-teal-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">Selected</span>}
                      </label>
                    );
                  })}
                </div>
              )}
              {errors.supervisors && <span className="text-xs text-red-600 block mt-2">{errors.supervisors}</span>}
              {selectedSupervisors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs text-slate-400 self-center">Assigned:</span>
                  {selectedSupervisors.map(id => {
                    const sup = supervisors.find(s => s.id === id);
                    return sup ? (
                      <span key={id} className="flex items-center gap-1.5 bg-blue-100 text-blue-700 rounded-full py-1 px-3 text-xs font-semibold">
                        {sup.name}
                        <button onClick={() => setSelectedSupervisors(p => p.filter(x => x !== id))} className="bg-none border-0 cursor-pointer text-blue-700 text-base leading-none pl-1">×</button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </Sec>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
          <span className="text-xs text-slate-400"><span className="text-red-600">*</span> Required fields</span>
          <div className="flex gap-2.5">
            <button onClick={onClose} className="px-5 py-2 rounded-full border border-slate-200 bg-white text-sm font-semibold cursor-pointer text-slate-600 hover:bg-slate-50 transition">
              Cancel
            </button>
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} className="px-5 py-2 rounded-full border border-blue-900 bg-white text-sm font-semibold cursor-pointer text-blue-900 hover:bg-blue-50 transition">
                ← Back
              </button>
            )}
            {step < 5 ? (
              <button onClick={handleNext} className="px-7 py-2 rounded-full border-0 bg-gradient-to-r from-blue-900 to-teal-600 text-white text-sm font-bold cursor-pointer hover:shadow-lg transition">
                Next →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={saving} className={`px-7 py-2 rounded-full border-0 bg-gradient-to-r from-blue-900 to-teal-600 text-white text-sm font-bold cursor-pointer hover:shadow-lg transition ${saving ? 'opacity-65 cursor-not-allowed' : ''}`}>
                {saving ? 'Saving…' : employee ? 'Update Employee' : 'Create Employee'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
