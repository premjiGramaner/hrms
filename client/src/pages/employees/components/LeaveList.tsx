import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLeaves } from "../../../api/leave.api";
import { Employee, LeaveRequest } from "../../../types";

interface Props {
  employee: Employee;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return {
    day: date.getDate().toString().padStart(2, '0'),
    dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
    month: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  };
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'approved':
      return 'bg-green-500';
    case 'pending approval':
      return 'bg-yellow-500';
    case 'rejected':
      return 'bg-red-500';
    case 'cancelled':
      return 'bg-gray-500';
    default:
      return 'bg-blue-500';
  }
}

export default function LeaveList({ employee }: Props) {
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLeaveList = async () => {
    if (!employee?.id) return;
    
    try {
      setLoading(true);
      const response = await getLeaves({
        page: 1,
        limit: 10
      });
      setLeaves(response.data || []);
    } catch (error) {
      console.error('Failed to load leave list:', error);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaveList();
  }, [employee?.id]);

  const handleWidgetClick = () => {
    navigate('/leave/view_leave_list');
  };

  // Group leaves by month
  const groupedLeaves = leaves.reduce((groups: Record<string, LeaveRequest[]>, leave) => {
    const date = formatDate(leave.start_date);
    const monthKey = date.month;
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(leave);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-base font-semibold text-[#333333] mb-4">Leave List</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
                <div className="w-12 h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleWidgetClick}
    >
      <h2 className="text-base font-semibold text-[#333333] mb-4">Leave List</h2>

      <div className="space-y-4">
        {Object.keys(groupedLeaves).length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm">No leave requests found</p>
            <p className="text-xs mt-1">Your leave history will appear here</p>
          </div>
        ) : (
          Object.entries(groupedLeaves)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime()) // Sort by newest month first
            .slice(0, 3) // Show only last 3 months
            .map(([month, monthLeaves]) => (
              <div key={month}>
                <h3 className="text-sm font-semibold text-[#333333] mb-2">{month}</h3>
                <div className="space-y-2">
                  {monthLeaves
                    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()) // Sort by newest first
                    .map((leave) => {
                      const startDate = formatDate(leave.start_date);
                      const statusColor = getStatusColor(leave.status);
                      
                      return (
                        <div
                          key={leave.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`${statusColor} text-white w-12 h-12 rounded flex flex-col items-center justify-center`}>
                              <div className="text-xs font-semibold">{startDate.day}</div>
                              <div className="text-xs">{startDate.dayName}</div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#333333]">{leave.leave_type}</p>
                              <p className="text-xs text-[#757575]">
                                {leave.start_date === leave.end_date 
                                  ? leave.start_date 
                                  : `${leave.start_date} - ${leave.end_date}`
                                }
                              </p>
                              <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                                leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                leave.status === 'Pending Approval' ? 'bg-yellow-100 text-yellow-800' :
                                leave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {leave.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[#333333]">
                              {Number(leave.requested_days).toFixed(1)}
                            </p>
                            <p className="text-xs text-[#757575]">Day(s)</p>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            ))
        )}
        {leaves.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-center text-[#007bff] font-medium">
              Click to view all leaves →
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
