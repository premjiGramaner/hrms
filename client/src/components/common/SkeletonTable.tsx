export default function SkeletonTable() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-11 animate-pulse rounded bg-slate-100" />
      ))}
    </div>
  );
}
