import React from "react";

export const PERFORMANCE_REVIEW_LABELS = {
  employeeReview: "Employee Review",
  finalReview: "Final Review",
  self: "Self",
  selfReview: "Self Review",
} as const;

export function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-slate-600">{children}</h2>;
}

export function IconButton({
  children,
  title,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f3f0f7] text-slate-500 transition hover:bg-[#e8e2ef] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#f3f0f7]"
    >
      {children}
    </button>
  );
}

export function FieldShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-500">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

export function SoftInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none focus:border-navy-700 ${props.className ?? ""}`}
    />
  );
}

export function Stepper({ active = 1 }: { active?: number }) {
  return (
    <div className="flex flex-1 items-center justify-center px-8">
      {[1, 2, 3, 4, 5].map((step) => (
        <React.Fragment key={step}>
          <span
            className={`grid h-11 w-11 place-items-center rounded-full text-sm font-bold ${step <= active ? "bg-[#47b8ad] text-white shadow" : "bg-[#f1eef3] text-white"}`}
          >
            {step}
          </span>
          {step < 5 ? <span className="h-1 w-28 bg-[#eeeaf2]" /> : null}
        </React.Fragment>
      ))}
    </div>
  );
}
