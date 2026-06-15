import { Employee } from "../../../types";

interface Props {
  employee: Employee;
}

export default function LeaveBalance({ employee }: Props) {
  const leaveTypes = [
    { name: "Carry Forward Leave", balance: 3.0, total: 3.0, color: "bg-[#007bff]" },
    { name: "Privilege Leave", balance: 2.5, total: 2.5, color: "bg-[#007bff]" },
    { name: "Sick Leave", balance: 1.0, total: 1.0, color: "bg-[#007bff]" },
    { name: "Comp off", balance: 0.0, total: 0.0, color: "bg-gray-200" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#333333]">Leave Balance</h2>
        <button className="text-[#757575] hover:text-[#333333]">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>
      <div className="space-y-4">
        {leaveTypes.map((leave) => (
          <div key={leave.name} className="flex items-center gap-4">
            <div className="w-12 text-right">
              <span className="text-2xl font-bold text-[#007bff]">
                {leave.balance.toFixed(1)}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#00897b] mb-1">
                {leave.name}
              </p>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${leave.color} rounded-full transition-all`}
                  style={{
                    width: `${leave.total > 0 ? (leave.balance / leave.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-[#757575] mt-1">
                Only {leave.balance} of {leave.total} remaining
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
