import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { terminateEmployee } from "../../../api/employee.api";
import { getApiErrorMessage } from "../../../utils/errors";

interface TerminationModalProps {
  employeeId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TerminationModal({
  employeeId,
  onClose,
  onSuccess,
}: TerminationModalProps) {
  const [terminationForm, setTerminationForm] = useState({
    terminationReason: "",
    terminationReasonOther: "",
    terminationDateTime: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [actionMessage, setActionMessage] = useState("");
  const formRef = useRef<Record<keyof typeof terminationForm, string>>(
    {} as any,
  );

  useEffect(() => {
    formRef.current = terminationForm;
  }, [terminationForm]);

  const set =
    (fieldName: keyof typeof terminationForm) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const value = event.target.value;
      formRef.current[fieldName] = value;
      setTerminationForm((prev) => ({
        ...prev,
        [fieldName]: value,
      }));
      if (errors[fieldName])
        setErrors((currentErrors) => {
          const newErrors = { ...currentErrors };
          delete newErrors[fieldName];
          return newErrors;
        });
    };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!terminationForm.terminationReason.trim()) {
      newErrors.terminationReason = "Termination reason is required";
    } else if (
      terminationForm.terminationReason === "Other" &&
      !terminationForm.terminationReasonOther.trim()
    ) {
      newErrors.terminationReasonOther =
        "Please specify the termination reason";
    }

    if (!terminationForm.terminationDateTime.trim()) {
      newErrors.terminationDateTime = "Termination date and time is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTerminateSubmit = async () => {
    if (saving) return;

    if (!validateForm()) return;

    try {
      setSaving(true);
      setActionMessage("");

      const reason =
        terminationForm.terminationReason === "Other"
          ? terminationForm.terminationReasonOther.trim()
          : terminationForm.terminationReason.trim();

      await terminateEmployee(employeeId, {
        terminationReason: reason,
        terminationDateTime: terminationForm.terminationDateTime.trim(),
        notes: terminationForm.notes.trim(),
      });

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      setErrors({
        submit: getApiErrorMessage(err, "Failed to terminate employee."),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTerminateCancel = () => {
    onClose();
  };

  const renderInput = (
    name: keyof typeof terminationForm,
    placeholder = "",
    type = "text",
    req = false,
  ) => (
    <div>
      <label className="text-xs font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
        {name
          .split(/(?=[A-Z])/)
          .map((word) => word.toLowerCase())
          .join(" ")
          .replace(/^./, (str) => str.toUpperCase())}
        {req && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      <input
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

  const renderDateInput = (
    name: keyof typeof terminationForm,
    placeholder = "",
  ) => (
    <div>
      <label className="text-xs font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
        {name
          .split(/(?=[A-Z])/)
          .map((word) => word.toLowerCase())
          .join(" ")
          .replace(/^./, (str) => str.toUpperCase())}
        <span className="text-red-600 ml-0.5">*</span>
      </label>
      <input
        type="datetime-local"
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

  const renderTextArea = (
    name: keyof typeof terminationForm,
    placeholder = "",
    req = false,
  ) => (
    <div>
      <label className="text-xs font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
        {name
          .split(/(?=[A-Z])/)
          .map((word) => word.toLowerCase())
          .join(" ")
          .replace(/^./, (str) => str.toUpperCase())}
        {req && <span className="text-red-600 ml-0.5">*</span>}
      </label>

      <textarea
        defaultValue={formRef.current[name]}
        onChange={set(name)}
        placeholder={placeholder}
        rows={4}
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

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-teal-600">
          <h2 className="m-0 text-base font-bold text-white">
            Terminate Employment
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/20 border-0 cursor-pointer text-white text-sm hover:bg-white/30 transition"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {Object.keys(errors).length > 0 && (
            <div className="p-2.5 bg-red-50 border-l-4 border-red-300 rounded text-red-800 text-sm mb-4">
              {errors.submit ||
                Object.values(errors).map((msg, index) => (
                  <span key={index}>{msg}</span>
                ))}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                Termination Reason
                <span className="text-red-600 ml-0.5">*</span>
              </label>
              <select
                defaultValue={formRef.current.terminationReason}
                onChange={set("terminationReason")}
                className={`w-full px-3 py-2 border-1.5 rounded-lg text-sm outline-none transition-colors ${
                  errors.terminationReason
                    ? "border-red-500 bg-red-50"
                    : "border-slate-200 bg-slate-50 focus:border-slate-300"
                }`}
              >
                <option value="">Select a reason</option>
                <option value="Contract Not Renewed">
                  Contract Not Renewed
                </option>
                <option value="Deceased">Deceased</option>
                <option value="Dismissed">Dismissed</option>
                <option value="Laid-off">Laid-off</option>
                <option value="Other">Other</option>
                <option value="Physically Disabled/Compensated">
                  Physically Disabled/Compensated
                </option>
                <option value="Resigned">Resigned</option>
                <option value="Resigned - Company Requested">
                  Resigned - Company Requested
                </option>
                <option value="Resigned - Self Proposed">
                  Resigned - Self Proposed
                </option>
                <option value="Retired">Retired</option>
              </select>
              {errors.terminationReason && (
                <span className="text-xs text-red-600 mt-1 block">
                  {errors.terminationReason}
                </span>
              )}
              {terminationForm.terminationReason === "Other" && (
                <div className="mt-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1 uppercase tracking-wide">
                    Please specify reason
                    <span className="text-red-600 ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    defaultValue={formRef.current.terminationReasonOther}
                    onChange={set("terminationReasonOther")}
                    className={`w-full px-3 py-2 border-1.5 rounded-lg text-sm outline-none transition-colors ${
                      errors.terminationReasonOther
                        ? "border-red-500 bg-red-50"
                        : "border-slate-200 bg-slate-50 focus:border-slate-300"
                    }`}
                  />
                  {errors.terminationReasonOther && (
                    <span className="text-xs text-red-600 mt-1 block">
                      {errors.terminationReasonOther}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              {renderDateInput("terminationDateTime", "Select date and time")}
            </div>

            <div>
              {renderTextArea("notes", "Enter notes or description", false)}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
          <span className="text-xs text-slate-400">
            <span className="text-red-600">*</span> Required fields
          </span>
          <div className="flex gap-2.5">
            <button
              onClick={handleTerminateCancel}
              className="px-5 py-2 rounded-full border border-slate-200 bg-white text-sm font-semibold cursor-pointer text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleTerminateSubmit}
              disabled={saving}
              className={`px-7 py-2 rounded-full border-0 bg-gradient-to-r from-blue-900 to-teal-600 text-white text-sm font-bold cursor-pointer hover:shadow-lg transition ${saving ? "opacity-65 cursor-not-allowed" : ""}`}
            >
              {saving ? "Terminating..." : "Terminate Employment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
