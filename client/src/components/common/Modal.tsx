import React from "react";

type Props = {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
};

export default function Modal({ title, children, footer, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-[2px] bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-950 to-teal-500 px-8 py-6 text-lg font-bold text-white">
          {title}
        </div>
        <div className="max-h-[58vh] overflow-y-auto px-8 py-7">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-3 px-8 pb-6">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
