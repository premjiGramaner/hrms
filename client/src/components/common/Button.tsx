import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: Props) {
  const styles = {
    primary: "bg-navy-700 text-white hover:bg-navy-800",
    secondary: "bg-[#eeeaf3] text-navy-700 hover:bg-[#e4dfeb]",
    ghost: "bg-white text-navy-700 border border-navy-700 hover:bg-slate-50",
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    />
  );
}
