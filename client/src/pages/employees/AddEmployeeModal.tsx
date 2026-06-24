import React, {
  useState,
  useRef,
  ChangeEvent,
  useEffect,
  useMemo,
} from "react";
import { Employee } from "../../types";
import {
  createEmployee,
  updateEmployee,
  getSupervisors,
  checkEmailExists,
} from "../../api/employee.api";
import {
  getJobTitles,
  getJobCategories,
  getSubUnits,
  SubUnit,
} from "../../api/hradmin.api";
import { getApiErrorMessage } from "../../utils/errors";
import { validateEmployeeStep } from "../../validations/employee.validation";
import {
  STEPS,
  EMPLOYMENT_STATUSES,
  COUNTRIES,
  NATIONALITIES,
  BLOOD_GROUPS,
} from "../../constants/employeeOptions";
import { ISO_DATE_PATTERN } from "../../constants/employeeOptions";

interface Props {
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}

interface Supervisor {
  name: string;
}

function toDateStr(val?: string | null): string {
  if (!val) return "";
  if (ISO_DATE_PATTERN.test(val)) return val;
  try {
    return new Date(val).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function AddEmployeeModal({
  employee,
  onClose,
  onSaved,
}: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  const [jobTitleOptions, setJobTitleOptions] = useState<string[]>([]);
  const [jobCategoryOptions, setJobCategoryOptions] = useState<string[]>([]);
  const [subUnitOptions, setSubUnitOptions] = useState<string[]>([]);
  const [subUnitRecords, setSubUnitRecords] = useState<SubUnit[]>([]);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState("");
  const predefinedLocations = ["Bangalore", "Coimbatore", "Hyderabad"];

  const avatarRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<Record<keyof typeof initialForm, string>>({} as any);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    getSupervisors()
      .then((res) => setSupervisors(res.data))
      .catch(() => {});
    getJobTitles()
      .then((res) => setJobTitleOptions(res.data.map((j) => j.title)))
      .catch(() => {});
    getJobCategories()
      .then((res) => setJobCategoryOptions(res.data.map((j) => j.category)))
      .catch(() => {});
    getSubUnits()
      .then((res) => {
        setSubUnitRecords(res.data);
        setSubUnitOptions(res.data.map((s) => s.sub_unit_name));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (employee?.supervisors && Array.isArray(employee.supervisors)) {
      setSelectedSupervisors(
        employee.supervisors.map(String).filter((s) => s.trim() !== ""),
      );
    }
  }, [employee?.id]);

  useEffect(() => {
    if (employee?.location) {
      const predefinedLocations = ["Bangalore", "Coimbatore", "Hyderabad"];
      if (!predefinedLocations.includes(employee.location)) {
        setShowCustomLocation(true);
        setCustomLocation(employee.location);
        formRef.current.location = "Other";
      }
    }
  }, [employee?.id]);

  const initialForm = useMemo(
    () => ({
      first_name: employee?.first_name || "",
      middle_name: employee?.middle_name || "",
      last_name: employee?.last_name || "",
      employee_id: employee?.employee_id || "",
      joined_date: toDateStr(employee?.joined_date) || today,
      location: employee?.location || "",
      role: "employee",
      gender: employee?.gender || "",
      dob: toDateStr(employee?.dob) || "",
      nationality: employee?.nationality || "",
      marital_status: employee?.marital_status || "",
      blood_group: employee?.blood_group || "",
      real_dob: toDateStr(employee?.real_dob) || "",
      license_number: employee?.license_number || "",
      license_expiry: toDateStr(employee?.license_expiry) || "",
      job_title: employee?.job_title || "",
      employment_status: employee?.employment_status || "",
      job_category: employee?.job_category || "",
      sub_unit: employee?.sub_unit || "",
      job_specification: employee?.job_specification || "",
      attendance_calc: employee?.attendance_calc || "",
      probation_end_date: toDateStr(employee?.probation_end_date) || "",
      date_of_permanence: toDateStr(employee?.date_of_permanence) || "",
      contract_start_date: toDateStr(employee?.contract_start_date) || "",
      contract_end_date: toDateStr(employee?.contract_end_date) || "",
      comments: employee?.comments || "",
      work_email: employee?.email || "",
      other_email: employee?.other_email || "",
      mobile: employee?.mobile?.replace(/\D/g, "").slice(0, 10) || "",
      home_tel: employee?.home_tel || "",
      work_tel: employee?.work_tel || "",
      address1: employee?.address1 || "",
      address2: employee?.address2 || "",
      city: employee?.city || "",
      state: employee?.state || "",
      country: employee?.country || "",
      zip: employee?.zip || "",
    }),
    [employee, today],
  );

  useEffect(() => {
    formRef.current = initialForm;
  }, [initialForm]);

  const set =
    (fieldName: keyof typeof initialForm) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      formRef.current[fieldName] = event.target.value;
      if (errors[fieldName])
        setErrors((prev) => {
          const n = { ...prev };
          delete n[fieldName];
          return n;
        });
    };

  function validateCurrentStep(stepNumber: number) {
    const nextErrors = validateEmployeeStep(
      stepNumber,
      formRef.current,
      selectedSupervisors,
      supervisors.length,
    );
    
    if (stepNumber === 1) {
      if (formRef.current.location === "Other" && !customLocation.trim()) {
        nextErrors.customLocation = "Please enter a location";
      }
    }
    
    if (stepNumber === 4) {
      const workEmail = formRef.current.work_email?.trim();
      const otherEmail = formRef.current.other_email?.trim();
      
      if (errors.work_email && workEmail) {
        nextErrors.work_email = errors.work_email;
      }
      
      if (errors.other_email && otherEmail) {
        nextErrors.other_email = errors.other_email;
      }
    }
    
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  const validators: Record<number, () => boolean> = {
    1: () => validateCurrentStep(1),
    2: () => validateCurrentStep(2),
    3: () => validateCurrentStep(3),
    4: () => validateCurrentStep(4),
    5: () => validateCurrentStep(5),
  };

  const handleNext = () => {
    if (validators[step] && !validators[step]()) {
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        setTimeout(() => {
          const errorElement = document.querySelector(`input[name="${firstErrorField}"], select[name="${firstErrorField}"], textarea[name="${firstErrorField}"]`) as HTMLElement;
          if (!errorElement) {
            const allInputs = document.querySelectorAll('input, select, textarea');
            for (const input of Array.from(allInputs)) {
              const inputElement = input as HTMLInputElement;
              if (inputElement.classList.contains('border-red-500')) {
                inputElement.focus();
                inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                break;
              }
            }
          } else {
            errorElement.focus();
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (!validators[5]()) return;
    setSaving(true);
    try {
      const formData = new FormData();
      const formDataToSubmit = { ...formRef.current };
      
      if (formRef.current.location === "Other" && customLocation.trim()) {
        formDataToSubmit.location = customLocation.trim();
      }
      
      Object.entries(formDataToSubmit).forEach(([key, val]) => {
        const value = String(val).trim();
        if (value) formData.append(key, value);
      });
      if (avatarFile) formData.append("avatar", avatarFile);
      formData.append("supervisors", JSON.stringify(selectedSupervisors));
      if (employee?.id) await updateEmployee(employee.id, formData);
      else await createEmployee(formData);
      onSaved();
      onClose();
    } catch (err: any) {
      const errorMessage = getApiErrorMessage(err);
      
      if (errorMessage.toLowerCase().includes("email") && errorMessage.toLowerCase().includes("exist")) {
        const workEmail = formRef.current.work_email?.trim();
        const otherEmail = formRef.current.other_email?.trim();
        
        if (workEmail) {
          setErrors((prev) => ({
            ...prev,
            work_email: "This email address is already registered",
          }));
        }
        
        if (otherEmail && otherEmail === workEmail) {
          setErrors((prev) => ({
            ...prev,
            other_email: "This email address is already registered",
          }));
        }
        
        setStep(4);
      } else {
        setErrors({ submit: errorMessage });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && e.target instanceof HTMLElement) {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "SELECT" ||
        e.target.tagName === "TEXTAREA"
      ) {
        e.preventDefault();
        
        const targetElement = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        const fieldName = targetElement.name || targetElement.getAttribute('name');
        
        if (fieldName && errors[fieldName]) {
          targetElement.focus();
          return;
        }
        
        const form = e.currentTarget;
        const focusableElements = Array.from(
          form.querySelectorAll(
            'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
          )
        ) as HTMLElement[];
        const currentIndex = focusableElements.indexOf(e.target);
        if (currentIndex > -1 && currentIndex < focusableElements.length - 1) {
          focusableElements[currentIndex + 1].focus();
        }
      }
    }
  };

  const handleSelectChange = (
    fieldName: keyof typeof initialForm,
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    formRef.current[fieldName] = event.target.value;
    
    if (fieldName === "location") {
      if (event.target.value === "Other") {
        setShowCustomLocation(true);
      } else {
        setShowCustomLocation(false);
        setCustomLocation("");
        if (errors.customLocation) {
          setErrors((prev) => {
            const n = { ...prev };
            delete n.customLocation;
            return n;
          });
        }
      }
    }
    
    if (errors[fieldName]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[fieldName];
        return n;
      });
    }
    
    if (errors[fieldName]) {
      event.target.focus();
      return;
    }
    
    const selectElement = event.target;
    const form = selectElement.closest("form");
    if (form) {
      const focusableElements = Array.from(
        form.querySelectorAll(
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
        )
      ) as HTMLElement[];
      const currentIndex = focusableElements.indexOf(selectElement);
      if (currentIndex > -1 && currentIndex < focusableElements.length - 1) {
        setTimeout(() => focusableElements[currentIndex + 1].focus(), 0);
      }
    }
  };

  const handleEmailBlur = async (email: string, fieldName: "work_email" | "other_email", element: HTMLInputElement) => {
    if (!email.trim()) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[fieldName];
        return n;
      });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: "Enter a valid email",
      }));
      setTimeout(() => element.focus(), 100);
      return;
    }

    setCheckingEmail(true);
    try {
      const result = await checkEmailExists(email, employee?.id);
      if (result.data.exists) {
        setErrors((prev) => ({
          ...prev,
          [fieldName]: "This email address is already registered",
        }));
        setTimeout(() => element.focus(), 100);
      } else {
        setErrors((prev) => {
          const n = { ...prev };
          delete n[fieldName];
          return n;
        });
      }
    } catch (error) {
      console.error("Error checking email:", error);
    } finally {
      setCheckingEmail(false);
    }
  };

  const renderInput = (
    name: keyof typeof initialForm,
    placeholder = "",
    type = "text",
  ) => (
    <div>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={formRef.current[name]}
        onChange={set(name)}
        className={`w-full px-3 py-2 border-1.5 rounded-lg text-sm outline-none transition-colors ${
          errors[name]
            ? "border-red-500 bg-red-50"
            : "border-slate-200 bg-slate-50 focus:border-slate-300"
        }`}
      />
      {errors[name] && (
        <span className="text-xs text-red-600 mt-1 block">{errors[name]}</span>
      )}
    </div>
  );

  const renderEmailInput = (
    name: "work_email" | "other_email",
    placeholder = "",
  ) => (
    <div>
      <input
        name={name}
        type="email"
        placeholder={placeholder}
        defaultValue={formRef.current[name]}
        onChange={set(name)}
        onBlur={(e) => {
          handleEmailBlur(e.target.value, name, e.target);
        }}
        className={`w-full px-3 py-2 border-1.5 rounded-lg text-sm outline-none transition-colors ${
          errors[name]
            ? "border-red-500 bg-red-50"
            : checkingEmail
            ? "border-blue-500 bg-blue-50"
            : "border-slate-200 bg-slate-50 focus:border-slate-300"
        }`}
      />
      {checkingEmail && (
        <span className="text-xs text-blue-600 mt-1 block">Checking email...</span>
      )}
      {errors[name] && (
        <span className="text-xs text-red-600 mt-1 block">{errors[name]}</span>
      )}
    </div>
  );

  const renderSelect = (
    name: keyof typeof initialForm,
    opts: readonly string[],
    placeholder = "-- Select --",
  ) => (
    <div className="relative">
      <select
        name={name}
        defaultValue={formRef.current[name]}
        onChange={(e) => handleSelectChange(name, e)}
        className={`w-full px-3 py-2 pr-7 border-1.5 rounded-lg text-sm outline-none appearance-none transition-colors ${
          errors[name]
            ? "border-red-500 bg-red-50"
            : "border-slate-200 bg-slate-50 focus:border-slate-300"
        }`}
      >
        <option value="">{placeholder}</option>
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
        ▼
      </span>
      {errors[name] && (
        <span className="text-xs text-red-600 mt-1 block">{errors[name]}</span>
      )}
    </div>
  );

  const renderLabel = (text: string, req = false) => (
    <label className="text-xs font-semibold text-slate-600 block mb-1 tracking-wide">
      {text}
      {req && <span className="text-red-600 ml-0.5">*</span>}
    </label>
  );

  const FormField = (label: string, element: React.ReactNode, req = false) => (
    <div key={label}>
      {renderLabel(label, req)}
      {element}
    </div>
  );

  const TwoColumnGrid = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
  );

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 mb-4">
      <div className="text-xs font-bold text-blue-900 uppercase tracking-widest pb-2 mb-3 border-b border-slate-100">
        {title}
      </div>
      {children}
    </div>
  );

  const renderMobileInput = () => {
    const handleMobileInput = (e: ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 10);
      e.target.value = digitsOnly;
      formRef.current.mobile = digitsOnly;
      if (errors.mobile) {
        setErrors((prev) => {
          const n = { ...prev };
          delete n.mobile;
          return n;
        });
      }
    };

    return (
      <div>
        <input
          name="mobile"
          type="text"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="10-digit mobile number"
          defaultValue={formRef.current.mobile}
          maxLength={10}
          onChange={handleMobileInput}
          className={`w-full px-3 py-2 border-1.5 rounded-lg text-sm outline-none transition-colors ${
            errors.mobile
              ? "border-red-500 bg-red-50"
              : "border-slate-200 bg-slate-50 focus:border-slate-300"
          }`}
        />
        {errors.mobile && (
          <span className="text-xs text-red-600 mt-1 block">
            {errors.mobile}
          </span>
        )}
      </div>
    );
  };

  const renderWorkTelInput = () => {
    const handleWorkTelInput = (e: ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 10);
      e.target.value = digitsOnly;
      formRef.current.work_tel = digitsOnly;
      if (errors.work_tel) {
        setErrors((prev) => {
          const n = { ...prev };
          delete n.work_tel;
          return n;
        });
      }
    };

    return (
      <div>
        <input
          name="work_tel"
          type="text"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="10-digit work telephone"
          defaultValue={formRef.current.work_tel}
          maxLength={10}
          onChange={handleWorkTelInput}
          className={`w-full px-3 py-2 border-1.5 rounded-lg text-sm outline-none transition-colors ${
            errors.work_tel
              ? "border-red-500 bg-red-50"
              : "border-slate-200 bg-slate-50 focus:border-slate-300"
          }`}
        />
        {errors.work_tel && (
          <span className="text-xs text-red-600 mt-1 block">
            {errors.work_tel}
          </span>
        )}
      </div>
    );
  };

  const renderHomeTelInput = () => {
    const handleHomeTelInput = (e: ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 10);
      e.target.value = digitsOnly;
      formRef.current.home_tel = digitsOnly;
      if (errors.home_tel) {
        setErrors((prev) => {
          const n = { ...prev };
          delete n.home_tel;
          return n;
        });
      }
    };

    return (
      <div>
        <input
          name="home_tel"
          type="text"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="10-digit home telephone"
          defaultValue={formRef.current.home_tel}
          maxLength={10}
          onChange={handleHomeTelInput}
          className={`w-full px-3 py-2 border-1.5 rounded-lg text-sm outline-none transition-colors ${
            errors.home_tel
              ? "border-red-500 bg-red-50"
              : "border-slate-200 bg-slate-50 focus:border-slate-300"
          }`}
        />
        {errors.home_tel && (
          <span className="text-xs text-red-600 mt-1 block">
            {errors.home_tel}
          </span>
        )}
      </div>
    );
  };

  const renderPhoneField = () => renderMobileInput();

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-teal-600">
          <h2 className="m-0 text-base font-bold text-white">
            {employee ? "Edit Employee" : "Add New Employee"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/20 border-0 cursor-pointer text-white text-sm hover:bg-white/30 transition"
          >
            ✕
          </button>
        </div>

        <div className="flex p-3 pb-2.5 bg-blue-50 border-b border-slate-100">
          {STEPS.map((label, stepIndex) => {
            const stepNumber = stepIndex + 1;
            const done = stepNumber < step,
              active = stepNumber === step;
            return (
              <div
                key={stepNumber}
                className="flex flex-col items-center flex-1 relative"
              >
                {stepIndex < STEPS.length - 1 && (
                  <div
                    className={`absolute top-3.5 left-1/2 w-full h-0.5 -z-0 ${done ? "bg-teal-600" : "bg-slate-200"}`}
                  />
                )}
                <div
                  className={`w-7 h-7 rounded-full z-10 flex items-center justify-center text-xs font-bold border-2 ${
                    done
                      ? "bg-teal-600 border-teal-600 text-white"
                      : active
                        ? "bg-blue-900 border-blue-900 text-white"
                        : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  {done ? "✓" : stepNumber}
                </div>
                <span
                  className={`text-xs font-semibold mt-1.5 whitespace-nowrap ${
                    active
                      ? "text-blue-900"
                      : done
                        ? "text-teal-600"
                        : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <form className="flex-1 overflow-y-auto p-4" onKeyDown={handleKeyDown}>
          {errors.submit && (
            <div className="p-2.5 bg-red-50 border-l-4 border-red-300 rounded text-red-800 text-sm mb-3.5">
              {errors.submit}
            </div>
          )}

          {step === 1 && (
            <Section title="Basic Information">
              <div className="flex gap-4 mb-3">
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div
                    onClick={() => avatarRef.current?.click()}
                    className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer overflow-hidden flex items-center justify-center hover:bg-slate-100 transition"
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        className="w-full h-full object-cover"
                        alt="preview"
                      />
                    ) : (
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="text-slate-300"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 text-center leading-tight">
                    Click to
                    <br />
                    upload
                  </span>
                  <input
                    ref={avatarRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setAvatarFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) =>
                        setAvatarPreview(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
                <div className="flex-1">
                  <TwoColumnGrid>
                    {FormField(
                      "First Name",
                      renderInput("first_name", "First Name"),
                      true,
                    )}
                    {FormField(
                      "Last Name",
                      renderInput("last_name", "Last Name"),
                      true,
                    )}
                    {FormField(
                      "Middle Name",
                      renderInput("middle_name", "Optional"),
                    )}
                    {FormField(
                      "Employee Id",
                      renderInput("employee_id", "e.g. EMP-001"),
                    )}
                    {FormField(
                      "Joined Date",
                      renderInput("joined_date", "", "date"),
                      true,
                    )}
                    {FormField(
                      "Location",
                      <div>
                        {renderSelect(
                          "location",
                          [...predefinedLocations, "Other"],
                          "-- Select Location --",
                        )}
                        {showCustomLocation && (
                          <div className="mt-2">
                            <label className="text-xs font-semibold text-slate-600 block mb-1 tracking-wide">
                              Specify Location
                              <span className="text-red-600 ml-0.5">*</span>
                            </label>
                            <input
                              name="customLocation"
                              type="text"
                              placeholder="Enter custom location"
                              value={customLocation}
                              onChange={(e) => {
                                setCustomLocation(e.target.value);
                                if (errors.customLocation) {
                                  setErrors((prev) => {
                                    const n = { ...prev };
                                    delete n.customLocation;
                                    return n;
                                  });
                                }
                              }}
                              className={`w-full px-3 py-2 border-1.5 rounded-lg text-sm outline-none transition-colors ${
                                errors.customLocation
                                  ? "border-red-500 bg-red-50"
                                  : "border-slate-200 bg-slate-50 focus:border-slate-300"
                              }`}
                            />
                            {errors.customLocation && (
                              <span className="text-xs text-red-600 mt-1 block">
                                {errors.customLocation}
                              </span>
                            )}
                          </div>
                        )}
                      </div>,
                      true,
                    )}
                  </TwoColumnGrid>
                </div>
              </div>
            </Section>
          )}

          {step === 2 && (
            <Section title="Personal Information">
              <TwoColumnGrid>
                {FormField(
                  "Gender",
                  renderSelect(
                    "gender",
                    ["Male", "Female", "Prefer not to say"],
                    "-- Select --",
                  ),
                  true,
                )}
                {FormField("Date Of Birth", renderInput("dob", "", "date"))}
                {FormField(
                  "Nationality",
                  renderSelect("nationality", NATIONALITIES),
                )}
                {FormField(
                  "Marital Status",
                  renderSelect("marital_status", [
                    "Single",
                    "Married",
                    "Common Law",
                    "Separated",
                    "Divorced",
                    "Widowed",
                    "Other",
                  ]),
                )}
                {FormField(
                  "Blood Group",
                  renderSelect("blood_group", BLOOD_GROUPS),
                )}
                {FormField("Real Dob", renderInput("real_dob", "", "date"))}
                {FormField(
                  "Driver's License No.",
                  renderInput("license_number", "e.g. TN0120260012345"),
                )}
                {FormField(
                  "License Expiry",
                  renderInput("license_expiry", "", "date"),
                )}
              </TwoColumnGrid>
            </Section>
          )}

          {step === 3 && (
            <Section title="Job Details">
              <TwoColumnGrid>
                {FormField(
                  "Job Title",
                  renderSelect(
                    "job_title",
                    jobTitleOptions,
                    "-- Select Job Title --",
                  ),
                  true,
                )}
                {FormField(
                  "Employment Status",
                  renderSelect(
                    "employment_status",
                    EMPLOYMENT_STATUSES,
                    "-- Select --",
                  ),
                  true,
                )}
                {FormField(
                  "Job Category",
                  renderSelect("job_category", jobCategoryOptions),
                )}
                {FormField(
                  "Sub Unit",
                  renderSelect("sub_unit", subUnitOptions),
                )}
                {FormField(
                  "Job Specification",
                  renderSelect(
                    "job_specification",
                    ["Technical", "Non-Technical"],
                    "Not Defined",
                  ),
                )}
                {FormField(
                  "Attendance Calc",
                  renderSelect("attendance_calc", [
                    "Work Schedule",
                    "Clock In/Out",
                    "Manual Entry",
                  ]),
                )}
                {FormField(
                  "Probation End Date",
                  renderInput("probation_end_date", "", "date"),
                )}
                {FormField(
                  "Date Of Permanence",
                  renderInput("date_of_permanence", "", "date"),
                )}
                {FormField(
                  "Contract Start",
                  renderInput("contract_start_date", "", "date"),
                )}
                {FormField(
                  "Contract End",
                  renderInput("contract_end_date", "", "date"),
                )}
              </TwoColumnGrid>
              <div className="mt-3">
                {FormField(
                  "Comments",
                  <textarea
                    defaultValue={formRef.current.comments}
                    onChange={set("comments")}
                    placeholder="Any notes…"
                    className="w-full px-3 py-2 border-1.5 border-slate-200 rounded-lg text-sm outline-none bg-slate-50 focus:border-slate-300 resize-none h-16"
                  />,
                )}
              </div>
            </Section>
          )}

          {step === 4 && (
            <Section title="Contact Information">
              <TwoColumnGrid>
                {FormField(
                  "Work Email",
                  renderEmailInput("work_email", "work@company.com"),
                  true,
                )}
                {FormField(
                  "Other Email",
                  renderEmailInput("other_email", "personal@email.com"),
                )}
                {FormField("Mobile", renderPhoneField(), true)}
                {FormField(
                  "Work Tel",
                  renderWorkTelInput(),
                )}
                {FormField(
                  "Home Tel",
                  renderHomeTelInput(),
                )}
                {FormField(
                  "Address Line 1",
                  renderInput("address1", "Street address"),
                )}
                {FormField(
                  "Address Line 2",
                  renderInput("address2", "Apt, suite, etc."),
                )}
                {FormField("City", renderInput("city", "City"))}
                {FormField("State", renderInput("state", "State / Province"))}
                {FormField("Country", renderSelect("country", COUNTRIES))}
                {FormField("Zip Code", renderInput("zip", "Postal code"))}
              </TwoColumnGrid>
            </Section>
          )}

          {step === 5 && (
            <Section title="Report To — Assign Supervisors (Max 3)">
              <p className="text-sm text-slate-600 mb-3.5">
                Select up to 3 supervisors from the sub unit list below.
              </p>
              {supervisors.length === 0 ? (
                <p className="text-sm text-slate-400 italic">
                  No supervisors available. Add supervisor names in HR
                  Administration → Sub Units first.
                </p>
              ) : (
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  {supervisors.map((supervis, idx) => {
                    const checked = selectedSupervisors.includes(supervis.name);
                    const subUnitMatch = subUnitRecords.find(
                      (su) =>
                        su.supervisor_name?.toLowerCase() ===
                        supervis.name.toLowerCase(),
                    );
                    return (
                      <label
                        key={supervis.name}
                        className={`flex items-center gap-3 p-2.75 cursor-pointer transition-colors ${
                          checked
                            ? "bg-emerald-50"
                            : idx % 2 === 0
                              ? "bg-white"
                              : "bg-blue-50"
                        } ${idx < supervisors.length - 1 ? "border-b border-slate-100" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!checked && selectedSupervisors.length >= 3}
                          onChange={() => {
                            setSelectedSupervisors((prev) =>
                              checked
                                ? prev.filter((n) => n !== supervis.name)
                                : prev.length < 3
                                  ? [...prev, supervis.name]
                                  : prev,
                            );
                            if (errors.supervisors)
                              setErrors((e) => {
                                const n = { ...e };
                                delete n.supervisors;
                                return n;
                              });
                          }}
                          className="w-4 h-4 accent-blue-900 flex-shrink-0"
                        />
                        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-900 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {supervis.name
                            .split(" ")
                            .map((w: string) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-900">
                            {supervis.name}
                          </div>
                          {subUnitMatch && (
                            <div className="text-xs text-slate-500">
                              {subUnitMatch.sub_unit_name}
                            </div>
                          )}
                        </div>
                        {checked && (
                          <span className="text-xs font-semibold text-teal-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            Selected
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
              {errors.supervisors && (
                <span className="text-xs text-red-600 block mt-2">
                  {errors.supervisors}
                </span>
              )}
              {selectedSupervisors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs text-slate-400 self-center">
                    Assigned:
                  </span>
                  {selectedSupervisors.map((name) => (
                    <span
                      key={name}
                      className="flex items-center gap-1.5 bg-blue-100 text-blue-700 rounded-full py-1 px-3 text-xs font-semibold"
                    >
                      {name}
                      <button
                        onClick={() =>
                          setSelectedSupervisors((prev) =>
                            prev.filter((n) => n !== name),
                          )
                        }
                        className="bg-none border-0 cursor-pointer text-blue-700 text-base leading-none pl-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Section>
          )}
        </form>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
          <span className="text-xs text-slate-400">
            <span className="text-red-600">*</span> Required fields
          </span>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full border border-slate-200 bg-white text-sm font-semibold cursor-pointer text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-5 py-2 rounded-full border border-blue-900 bg-white text-sm font-semibold cursor-pointer text-blue-900 hover:bg-blue-50 transition"
              >
                ← Back
              </button>
            )}
            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-7 py-2 rounded-full border-0 bg-gradient-to-r from-blue-900 to-teal-600 text-white text-sm font-bold cursor-pointer hover:shadow-lg transition"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className={`px-7 py-2 rounded-full border-0 bg-gradient-to-r from-blue-900 to-teal-600 text-white text-sm font-bold cursor-pointer hover:shadow-lg transition ${saving ? "opacity-65 cursor-not-allowed" : ""}`}
              >
                {saving
                  ? "Saving…"
                  : employee
                    ? "Update Employee"
                    : "Create Employee"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
