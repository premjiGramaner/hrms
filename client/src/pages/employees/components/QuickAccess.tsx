export default function QuickAccess() {
  const items = [
    {
      label: "Appraisals",
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
        </svg>
      ),
      color: "bg-[#ffa726]",
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#333333]">Quick Access</h2>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item.label}
            className={`w-full ${item.color} text-white p-4 rounded-lg flex items-center gap-4 hover:shadow-md transition`}
          >
            <div className="flex-shrink-0">{item.icon}</div>
            <div className="text-left font-medium text-sm">{item.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
