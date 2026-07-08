import { useRef, useState, useEffect } from "react";
import { Employee } from "../../../types";
import {
  updateProfileImage,
  getSupervisorsByIds,
} from "../../../api/employee.api";
import { getApiErrorMessage } from "../../../utils/errors";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { updateUserAvatar, updateUserName } from "../../../store/authSlice";

interface EmployeeProfileCardProps {
  employee: Employee;
  onEmployeeUpdate?: (updatedEmployee: Employee) => void;
}

interface Supervisor {
  name: string;
  id: number;
}

export default function EmployeeProfileCard({
  employee,
  onEmployeeUpdate,
}: EmployeeProfileCardProps) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [supervisorMap, setSupervisorMap] = useState<
    Map<string | number, string>
  >(new Map());

  useEffect(() => {
    const fetchSupervisors = async () => {
      try {
        let supervisorsData: unknown = employee.supervisors;
        if (typeof supervisorsData === "string") {
          try {
            supervisorsData = JSON.parse(supervisorsData);
          } catch {
            supervisorsData = [];
          }
        }

        if (Array.isArray(supervisorsData) && supervisorsData.length > 0) {
          const supervisorIds = supervisorsData.filter(
            (id): id is string | number =>
              typeof id === "string" || typeof id === "number",
          );
          if (supervisorIds.length > 0) {
            const { data: supervisors } =
              await getSupervisorsByIds(supervisorIds);
            const map = new Map<string | number, string>();
            supervisors.forEach((supervisor: Supervisor) => {
              map.set(supervisor.id, supervisor.name);
              map.set(supervisor.id.toString(), supervisor.name);
            });
            setSupervisorMap(map);
          }
        }
      } catch (err) {
        console.error("Failed to fetch supervisor names:", err);
      }
    };

    fetchSupervisors();
  }, [employee.supervisors]);

  const fullName =
    employee.name ||
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim();

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

  const validateImageFile = (file: File): string | null => {
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      return "Please select a JPG, JPEG, or PNG image.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE_MB} MB.`;
    }

    return null;
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setUploadMessage(validationError);
      return;
    }

    try {
      setUploading(true);
      setUploadMessage("");

      const formData = new FormData();
      formData.append("avatar", file);

      const { data: updatedEmployee } = await updateProfileImage(
        employee.id,
        formData,
      );

      // Check if the updated employee IS the currently logged-in user
      // This handles both scenarios:
      // 1. Employee updates their own profile → Update Redux
      // 2. Admin updates an employee profile AND that employee is the logged-in user → Update Redux
      // This ensures the sidebar always shows the latest avatar for the logged-in user
      const isCurrentLoggedInUser =
        currentUser && Number(currentUser.id) === Number(updatedEmployee.id);

      if (isCurrentLoggedInUser && updatedEmployee.avatar) {
        // Update Redux store to update sidebar immediately
        dispatch(updateUserAvatar(updatedEmployee.avatar));

        dispatch(
          updateUserName({
            first_name: updatedEmployee.first_name,
            last_name: updatedEmployee.last_name,
          }),
        );
      } else {
        console.log(
          "ℹ️  Not updating Redux - Current user:",
          currentUser?.id,
          "Updated employee:",
          updatedEmployee.id,
        );
      }

      // Update parent component with merged employee data immediately
      // This updates the About card profile image
      if (onEmployeeUpdate) {
        onEmployeeUpdate({
          ...employee,
          ...updatedEmployee,
        });
      }

      setUploadMessage("Profile picture updated successfully!");
      setTimeout(() => setUploadMessage(""), 3000);
    } catch (error) {
      setUploadMessage(
        getApiErrorMessage(error, "Failed to update profile picture."),
      );
    } finally {
      setUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Avatar is now a base64 data URL from database
  const avatarUrl = employee.avatar || null;

  const getSupervisorNames = () => {
    let supervisorsData: unknown = employee.supervisors;

    if (typeof supervisorsData === "string") {
      try {
        supervisorsData = JSON.parse(supervisorsData);
      } catch {
        supervisorsData = [];
      }
    }

    if (Array.isArray(supervisorsData) && supervisorsData.length > 0) {
      return supervisorsData
        .map((supervisor: string | number | Supervisor) => {
          if (typeof supervisor === "number") {
            return (
              supervisorMap.get(supervisor) ??
              supervisorMap.get(supervisor.toString()) ??
              supervisor.toString()
            );
          }
          if (typeof supervisor === "string") {
            return supervisorMap.get(supervisor) || supervisor;
          }
          return supervisor.name || "";
        })
        .filter((name) => name)
        .join(", ");
    }

    return "N/A";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-base font-semibold text-[#333333] mb-4">About</h2>

      {uploadMessage && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            uploadMessage.includes("successfully") ||
            uploadMessage.includes("Success")
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-red-100 text-red-700 border border-red-200"
          }`}
        >
          {uploadMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-6">
        <div className="flex-shrink-0">
          <div
            className="relative w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-950 to-teal-500 flex items-center justify-center border-4 border-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow group"
            onClick={handleImageClick}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-white">
                {(fullName[0] || "E").toUpperCase()}
              </span>
            )}

            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="text-center mt-4">
            <h3 className="font-bold text-lg text-[#333333]">{fullName}</h3>
            <p className="text-sm text-[#757575]">
              {employee.job_title || "Employee"}
            </p>
            <p className="text-xs text-[#00897b] mt-1">
              📍 {employee.location || "Not specified"}
            </p>
            <p
              className="text-xs text-gray-500 mt-2 cursor-pointer"
              onClick={handleImageClick}
            >
              Click to change photo
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-6 border-l pl-6">
          {/* Basic Info */}
          <div>
            <h4 className="text-xs font-semibold text-[#757575] mb-3">
              Basic Info
            </h4>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-[#757575]">Employee Id</p>
                <p className="text-sm text-[#00897b] font-medium">
                  {employee.employee_id || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#757575]">Full Name</p>
                <p className="text-sm text-[#333333] font-medium">{fullName}</p>
              </div>
              <div>
                <p className="text-xs text-[#757575]">Designation</p>
                <p className="text-sm text-[#333333]">
                  {employee.job_title || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#757575]">Location</p>
                <p className="text-sm text-[#333333]">
                  {employee.location || "N/A"}
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
            <h4 className="text-xs font-semibold text-[#757575] mb-3">
              Employment
            </h4>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-[#757575]">Joined Date</p>
                <p className="text-sm text-[#333333]">
                  {employee.joined_date
                    ? new Date(employee.joined_date).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#757575]">Sub Unit</p>
                <p className="text-sm text-[#333333]">
                  {employee.sub_unit || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#757575]">Job Category</p>
                <p className="text-sm text-[#333333]">
                  {employee.job_category || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#757575]">Status</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      employee.is_active ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></span>
                  <span className="text-sm text-[#333333]">
                    {employee.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-[#757575]">Supervisor</p>
                <p className="text-sm text-[#333333]">{getSupervisorNames()}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-[#757575] mb-3">
              Contact
            </h4>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-[#757575]">Work Phone</p>
                <p className="text-sm text-[#00897b]">
                  {employee.work_tel || employee.mobile || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#757575]">Work Email</p>
                <p className="text-sm text-[#00897b] break-all">
                  {employee.work_email || employee.email || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#757575]">Employment Status</p>
                <p className="text-sm text-[#333333]">
                  {employee.employment_status || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
