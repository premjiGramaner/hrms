type Props = {
  value: number;
  size?: number;
};

export default function ProgressCircle({ value, size = 42 }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="grid place-items-center rounded-full text-[11px] font-semibold text-slate-500"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(#12c7a5 ${clamped * 3.6}deg, #f1eef5 0deg)`,
      }}
    >
      <span className="grid h-[78%] w-[78%] place-items-center rounded-full bg-white">
        {clamped}%
      </span>
    </div>
  );
}
