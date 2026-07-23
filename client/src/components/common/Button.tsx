import React from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-[#1b2a6b] to-[#16a085] text-white border-none hover:opacity-90 shadow-md",
  secondary:
    "bg-white text-slate-600 border-[1.5px] border-slate-200 hover:border-slate-300 hover:bg-slate-50",
  danger:
    "bg-rose-50 text-rose-600 border-[1.5px] border-rose-200 hover:bg-rose-100 hover:border-rose-300",
  success:
    "bg-green-50 text-green-600 border-[1.5px] border-green-200 hover:bg-green-100 hover:border-green-300",
  ghost: "bg-transparent text-slate-600 border-none hover:bg-slate-100",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-5 py-2.5 text-[13.5px] rounded-xl",
  lg: "px-7 py-3 text-sm rounded-xl",
};

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  fullWidth = false,
  loading = false,
  disabled = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 cursor-pointer outline-none";

  const variantClasses = VARIANT_STYLES[variant];
  const sizeClasses = SIZE_STYLES[size];
  const widthClass = fullWidth ? "w-full" : "";
  const disabledClasses =
    disabled || loading
      ? "opacity-60 cursor-not-allowed pointer-events-none"
      : "";

  const combinedClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${widthClass} ${disabledClasses} ${className}`;

  return (
    <button
      disabled={disabled || loading}
      className={combinedClasses}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span>{typeof children === "string" ? "Loading..." : children}</span>
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon: React.ReactNode;
  rounded?: boolean;
}

export function IconButton({
  variant = "ghost",
  size = "md",
  icon,
  rounded = false,
  disabled = false,
  className = "",
  ...props
}: IconButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center transition-all duration-200 cursor-pointer outline-none flex-shrink-0";

  const variantClasses = VARIANT_STYLES[variant];
  const sizeClasses =
    size === "sm"
      ? "w-7 h-7 p-1"
      : size === "md"
        ? "w-8 h-8 p-1.5"
        : "w-10 h-10 p-2";

  const roundedClass = rounded ? "rounded-full" : "rounded-lg";
  const disabledClasses = disabled
    ? "opacity-60 cursor-not-allowed pointer-events-none"
    : "";

  const combinedClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${roundedClass} ${disabledClasses} ${className}`;

  return (
    <button disabled={disabled} className={combinedClasses} {...props}>
      {icon}
    </button>
  );
}

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: React.ReactNode;
  variant?: "edit" | "delete" | "view";
}

export function ActionButton({
  label,
  icon,
  variant = "edit",
  className = "",
  ...props
}: ActionButtonProps) {
  const variantStyles = {
    edit: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300",
    delete:
      "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 hover:border-rose-300",
    view: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300",
  };

  return (
    <button
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border-[1.5px] transition-all duration-200 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon}
      {label}
    </button>
  );
}
