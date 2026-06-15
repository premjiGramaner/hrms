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
    {
      label: "Goals",
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
        </svg>
      ),
      color: "bg-[#26a69a]",
    },
    {
      label: "Disciplinary Cases",
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
        </svg>
      ),
      color: "bg-[#ffa726]",
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#333333]">Quick Access</h2>
        <button className="text-[#757575] hover:text-[#333333]">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
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
