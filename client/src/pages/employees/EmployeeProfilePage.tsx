import { ChangeEvent, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout, { TabItem } from "../../components/Layout";
import { getEmployee, updateEmployee } from "../../api/employee.api";
import { Employee } from "../../types";
import {
  ATTENDANCE_CALCULATION_TYPES,
  BLOOD_GROUPS,
  COUNTRIES,
  EMPLOYMENT_STATUSES,
  GENDERS,
  JOB_CATEGORIES,
  JOB_SPECIFICATIONS,
  JOB_TITLES,
  LOCATIONS,
  MARITAL_STATUSES,
  NATIONALITIES,
  SUB_UNITS,
} from "../../constants/employeeOptions";
import {
  EditableEmployeeProfileForm,
  employeeToEditableProfileForm,
} from "../../types/employeeProfile";
import { getApiErrorMessage } from "../../utils/errors";
import EmployeeProfileCard from "./components/EmployeeProfileCard";
import {
  EditableProfileField,
  ProfileDetailPanel,
} from "./components/EmployeeProfileForm";
import LeaveBalance from "./components/LeaveBalance";
import LeaveList from "./components/LeaveList";
import QuickAccess from "./components/QuickAccess";
import TerminationModal from "./components/TerminationModal";

const TABS: TabItem[] = [
  { label: "Employee List", path: "/employees" },
  { label: "My Info", path: "/my-info" },
];

const PROFILE_TABS = ["Profile", "Personal Details", "Job", "Contact Details"];

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [actionMessage, setActionMessage] = useState("");
  const [terminating, setTerminating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditableEmployeeProfileForm | null>(null);
  const [showTerminationModal, setShowTerminationModal] = useState(false);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        if (!id) {
          setError("Employee ID not provided");
          setLoading(false);
          return;
        }
        const { data } = await getEmployee(parseInt(id));
        setEmployee(data);
        setForm(employeeToEditableProfileForm(data));
      } catch {
        setError("Employee not found");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  if (loading) {
    return (
      <Layout title="Employee Profile" tabs={TABS} activeTab="Employee List">
        <div className="text-center py-14 text-[#757575]">
          <div className="text-sm">Loading employee profile…</div>
        </div>
      </Layout>
    );
  }

  if (error || !employee) {
    return (
      <Layout title="Employee Profile" tabs={TABS} activeTab="Employee List">
        <div className="text-center py-14">
          <div className="text-4xl mb-2">⚠️</div>
          <div className="text-sm text-[#757575]">{error}</div>
          <button
            onClick={() => navigate("/employees")}
            className="mt-4 px-4 py-2 bg-[#00897b] text-white rounded-lg hover:bg-[#00bfa5]"
          >
            Back to Employee List
          </button>
        </div>
      </Layout>
    );
  }

  const handleTerminateEmployment = () => {
    if (!employee.id) return;
    setShowTerminationModal(true);
  };

  const handleFieldChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = event.target;
    setForm((current) => (current ? { ...current, [name]: value } : current));
  };

  const handleSave = async () => {
    if (!employee.id || !form || saving) return;

    try {
      setSaving(true);
      setActionMessage("");
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value.trim());
      });
      formData.append("role", employee.role || "employee");
      formData.append(
        "supervisors",
        JSON.stringify(employee.supervisors || []),
      );
      await updateEmployee(employee.id, formData);
      const { data } = await getEmployee(employee.id);
      setEmployee(data);
      setForm(employeeToEditableProfileForm(data));
      setActionMessage("Employee details saved successfully.");
    } catch (err: unknown) {
      setActionMessage(
        getApiErrorMessage(err, "Failed to save employee details."),
      );
    } finally {
      setSaving(false);
    }
  };

  const renderTabContent = () => {
    const activeLabel = PROFILE_TABS[activeTab];

    if (!form) return null;

    if (activeLabel === "Personal Details") {
      return (
        <ProfileDetailPanel
          title="Personal Details"
          footer={
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-full bg-blue-950 px-8 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          }
        >
          <EditableProfileField
            label="Employee ID"
            name="employee_id"
            value={form.employee_id}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="First Name"
            name="first_name"
            value={form.first_name}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Middle Name"
            name="middle_name"
            value={form.middle_name}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Last Name"
            name="last_name"
            value={form.last_name}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Gender"
            name="gender"
            value={form.gender}
            onChange={handleFieldChange}
            options={GENDERS}
          />
          <EditableProfileField
            label="Date of Birth"
            name="dob"
            type="date"
            value={form.dob}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Real Date of Birth"
            name="real_dob"
            type="date"
            value={form.real_dob}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Nationality"
            name="nationality"
            value={form.nationality}
            onChange={handleFieldChange}
            options={NATIONALITIES}
          />
          <EditableProfileField
            label="Marital Status"
            name="marital_status"
            value={form.marital_status}
            onChange={handleFieldChange}
            options={MARITAL_STATUSES}
          />
          <EditableProfileField
            label="Blood Group"
            name="blood_group"
            value={form.blood_group}
            onChange={handleFieldChange}
            options={BLOOD_GROUPS}
          />
          <EditableProfileField
            label="License Number"
            name="license_number"
            value={form.license_number}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="License Expiry"
            name="license_expiry"
            type="date"
            value={form.license_expiry}
            onChange={handleFieldChange}
          />
        </ProfileDetailPanel>
      );
    }

    if (activeLabel === "Job") {
      return (
        <ProfileDetailPanel
          title="Employment Details"
          footer={
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleTerminateEmployment}
                disabled={terminating}
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-800 underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <circle cx="9" cy="7" r="3" />
                  <path d="M3.5 20a5.5 5.5 0 0 1 8.8-4.4" />
                  <path d="M16 12v8" />
                  <path d="M12 16h8" />
                </svg>
                {terminating ? "Terminating..." : "Terminate Employment"}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-full bg-blue-950 px-8 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          }
        >
          <EditableProfileField
            label="Job Title"
            name="job_title"
            value={form.job_title}
            onChange={handleFieldChange}
            options={JOB_TITLES}
          />
          <EditableProfileField
            label="Joined Date"
            name="joined_date"
            type="date"
            value={form.joined_date}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Employment Status"
            name="employment_status"
            value={form.employment_status}
            onChange={handleFieldChange}
            options={EMPLOYMENT_STATUSES}
          />
          <EditableProfileField
            label="Job Category"
            name="job_category"
            value={form.job_category}
            onChange={handleFieldChange}
            options={JOB_CATEGORIES}
          />
          <EditableProfileField
            label="Job Specification"
            name="job_specification"
            value={form.job_specification}
            onChange={handleFieldChange}
            options={JOB_SPECIFICATIONS}
          />
          <EditableProfileField
            label="Sub Unit"
            name="sub_unit"
            value={form.sub_unit}
            onChange={handleFieldChange}
            options={SUB_UNITS}
          />
          <EditableProfileField
            label="Location"
            name="location"
            value={form.location}
            onChange={handleFieldChange}
            options={LOCATIONS}
          />
          <EditableProfileField
            label="Probation End Date"
            name="probation_end_date"
            type="date"
            value={form.probation_end_date}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Date of Permanence"
            name="date_of_permanence"
            type="date"
            value={form.date_of_permanence}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Attendance Calculation"
            name="attendance_calc"
            value={form.attendance_calc}
            onChange={handleFieldChange}
            options={ATTENDANCE_CALCULATION_TYPES}
          />
          <EditableProfileField
            label="Contract Start Date"
            name="contract_start_date"
            type="date"
            value={form.contract_start_date}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Contract End Date"
            name="contract_end_date"
            type="date"
            value={form.contract_end_date}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Comments"
            name="comments"
            type="textarea"
            value={form.comments}
            onChange={handleFieldChange}
            wide
          />
        </ProfileDetailPanel>
      );
    }

    if (activeLabel === "Contact Details") {
      return (
        <ProfileDetailPanel
          title="Contact Details"
          footer={
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-full bg-blue-950 px-8 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          }
        >
          <EditableProfileField
            label="Work Email"
            name="work_email"
            type="email"
            value={form.work_email}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Other Email"
            name="other_email"
            type="email"
            value={form.other_email}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Mobile"
            name="mobile"
            value={form.mobile}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Home Telephone"
            name="home_tel"
            value={form.home_tel}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Work Telephone"
            name="work_tel"
            value={form.work_tel}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Address Line 1"
            name="address1"
            value={form.address1}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Address Line 2"
            name="address2"
            value={form.address2}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="City"
            name="city"
            value={form.city}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="State"
            name="state"
            value={form.state}
            onChange={handleFieldChange}
          />
          <EditableProfileField
            label="Country"
            name="country"
            value={form.country}
            onChange={handleFieldChange}
            options={COUNTRIES}
          />
          <EditableProfileField
            label="Zip Code"
            name="zip"
            value={form.zip}
            onChange={handleFieldChange}
          />
        </ProfileDetailPanel>
      );
    }

    if (activeLabel !== "Profile") {
      return (
        <ProfileDetailPanel title={activeLabel}>
          <div className="md:col-span-2 xl:col-span-3 text-sm text-slate-500">
            No details available for this section yet.
          </div>
        </ProfileDetailPanel>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <QuickAccess />
          <LeaveBalance employee={employee} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <EmployeeProfileCard employee={employee} />
          <LeaveList employee={employee} />
        </div>
      </div>
    );
  };

  return (
    <Layout title="Employee Profile" tabs={TABS} activeTab="Employee List">
      {actionMessage && (
        <div
          className={`mb-3.5 p-2.5 border-l-4 rounded text-sm ${
            actionMessage.toLowerCase().includes("failed")
              ? "bg-red-50 border-red-400 text-red-800"
              : "bg-green-50 border-green-400 text-green-900"
          }`}
        >
          {actionMessage}
        </div>
      )}

      <div className="mb-6 bg-white rounded-lg shadow-sm p-2 flex overflow-x-auto gap-2">
        {PROFILE_TABS.map((tab, idx) => (
          <button
            key={tab}
            onClick={() => setActiveTab(idx)}
            className={`px-6 py-2 text-sm font-medium whitespace-nowrap rounded-full transition ${
              activeTab === idx
                ? "bg-[#fff3e0] text-[#ff9800]"
                : "text-[#757575] hover:bg-gray-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {renderTabContent()}
      {showTerminationModal && (
        <TerminationModal
          employeeId={employee!.id}
          onClose={() => setShowTerminationModal(false)}
          onSuccess={() => {
            navigate("/employees", {
              replace: true,
              state: { message: "Employee terminated successfully." },
            });
          }}
        />
      )}
    </Layout>
  );
}
