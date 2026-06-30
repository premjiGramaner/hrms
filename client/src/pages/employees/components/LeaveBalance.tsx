import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLeaveBalance } from "../../../api/leave.api";
import { Employee, LeaveBalance as LeaveBalanceType } from "../../../types";
import LoaderCard from "../../../components/LoaderCard";
interface LeaveBalanceProps {
  employee: Employee;
}

export default function LeaveBalance({ employee }: LeaveBalanceProps) {
  const navigate = useNavigate();
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalanceType[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const financialYear =
    new Date().getMonth() >= 3 ? currentYear + 1 : currentYear;

  const loadLeaveBalance = async () => {
    if (!employee?.id) return;

    try {
      setLoading(true);
      const balances = await getLeaveBalance(employee.id, financialYear);
      setLeaveBalances(balances);
    } catch (error) {
      console.error("Failed to load leave balance:", error);
      setLeaveBalances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaveBalance();
  }, [employee?.id]);

  const handleWidgetClick = () => {
    navigate("/leave/apply");
  };

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      loadLeaveBalance();
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, [employee?.id]);

  const leaveBalanceData = leaveBalances.map((leave) => {
    const totalEntitlement =
      Number(leave.total_days ?? 0) + Number(leave.carried_days ?? 0);

    const remainingBalance = Number(leave.net_balance ?? 0);

    const progressPercentage =
      totalEntitlement > 0 ? (remainingBalance / totalEntitlement) * 100 : 0;

    return {
      ...leave,
      totalEntitlement,
      remainingBalance,
      progressWidth: Math.max(0, Math.min(100, progressPercentage)),
      progressColor:
        progressPercentage > 50
          ? "bg-[#007bff]"
          : progressPercentage > 25
            ? "bg-yellow-500"
            : "bg-red-500",
    };
  });

  return (
    <div
      className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleWidgetClick}
    >
      <h2 className="text-base font-semibold text-[#333333] mb-4">
        Leave Balance
      </h2>
      <div className="space-y-4">
        {leaveBalanceData.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <p className="text-sm">No leave entitlements found</p>
            <p className="text-xs mt-1">
              Contact HR to set up your leave balance
            </p>
          </div>
        ) : (
          leaveBalanceData.map((leave) => (
            <div key={leave.leave_type_id} className="flex items-center gap-4">
              <div className="w-12 text-right">
                <span className="text-2xl font-bold text-[#007bff]">
                  {leave.remainingBalance.toFixed(1)}
                </span>
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium text-[#00897b] mb-1">
                  {leave.leave_type_name}
                </p>

                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${leave.progressColor}`}
                    style={{ width: `${leave.progressWidth}%` }}
                  />
                </div>

                <p className="text-xs text-[#757575] mt-1">
                  {leave.remainingBalance.toFixed(1)} of{" "}
                  {leave.totalEntitlement.toFixed(1)} remaining
                </p>
              </div>
            </div>
          ))
        )}

        {leaveBalanceData.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-center text-[#007bff] font-medium">
              Click to apply for leave →
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
