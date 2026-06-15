import { Employee } from "../../../types";

interface Props {
  employee: Employee;
}

export default function LeaveList({ employee }: Props) {
  const leaves = [
    { month: "June 2025", entries: [{ day: "06", date: "Fri", type: "Leave", days: 8.00, color: "bg-[#007bff]" }] },
    { month: "May 2025", entries: [{ day: "23", date: "Fri", type: "Leave", days: 1.00, color: "bg-[#007bff]" }] },
    {
      month: "April 2025",
      entries: [
        { day: "04", date: "Fri", type: "Leave", days: 1.00, color: "bg-[#007bff]" },
        { day: "04", date: "Fri", type: "Comp-off", days: 1.00, color: "bg-[#ffca28]" },
      ],
    },
    { month: "March 2025", entries: [{ day: "13", date: "Thu", type: "Leave", days: 1.00, color: "bg-[#007bff]" }] },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#333333]">Leave List</h2>
        <button className="text-[#757575] hover:text-[#333333]">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {leaves.map((leaveMonth, idx) => (
          <div key={idx}>
            <h3 className="text-sm font-semibold text-[#333333] mb-2">{leaveMonth.month}</h3>
            <div className="space-y-2">
              {leaveMonth.entries.map((entry, entryIdx) => (
                <div
                  key={entryIdx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`${entry.color} text-white w-12 h-12 rounded flex flex-col items-center justify-center`}
                    >
                      <div className="text-xs font-semibold">{entry.day}</div>
                      <div className="text-xs">{entry.date}</div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#333333]">{entry.type}</p>
                      <p className="text-xs text-[#757575]">{entry.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#333333]">{entry.days.toFixed(2)}</p>
                    <p className="text-xs text-[#757575]">D(s)</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
