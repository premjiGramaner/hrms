import { ChangeEvent, useEffect, useState } from "react";
import Layout, { TabItem } from "../../components/Layout";
import {
  getMyInfo,
  updateEmployee,
  getSupervisors,
  getLocations,
} from "../../api/employee.api";
import { Employee } from "../../types";
import {
  ATTENDANCE_CALCULATION_TYPES,
  BLOOD_GROUPS,
  COUNTRIES,
  EMPLOYMENT_STATUSES,
  GENDERS,
  JOB_SPECIFICATIONS,
  MARITAL_STATUSES,
  NATIONALITIES,
} from "../../constants/employeeOptions";
import {
  getJobTitles,
  getJobCategories,
  getSubUnits,
} from "../../api/hradmin.api";
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
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import {
  validatePersonalDetails,
  validateContactDetails,
  validateEmploymentDetails,
  validateEmailUniqueness,
  validateEmployeeIdUniqueness,
  ValidationErrors,
  hasErrors,
} from "../../utils/profileValidation";
import { updateUserAvatar, updateUserName } from "../../store/authSlice";
import { getNumericValue } from "./components/inputHelpers";

const ADMIN_TABS: TabItem[] = [
  { label: "Employee List", path: "/employees" },
  { label: "My Info", path: "/my-info" },
];

const EMPLOYEE_TABS: TabItem[] = [{ label: "My Info", path: "/my-info" }];

const PROFILE_TABS = ["Profile", "Personal Details", "Job", "Contact Details"];

export default function MyInfoPage() {
  
  const user = useAppSelector((state) => state.auth.user);





  const dispatch = useAppDispatch();
  const isAdmin = user?.role === "hradmin" || user?.role === "empmanager";
  const TABS = isAdmin ? ADMIN_TABS : EMPLOYEE_TABS;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EditableEmployeeProfileForm | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  const [jobTitleOptions, setJobTitleOptions] = useState<string[]>([]);
  const [jobCategoryOptions, setJobCategoryOptions] = useState<
    { id: number; category: string }[]
  >([]);
  const [subUnitOptions, setSubUnitOptions] = useState<string[]>([]);
  const [supervisorOptions, setSupervisorOptions] = useState<
    { id: number; name: string }[]
  >([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);

  useEffect(() => {
    if (isAdmin) {
      getJobTitles()
        .then((res) => setJobTitleOptions(res.data.map((j) => j.title)))
        .catch((err) =>
          setError(getApiErrorMessage(err, "Failed to load job titles.")),
        );

      getJobCategories()
        .then((res) =>
          setJobCategoryOptions(
            res.data.map((c) => ({ id: c.id, category: c.category })),
          ),
        )
        .catch((err) =>
          setError(getApiErrorMessage(err, "Failed to load job categories.")),
        );

      getSubUnits()
        .then((res) => setSubUnitOptions(res.data.map((s) => s.sub_unit_name)))
        .catch((err) =>
          setError(getApiErrorMessage(err, "Failed to load sub units.")),
        );

      getLocations()
        .then((res) => {
          const seenMap = new Map<string, string>();
          const deduped = res.data.filter((loc: string) => {
            const lowerLoc = loc.toLowerCase();
            if (seenMap.has(lowerLoc)) {
              return false;
            }
            seenMap.set(lowerLoc, loc);
            return true;
          });
          setLocationOptions(deduped);
        })
        .catch((err) =>
          setError(getApiErrorMessage(err, "Failed to load locations.")),
        );
    }

    getSupervisors()
      .then((res) =>
        setSupervisorOptions(
          (res.data || []).map((s: any, index: number) => ({
            id: s.id ?? index + 1,
            name: s.name,
          })),
        ),
      )
      .catch((err) =>
        setError(getApiErrorMessage(err, "Failed to load supervisors.")),
      );
  }, [isAdmin]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getMyInfo();
      setEmployee(data);
      setForm(employeeToEditableProfileForm(data));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not load your profile."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleFieldChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = event.target;
    if (name === "mobile" || name === "work_tel" || name === "home_tel") {
      const numericValue = getNumericValue(event, 10);
      setForm((current) =>
        current ? { ...current, [name]: numericValue } : current,
      );
      setModifiedFields((prev) => new Set(prev).add(name));
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
      return;
    }
    setForm((current) => (current ? { ...current, [name]: value } : current));
    setModifiedFields((prev) => new Set(prev).add(name));
    setValidationErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSave = async () => {
    if (!employee?.id || !form || saving) return;

    try {
      let errors: ValidationErrors = {};
      const activeLabel = PROFILE_TABS[activeTab];

      if (activeLabel === "Personal Details") {
        errors = validatePersonalDetails(form, isAdmin);
        if (!hasErrors(errors) && modifiedFields.has("employee_id") && form.employee_id.trim()) {
          const empIdError = await validateEmployeeIdUniqueness(
            form.employee_id,
            employee.id,
          );
          if (empIdError) errors.employee_id = empIdError;
        }
      } else if (activeLabel === "Contact Details") {
        errors = validateContactDetails(form);
        if (!hasErrors(errors) && modifiedFields.has("work_email") && form.work_email.trim()) {
          const emailError = await validateEmailUniqueness(
            form.work_email,
            employee.id,
          );
          if (emailError) errors.work_email = emailError;
        }
      } else if (activeLabel === "Job") {
        errors = validateEmploymentDetails(form);
      }

      if (hasErrors(errors)) {
        setValidationErrors(errors);
        setMessage("Please fix the validation errors before saving.");
        return;
      }

      setSaving(true);
      setMessage("");
      setValidationErrors({});

      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (!isAdmin && (key === "employee_id" || key === "real_dob")) {
          return;
        }
        formData.append(key, value.trim());
      });

      formData.append("role", employee.role || "employee");

      const supervisorsArray = form.supervisor_id ? [form.supervisor_id] : [];
      formData.append("supervisors", JSON.stringify(supervisorsArray));

      await updateEmployee(employee.id, formData);

      const { data: updatedEmployee } = await getMyInfo();
      setEmployee(updatedEmployee);
      setForm(employeeToEditableProfileForm(updatedEmployee));
      setModifiedFields(new Set());

      if (updatedEmployee.avatar) {
        dispatch(updateUserAvatar(updatedEmployee.avatar));
      }

      dispatch(updateUserName({
        first_name: updatedEmployee.first_name,
        last_name: updatedEmployee.last_name,
      }));

      setMessage("Profile updated successfully.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: unknown) {
      setMessage(getApiErrorMessage(err, "Failed to update profile."));
    } finally {
      setSaving(false);
    }
  };

  const saveFooter = (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !employee?.id}
        className="rounded-full bg-blue-950 px-8 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );

  const renderTabContent = () => {
    const activeLabel = PROFILE_TABS[activeTab];

    if (!employee || !form) return null;

    if (activeLabel === "Personal Details") {
      return (
        <ProfileDetailPanel title="Personal Details" footer={saveFooter}>
          <EditableProfileField
            label="Employee ID"
            name="employee_id"
            value={form.employee_id}
            onChange={handleFieldChange}
            disabled={!isAdmin}
            error={validationErrors.employee_id}
          />
          <EditableProfileField
            label="First Name"
            name="first_name"
            value={form.first_name}
            onChange={handleFieldChange}
            required
            error={validationErrors.first_name}
          />
          <EditableProfileField
            label="Middle Name"
            name="middle_name"
            value={form.middle_name}
            onChange={handleFieldChange}
            error={validationErrors.middle_name}
          />
          <EditableProfileField
            label="Last Name"
            name="last_name"
            value={form.last_name}
            onChange={handleFieldChange}
            required
            error={validationErrors.last_name}
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
            disabled={!isAdmin}
          />
          <EditableProfileField
            label="Nationality"
            name="nationality"
            value={form.nationality}
            onChange={handleFieldChange}
            options={NATIONALITIES}
            required
            error={validationErrors.nationality}
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
            maxLength={16}
            minLength={15}
            error={validationErrors.license_number}
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
        <ProfileDetailPanel title="Employment Details" footer={saveFooter}>
          <EditableProfileField
            label="Job Title"
            name="job_title"
            value={form.job_title}
            onChange={handleFieldChange}
            options={isAdmin ? jobTitleOptions : undefined}
            required
            error={validationErrors.job_title}
            readOnly={!isAdmin}
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
            options={
              isAdmin ? jobCategoryOptions.map((c) => c.category) : undefined
            }
            readOnly={!isAdmin}
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
            options={isAdmin ? subUnitOptions : undefined}
            required
            error={validationErrors.sub_unit}
            readOnly={!isAdmin}
          />
          <EditableProfileField
            label="Supervisor"
            name="supervisor_id"
            value={form.supervisor_id}
            onChange={handleFieldChange}
            options={supervisorOptions.map((s) => s.id.toString())}
            optionLabels={new Map(supervisorOptions.map((s) => [s.id.toString(), s.name]))}
          />
          <EditableProfileField
            label="Location"
            name="location"
            value={form.location}
            onChange={handleFieldChange}
            options={isAdmin ? locationOptions : undefined}
            required
            error={validationErrors.location}
            readOnly={!isAdmin}
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
        <ProfileDetailPanel title="Contact Details" footer={saveFooter}>
          <EditableProfileField
            label="Work Email"
            name="work_email"
            type="email"
            value={form.work_email}
            onChange={handleFieldChange}
            required
            error={validationErrors.work_email}
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
            required
            maxLength={10}
            error={validationErrors.mobile}
          />
          <EditableProfileField
            label="Home Telephone"
            name="home_tel"
            value={form.home_tel}
            onChange={handleFieldChange}
            maxLength={10}
            error={validationErrors.home_tel}
          />
          <EditableProfileField
            label="Work Telephone"
            name="work_tel"
            value={form.work_tel}
            onChange={handleFieldChange}
            maxLength={10}
            error={validationErrors.work_tel}
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
          <EmployeeProfileCard
            employee={employee}
            onEmployeeUpdate={(updatedEmployee) => {
              setEmployee(updatedEmployee);
              setForm(employeeToEditableProfileForm(updatedEmployee));
            }}
          />
          <LeaveList employee={employee} />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout title="Employee Profile" tabs={TABS} activeTab="My Info">
        <div className="text-center py-14 text-slate-400">
          <div className="text-sm">Loading your profile...</div>
        </div>
      </Layout>
    );
  }

  if (error || !employee) {
    return (
      <Layout title="Employee Profile" tabs={TABS} activeTab="My Info">
        <div className="rounded-xl border-l-4 border-red-400 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-semibold">Could not load profile</div>
          <div className="mt-1">{error || "No profile data found."}</div>
          <button
            type="button"
            onClick={loadProfile}
            className="mt-4 rounded-lg bg-blue-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Employee Profile" tabs={TABS} activeTab="My Info">
      {message && (
        <div
          className={`mb-3.5 p-2.5 border-l-4 rounded text-sm ${
            message.toLowerCase().includes("failed")
              ? "bg-red-50 border-red-400 text-red-800"
              : "bg-green-50 border-green-400 text-green-900"
          }`}
        >
          {message}
        </div>
      )}

      <div className="mb-6 bg-white rounded-lg shadow-sm p-2 flex overflow-x-auto gap-2">
        {PROFILE_TABS.map((tab, idx) => (
          <button
            key={tab}
            onClick={() => setActiveTab(idx)}
            className={`px-6 py-2 text-sm font-medium whitespace-nowrap rounded-full transition ${
              activeTab === idx
                ? "bg-[#fff3e0] text-[#c6410c]"
                : "text-[#757575] hover:bg-gray-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {renderTabContent()}
    </Layout>
  );
}
