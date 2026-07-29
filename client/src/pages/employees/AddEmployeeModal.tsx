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
  checkEmployeeIdExists,
  getLastEmployeeId,
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
  COUNTRIES,
  NATIONALITIES,
  BLOOD_GROUPS,
  EMPLOYMENT_STATUSES,
} from "../../constants/employeeOptions";
import { ISO_DATE_PATTERN } from "../../constants/employeeOptions";
import { EMAIL_PATTERN } from "../../constants/validationPatterns";
import { KeyboardKey } from "../../constants/keyboard";
import { handleMobileInput } from "./components/inputHelpers";
import Toast from "../../utils/toast";
import { ROLES } from "../../config/roles";
import {
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_IMAGE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
} from "../../config/constants";
import { IconChevronDown, IconUser, IconX } from "../../components/Icons";
import { EMAIL_REGEX } from "../../constants/validation";

const PREDEFINED_LOCATIONS = ["Bangalore", "Coimbatore", "Hyderabad"];

const WORK_EMAIL_FIELD = "work_email" as const;
const OTHER_EMAIL_FIELD = "other_email" as const;
type EmailFieldName = typeof WORK_EMAIL_FIELD | typeof OTHER_EMAIL_FIELD;
interface Props {
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}
interface Supervisor {
  id?: number | null;
  employee_id?: string | null;
  name: string;
  username?: string | null;
  email?: string | null;
  role?: string | null;
  job_title?: string | null;
  sub_unit?: string | null;
}

function formatDateInputValue(value?: string | null): string {
  if (!value) return "";
  if (ISO_DATE_PATTERN.test(value)) return value;
  try {
    return new Date(value).toISOString().slice(0, 10);
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
  const [selectedSupervisors, setSelectedSupervisors] = useState<number[]>([]);
  const [jobTitleOptions, setJobTitleOptions] = useState<string[]>([]);
  const [jobCategoryOptions, setJobCategoryOptions] = useState<string[]>([]);
  const [subUnitOptions, setSubUnitOptions] = useState<string[]>([]);
  const [subUnitRecords, setSubUnitRecords] = useState<SubUnit[]>([]);
  const [checkingEmail, setCheckingEmail] = useState<{
    [WORK_EMAIL_FIELD]: boolean;
    [OTHER_EMAIL_FIELD]: boolean;
  }>({ [WORK_EMAIL_FIELD]: false, [OTHER_EMAIL_FIELD]: false });
  const [checkingEmployeeId, setCheckingEmployeeId] = useState(false);
  const [lastEmployeeId, setLastEmployeeId] = useState<string | null>(null);

  const avatarRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<Record<keyof typeof initialForm, string>>({} as any);
  const validatedWorkEmailRef = useRef<string>("");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    getSupervisors()
      .then((response) =>
        setSupervisors(
          response.data.filter(
            (supervisor) =>
              !employee?.id || String(supervisor.id) !== String(employee.id),
          ),
        ),
      )
      .catch(() => setApiError("Failed to load supervisors"));
    getJobTitles()
      .then((response) =>
        setJobTitleOptions(response.data.map((jobTitle) => jobTitle.title)),
      )
      .catch(() => setApiError("Failed to load job titles"));

    getJobCategories()
      .then((response) =>
        setJobCategoryOptions(
          response.data.map((jobCategory) => jobCategory.category),
        ),
      )
      .catch(() => setApiError("Failed to load job categories"));

    getSubUnits()
      .then((response) => {
        setSubUnitRecords(response.data);
        setSubUnitOptions(
          response.data.map((subUnit) => subUnit.sub_unit_name),
        );
      })
      .catch(() => setApiError("Failed to load sub units"));

    getLastEmployeeId()
      .then((response) => setLastEmployeeId(response.data.employee_id))
      .catch(() => setApiError("Failed to load employee ID"));
  }, [employee?.id]);

  useEffect(() => {
    if (employee?.supervisors && Array.isArray(employee.supervisors)) {
      setSelectedSupervisors(
        employee.supervisors
          .map((supervisor) => parseInt(String(supervisor), 10))
          .filter(
            (supervisorId) =>
              !isNaN(supervisorId) &&
              String(supervisorId) !== String(employee.id),
          )
          .slice(0, 1),
      );
    }
  }, [employee?.id]);

  const initialForm = useMemo(
    () => ({
      first_name: employee?.first_name || "",
      middle_name: employee?.middle_name || "",
      last_name: employee?.last_name || "",
      employee_id: employee?.employee_id || "",
      joined_date: formatDateInputValue(employee?.joined_date) || today,
      location: employee?.location || "",
      role: ROLES.EMPLOYEE,
      gender: employee?.gender || "",
      dob: formatDateInputValue(employee?.dob) || "",
      nationality: employee?.nationality || "",
      marital_status: employee?.marital_status || "",
      blood_group: employee?.blood_group || "",
      real_dob: formatDateInputValue(employee?.real_dob) || "",
      license_number: employee?.license_number || "",
      license_expiry: formatDateInputValue(employee?.license_expiry) || "",
      job_title: employee?.job_title || "",
      job_category: employee?.job_category || "",
      sub_unit: employee?.sub_unit || "",
      employment_status: employee?.employment_status || "",
      job_specification: employee?.job_specification || "",
      attendance_calc: employee?.attendance_calc || "",
      probation_end_date:
        formatDateInputValue(employee?.probation_end_date) || "",
      date_of_permanence:
        formatDateInputValue(employee?.date_of_permanence) || "",
      contract_start_date:
        formatDateInputValue(employee?.contract_start_date) || "",
      contract_end_date:
        formatDateInputValue(employee?.contract_end_date) || "",
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

  // Reset stale loading state when leaving Step 4
  useEffect(() => {
    if (step !== 4) {
      setCheckingEmail((prev) => ({
        ...prev,
        [WORK_EMAIL_FIELD]: false,
      }));
    }
  }, [step]);

  // Centralized work email validation function
  const validateWorkEmailExists = async (): Promise<boolean> => {
    const workEmail = formRef.current[WORK_EMAIL_FIELD]?.trim().toLowerCase();

    if (!workEmail || !EMAIL_REGEX.test(workEmail)) {
      return false;
    }

    if (
      validatedWorkEmailRef.current === workEmail &&
      !errors[WORK_EMAIL_FIELD]
    ) {
      return true;
    }

    setCheckingEmail((prev) => ({
      ...prev,
      [WORK_EMAIL_FIELD]: true,
    }));

    try {
      const result = await checkEmailExists(workEmail, employee?.id);

      if (result.data.exists) {
        validatedWorkEmailRef.current = "";
        setErrors((prev) => ({
          ...prev,
          [WORK_EMAIL_FIELD]: "This email address is already registered",
        }));
        return false;
      }

      validatedWorkEmailRef.current = workEmail;
      setErrors((prev) => {
        const updatedErrors = { ...prev };
        delete updatedErrors[WORK_EMAIL_FIELD];
        return updatedErrors;
      });
      return true;
    } catch {
      validatedWorkEmailRef.current = "";
      setErrors((prev) => ({
        ...prev,
        [WORK_EMAIL_FIELD]: "Could not validate this email right now",
      }));
      return false;
    } finally {
      setCheckingEmail((prev) => ({
        ...prev,
        [WORK_EMAIL_FIELD]: false,
      }));
    }
  };

  // Validate work email when entering step 4
  useEffect(() => {
    if (step === 4) {
      const workEmail = formRef.current[WORK_EMAIL_FIELD]?.trim().toLowerCase();

      if (
        workEmail &&
        EMAIL_REGEX.test(workEmail) &&
        validatedWorkEmailRef.current !== workEmail
      ) {
        validateWorkEmailExists();
      }
    }
  }, [step, employee?.id]);

  const handleFieldChange =
    (fieldName: keyof typeof initialForm) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const value = event.target.value;
      formRef.current[fieldName] = value;

      // Clear validated email cache when work email changes
      if (fieldName === WORK_EMAIL_FIELD) {
        const normalizedEmail = value.trim().toLowerCase();
        if (validatedWorkEmailRef.current !== normalizedEmail) {
          validatedWorkEmailRef.current = "";
        }
      }

      if (errors[fieldName])
        setErrors((prev) => {
          const updatedErrors = { ...prev };
          delete updatedErrors[fieldName];
          return updatedErrors;
        });
    };

  function validateCurrentStep(stepNumber: number) {
    const nextErrors = validateEmployeeStep(
      stepNumber,
      formRef.current,
      selectedSupervisors.map(String),
      supervisors.length,
    );

    if (stepNumber === 1) {
      const employeeId = formRef.current.employee_id?.trim();
      if (errors.employee_id && employeeId) {
        nextErrors.employee_id = errors.employee_id;
      }
    }

    if (stepNumber === 4) {
      const workEmail = formRef.current[WORK_EMAIL_FIELD]?.trim();

      if (errors[WORK_EMAIL_FIELD] && workEmail) {
        nextErrors[WORK_EMAIL_FIELD] = errors[WORK_EMAIL_FIELD];
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

  const handleNext = async () => {
    if (validators[step] && !validators[step]()) {
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        setTimeout(() => {
          const errorElement = document.querySelector(
            `input[name="${firstErrorField}"], select[name="${firstErrorField}"], textarea[name="${firstErrorField}"]`,
          ) as HTMLElement;
          if (!errorElement) {
            const allInputs = document.querySelectorAll(
              "input, select, textarea",
            );
            for (const input of Array.from(allInputs)) {
              const inputElement = input as HTMLInputElement;
              if (inputElement.classList.contains("border-red-500")) {
                inputElement.focus();
                inputElement.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                break;
              }
            }
          } else {
            errorElement.focus();
            errorElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        }, 100);
      }
      return;
    }

    // Validate work email on step 4 before proceeding
    if (step === 4) {
      const emailAvailable = await validateWorkEmailExists();
      if (!emailAvailable) {
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (!validators[5]()) return;
    setSaving(true);
    try {
      const formData = new FormData();
      const formDataToSubmit = { ...formRef.current };

      Object.entries(formDataToSubmit).forEach(([key, val]) => {
        const value = String(val).trim();
        if (value) formData.append(key, value);
      });
      if (avatarFile) formData.append("avatar", avatarFile);
      formData.append("supervisors", JSON.stringify(selectedSupervisors));
      if (employee?.id) {
        await updateEmployee(employee.id, formData);
        Toast.updated("Employee");
      } else {
        await createEmployee(formData);
        Toast.created("Employee");
      }
      onSaved();
      onClose();
    } catch (requestError: unknown) {
      const errorMessage = getApiErrorMessage(requestError);

      if (
        errorMessage.toLowerCase().includes("employee id") &&
        errorMessage.toLowerCase().includes("exist")
      ) {
        setErrors((prev) => ({
          ...prev,
          employee_id: "Employee ID already exists",
        }));
        setStep(1);
        Toast.error("Employee ID already exists");
      } else if (
        errorMessage.toLowerCase().includes("email") &&
        errorMessage.toLowerCase().includes("exist")
      ) {
        const workEmail = formRef.current[WORK_EMAIL_FIELD]?.trim();

        if (workEmail) {
          setErrors((prev) => ({
            ...prev,
            [WORK_EMAIL_FIELD]: "This email address is already registered",
          }));
        }

        setStep(4);
        Toast.error("Email address already exists");
      } else {
        setErrors({ submit: errorMessage });
        Toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (
      event.key === KeyboardKey.Enter &&
      event.target instanceof HTMLElement
    ) {
      if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "SELECT" ||
        event.target.tagName === "TEXTAREA"
      ) {
        event.preventDefault();

        const targetElement = event.target as
          | HTMLInputElement
          | HTMLSelectElement
          | HTMLTextAreaElement;
        const fieldName =
          targetElement.name || targetElement.getAttribute("name");

        if (fieldName && errors[fieldName]) {
          targetElement.focus();
          return;
        }

        const form = event.currentTarget;
        const focusableElements = Array.from(
          form.querySelectorAll(
            'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
          ),
        ) as HTMLElement[];
        const currentIndex = focusableElements.indexOf(event.target);
        if (currentIndex > -1 && currentIndex < focusableElements.length - 1) {
          focusableElements[currentIndex + 1].focus();
        }
      }
    }
  };

  const handleSelectChange = (
    fieldName: keyof typeof initialForm,
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    formRef.current[fieldName] = event.target.value;

    if (errors[fieldName]) {
      setErrors((prev) => {
        const updatedErrors = { ...prev };
        delete updatedErrors[fieldName];
        return updatedErrors;
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
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
        ),
      ) as HTMLElement[];
      const currentIndex = focusableElements.indexOf(selectElement);
      if (currentIndex > -1 && currentIndex < focusableElements.length - 1) {
        setTimeout(() => focusableElements[currentIndex + 1].focus(), 0);
      }
    }
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const showFileError = (message: string) => {
      Toast.error(message);
      event.target.value = "";
    };

    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      showFileError(
        `Invalid file type. Please upload ${SUPPORTED_IMAGE_EXTENSIONS.join(", ").toUpperCase()} images only.`,
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      showFileError(
        `File size exceeds ${MAX_FILE_SIZE_MB}MB. Please upload a smaller image.`,
      );
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleEmailBlur = async (
    email: string,
    fieldName: EmailFieldName,
    element: HTMLInputElement,
  ) => {
    // For OTHER_EMAIL_FIELD: only validate format, not existence
    if (fieldName === OTHER_EMAIL_FIELD) {
      if (!email.trim()) {
        setErrors((prev) => {
          const updatedErrors = { ...prev };
          delete updatedErrors[fieldName];
          return updatedErrors;
        });
        return;
      }

      if (!EMAIL_REGEX.test(email)) {
        setErrors((prev) => ({
          ...prev,
          [fieldName]: "Enter a valid email",
        }));
        setTimeout(() => element.focus(), 100);
        return;
      }

      // Clear error if format is valid
      setErrors((prev) => {
        const updatedErrors = { ...prev };
        delete updatedErrors[fieldName];
        return updatedErrors;
      });
      return;
    }

    // For WORK_EMAIL_FIELD: validate both format and existence
    if (!email.trim()) {
      setErrors((prev) => {
        const updatedErrors = { ...prev };
        delete updatedErrors[fieldName];
        return updatedErrors;
      });
      return;
    }

    if (!EMAIL_PATTERN.test(email)) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: "Enter a valid email",
      }));
      setTimeout(() => element.focus(), 100);
      return;
    }

    setCheckingEmail((prev) => ({ ...prev, [fieldName]: true }));
    try {
      const result = await checkEmailExists(email.toLowerCase(), employee?.id);
      if (result.data.exists) {
        setErrors((prev) => ({
          ...prev,
          [fieldName]: "This email address is already registered",
        }));
        setTimeout(() => element.focus(), 100);
      } else {
        setErrors((prev) => {
          const updatedErrors = { ...prev };
          delete updatedErrors[fieldName];
          return updatedErrors;
        });
      }
    } catch {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: "Could not validate this email right now",
      }));
    } finally {
      setCheckingEmail((prev) => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleEmployeeIdBlur = async (
    employeeId: string,
    element: HTMLInputElement,
  ) => {
    if (!employeeId.trim()) {
      setErrors((prev) => {
        const updatedErrors = { ...prev };
        delete updatedErrors.employee_id;
        return updatedErrors;
      });
      return;
    }

    setCheckingEmployeeId(true);
    try {
      const result = await checkEmployeeIdExists(
        employeeId.toLowerCase(),
        employee?.id,
      );
      if (result.data.exists) {
        setErrors((prev) => ({
          ...prev,
          employee_id: "Employee ID already exists",
        }));
        setTimeout(() => element.focus(), 100);
      } else {
        setErrors((prev) => {
          const updatedErrors = { ...prev };
          delete updatedErrors.employee_id;
          return updatedErrors;
        });
      }
    } catch {
      setErrors((prev) => ({
        ...prev,
        employee_id: "Could not validate this employee ID right now",
      }));
    } finally {
      setCheckingEmployeeId(false);
    }
  };

  const handleSupervisorSelectionChange = (
    supervisorId: number,
    isSelected: boolean,
  ) => {
    setSelectedSupervisors(isSelected ? [] : [supervisorId]);
    setErrors((currentErrors) => {
      const updatedErrors = { ...currentErrors };
      delete updatedErrors.supervisors;
      return updatedErrors;
    });
  };

  const removeSelectedSupervisor = (supervisorId: number) => {
    setSelectedSupervisors((currentSupervisorIds) =>
      currentSupervisorIds.filter((selectedId) => selectedId !== supervisorId),
    );
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
        onChange={handleFieldChange(name)}
        className={`w-full px-3 py-2 border-2 rounded-lg text-sm outline-none transition-colors ${
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

  const renderEmployeeIdInput = () => (
    <div>
      <input
        name="employee_id"
        type="text"
        placeholder="e.g. EMP-001"
        defaultValue={formRef.current.employee_id}
        onChange={handleFieldChange("employee_id")}
        onBlur={(event) =>
          handleEmployeeIdBlur(event.target.value, event.target)
        }
        className={`w-full px-3 py-2 border-2 rounded-lg text-sm outline-none transition-colors ${
          errors.employee_id
            ? "border-red-500 bg-red-50"
            : checkingEmployeeId
              ? "border-blue-500 bg-blue-50"
              : "border-slate-200 bg-slate-50 focus:border-slate-300"
        }`}
      />
      {checkingEmployeeId && (
        <span className="text-xs text-blue-600 mt-1 block">
          Checking Employee ID...
        </span>
      )}
      {errors.employee_id && (
        <span className="text-xs text-red-600 mt-1 block">
          {errors.employee_id}
        </span>
      )}
      {!errors.employee_id && lastEmployeeId && !checkingEmployeeId && (
        <span className="text-xs text-slate-500 mt-1 block">
          Last Employee ID: {lastEmployeeId}
        </span>
      )}
    </div>
  );

  const renderEmailInput = (name: EmailFieldName, placeholder = "") => (
    <div>
      <input
        name={name}
        type="email"
        placeholder={placeholder}
        defaultValue={formRef.current[name]}
        onChange={handleFieldChange(name)}
        onBlur={(event) => {
          handleEmailBlur(event.target.value, name, event.target);
        }}
        className={`w-full px-3 py-2 border-2 rounded-lg text-sm outline-none transition-colors ${
          errors[name]
            ? "border-red-500 bg-red-50"
            : checkingEmail[name]
              ? "border-blue-500 bg-blue-50"
              : "border-slate-200 bg-slate-50 focus:border-slate-300"
        }`}
      />
      {checkingEmail[name] && (
        <span className="text-xs text-blue-600 mt-1 block">
          Checking email...
        </span>
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
        onChange={(event) => handleSelectChange(name, event)}
        className={`w-full px-3 py-2 pr-7 border-2 rounded-lg text-sm outline-none appearance-none transition-colors ${
          errors[name]
            ? "border-red-500 bg-red-50"
            : "border-slate-200 bg-slate-50 focus:border-slate-300"
        }`}
      >
        <option value="">{placeholder}</option>
        {opts.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <IconChevronDown size={12} />
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

  const renderPhoneInput = (
    field: "mobile" | "work_tel" | "home_tel",
    placeholder: string,
  ) => {
    return (
      <div>
        <input
          name={field}
          type="text"
          inputMode="numeric"
          autoComplete="tel"
          placeholder={placeholder}
          defaultValue={formRef.current[field]}
          maxLength={10}
          onChange={(event) =>
            handleMobileInput(event, formRef, field, errors, setErrors)
          }
          className={`w-full px-3 py-2 border-2 rounded-lg text-sm outline-none transition-colors ${
            errors[field]
              ? "border-red-500 bg-red-50"
              : "border-slate-200 bg-slate-50 focus:border-slate-300"
          }`}
        />
        {errors[field] && (
          <span className="text-xs text-red-600 mt-1 block">
            {errors[field]}
          </span>
        )}
      </div>
    );
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[100vh] flex flex-col shadow-2xl overflow-hidden">
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
                onClick={() => setStep(stepNumber)}
                className="flex flex-col items-center flex-1 relative cursor-pointer hover:opacity-80 transition-opacity"
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
          {apiError && (
            <div className="p-2.5 bg-red-50 border-l-4 border-red-300 rounded text-red-800 text-sm mb-3.5">
              {apiError}
            </div>
          )}

          {step === 1 && (
            <Section title="Basic Information">
              <div className="flex gap-10 mb-3">
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div
                    onClick={() => avatarRef.current?.click()}
                    className={`w-20 h-20 rounded-full border-2 border-dashed cursor-pointer overflow-hidden flex items-center justify-center hover:bg-slate-100 transition ${
                      errors.avatar
                        ? "border-red-500 bg-red-50"
                        : "border-slate-300 bg-slate-50"
                    }`}
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        className="w-full h-full object-cover"
                        alt="preview"
                      />
                    ) : (
                      <span className="text-slate-300">
                        <IconUser size={28} />
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs text-center  leading-tight ${errors.avatar ? "text-red-600" : "text-slate-400"}`}
                  >
                    Click to
                    <br />
                    upload
                  </span>
                  {errors.avatar ? (
                    <span className="text-xs text-red-600 text-center leading-tight">
                      {errors.avatar}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 text-center leading-tight">
                      Max 5MB
                    </span>
                  )}
                  <input
                    ref={avatarRef}
                    type="file"
                    accept={SUPPORTED_IMAGE_EXTENSIONS.join(",")}
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div className="flex-1 ">
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
                    {FormField("Employee Id", renderEmployeeIdInput())}
                    {FormField(
                      "Joined Date",
                      renderInput("joined_date", "", "date"),
                      true,
                    )}
                    {FormField(
                      "Location",
                      renderSelect(
                        "location",
                        PREDEFINED_LOCATIONS,
                        "-- Select Location --",
                      ),
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
                  "Job Category",
                  renderSelect("job_category", jobCategoryOptions),
                )}
                {FormField(
                  "Sub Unit",
                  renderSelect("sub_unit", subUnitOptions),
                )}
                {FormField(
                  "Employment Status",
                  renderSelect(
                    "employment_status",
                    EMPLOYMENT_STATUSES,
                    "-- Select Employment Status --",
                  ),
                  true,
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
                  "Attendance Calculation Basics",
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
                    name="comments"
                    defaultValue={formRef.current.comments}
                    onChange={handleFieldChange("comments")}
                    placeholder="Any notes…"
                    className={`w-full px-3 py-2 border-2 rounded-lg text-sm outline-none resize-none h-16 transition-colors ${
                      errors.comments
                        ? "border-red-500 bg-red-50"
                        : "border-slate-200 bg-slate-50 focus:border-slate-300"
                    }`}
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
                  renderEmailInput(WORK_EMAIL_FIELD, "work@company.com"),
                  true,
                )}
                {FormField(
                  "Other Email",
                  renderEmailInput(OTHER_EMAIL_FIELD, "personal@email.com"),
                )}

                {FormField(
                  "Mobile",
                  renderPhoneInput("mobile", "10-digit mobile number"),
                  true,
                )}
                {FormField(
                  "Work Tel",
                  renderPhoneInput("work_tel", "10-digit work telephone"),
                )}
                {FormField(
                  "Home Tel",
                  renderPhoneInput("home_tel", "10-digit home telephone"),
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
            <Section title="Report To - Assign Supervisor">
              <p className="text-sm text-slate-600 mb-3.5">
                Select supervisor from the available supervisor list below.
              </p>
              {supervisors.length === 0 ? (
                <p className="text-sm text-slate-400 italic">
                  No supervisors available. Add a user with Supervisor or
                  Manager role in HR Administration.
                </p>
              ) : (
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  {supervisors.map((supervisor, supervisorIndex) => {
                    const supervisorId =
                      typeof supervisor.id === "number" ? supervisor.id : -1;
                    const checked =
                      supervisorId !== -1 &&
                      selectedSupervisors.includes(supervisorId);
                    const subUnitMatch = subUnitRecords.find(
                      (subUnit) =>
                        subUnit.supervisor_name?.toLowerCase() ===
                        supervisor.name.toLowerCase(),
                    );
                    return (
                      <label
                        key={supervisor.id}
                        className={`flex items-center gap-3 p-2.75 cursor-pointer transition-colors ${
                          checked
                            ? "bg-emerald-50"
                            : supervisorIndex % 2 === 0
                              ? "bg-white"
                              : "bg-blue-50"
                        } ${supervisorIndex < supervisors.length - 1 ? "border-b border-slate-100" : ""}`}
                      >
                        <input
                          type="radio"
                          name="supervisor"
                          checked={checked}
                          onChange={() =>
                            handleSupervisorSelectionChange(
                              supervisorId,
                              checked,
                            )
                          }
                          className="w-4 h-4 accent-blue-900 flex-shrink-0"
                        />
                        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-900 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {supervisor.name
                            .split(" ")
                            .map((user: string) => user[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-900">
                            {supervisor.name}
                          </div>
                          {(subUnitMatch ||
                            supervisor.job_title ||
                            supervisor.sub_unit ||
                            supervisor.email) && (
                            <div className="text-xs text-slate-500">
                              {[
                                supervisor.job_title,
                                supervisor.sub_unit ||
                                  subUnitMatch?.sub_unit_name,
                                supervisor.email,
                              ]
                                .filter(Boolean)
                                .join(" - ")}
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
                  {selectedSupervisors.map((supervisorId) => {
                    const supervisor = supervisors.find(
                      (availableSupervisor) =>
                        availableSupervisor.id === supervisorId,
                    );
                    const name = supervisor?.name || String(supervisorId);
                    return (
                      <span
                        key={supervisorId}
                        className="flex items-center gap-1.5 bg-blue-100 text-blue-700 rounded-full py-1 px-3 text-xs font-semibold"
                      >
                        {name}
                        <button
                          type="button"
                          aria-label={`Remove ${name}`}
                          onClick={() => removeSelectedSupervisor(supervisorId)}
                          className="bg-none border-0 cursor-pointer text-blue-700 text-base leading-none pl-1"
                        >
                          <IconX size={14} />
                        </button>
                      </span>
                    );
                  })}
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
                onClick={() => setStep((currentStep) => currentStep - 1)}
                className="px-5 py-2 rounded-full border border-blue-900 bg-white text-sm font-semibold cursor-pointer text-blue-900 hover:bg-blue-50 transition"
              >
                ← Back
              </button>
            )}
            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={step === 4 && checkingEmail[WORK_EMAIL_FIELD]}
                className={`px-7 py-2 rounded-full border-0 bg-gradient-to-r from-blue-900 to-teal-600 text-white text-sm font-bold transition ${
                  step === 4 && checkingEmail[WORK_EMAIL_FIELD]
                    ? "opacity-65 cursor-not-allowed"
                    : "cursor-pointer hover:shadow-lg"
                }`}
              >
                {step === 4 && checkingEmail[WORK_EMAIL_FIELD]
                  ? "Checking..."
                  : "Next →"}
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
