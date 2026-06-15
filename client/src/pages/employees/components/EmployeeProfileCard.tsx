import { Employee } from "../../../types";

interface Props {
  employee: Employee;
}

export default function EmployeeProfileCard({ employee }: Props) {
  const fullName =
    employee.name ||
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#333333]">About</h2>
        <button className="text-[#757575] hover:text-[#333333]">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-4 border-white shadow-lg">
            {employee.avatar ? (
              <img
                src={`/${employee.avatar}`}
                alt={fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-gray-500">
                {(fullName[0] || "E").toUpperCase()}
              </span>
            )}
          </div>
          <div className="text-center mt-4">
            <h3 className="font-bold text-lg text-[#333333]">{fullName}</h3>
            <p className="text-sm text-[#757575]">{employee.job_title || "Employee"}</p>
            <p className="text-xs text-[#00897b] mt-1">📍 {employee.location || "India"}</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-6 border-l pl-6">
          {/* Basic Info */}
          <div>
            <h4 className="text-xs font-semibold text-[#757575] uppercase mb-3">
              Basic Info
            </h4>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-[#757575]">Full Name</p>
                <p className="text-sm text-[#333333] font-medium">{fullName}</p>
              </div>
              <div>
                <p className="text-xs text-[#757575]">Employee Id</p>
                <p className="text-sm text-[#00897b] font-medium">
                  {employee.employee_id || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#757575]">Birthday</p>
                <p className="text-sm text-[#333333]">
                  {employee.dob
                    ? new Date(employee.dob).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Job */}
          <div>
            <h4 className="text-xs font-semibold text-[#757575] uppercase mb-3">
              Job
            </h4>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-[#757575]">Joined Date</p>
                <p className="text-sm text-[#333333]">
                  {employee.joined_date
                    ? new Date(employee.joined_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#757575]">Sub Unit</p>
                <p className="text-sm text-[#333333]">
                  {employee.sub_unit || "IT Services"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#757575]">Status</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-sm text-[#333333]">
                    {employee.status || "Active"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-semibold text-[#757575] uppercase mb-3">
              Contact
            </h4>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-[#757575]">Work Phone</p>
                <p className="text-sm text-[#00897b]">{employee.mobile || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-[#757575]">Work Email</p>
                <p className="text-sm text-[#00897b] break-all">
                  {employee.email || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
