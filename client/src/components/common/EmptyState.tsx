export default function EmptyState({
  message = "Sorry, No Data Found!",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-[8px] bg-white text-sm font-semibold text-slate-400">
      {message}
    </div>
  );
}
