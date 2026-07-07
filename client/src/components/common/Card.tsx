import React from "react";

export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[8px] bg-white shadow-sm ${className}`}>
      {children}
    </section>
  );
}
