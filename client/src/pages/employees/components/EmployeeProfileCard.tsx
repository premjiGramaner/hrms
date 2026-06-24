import { useRef, useState } from "react";
import { Employee } from "../../../types";
import { updateProfileImage } from "../../../api/employee.api";
import { getApiErrorMessage } from "../../../utils/errors";
import { useAppDispatch } from "../../../app/hooks";
import { updateUserAvatar } from "../../../store/authSlice";

interface Props {
  employee: Employee;
  onEmployeeUpdate?: (updatedEmployee: Employee) => void;
}

export default function EmployeeProfileCard({
  employee,
  onEmployeeUpdate,
}: Props) {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now()); // For cache busting

  const fullName =
    employee.name ||
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim();

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      setUploadMessage("Please select a JPG, JPEG, or PNG image.");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadMessage("File size must be less than 5 MB.");
      return;
    }

    try {
      setUploading(true);
      setUploadMessage("");

      const formData = new FormData();
      formData.append("avatar", file);

      // Use dedicated profile image update endpoint (no email validation)
      const { data: updatedEmployee } = await updateProfileImage(
        employee.id,
        formData,
      );

      // Update timestamp for cache busting
      const newTimestamp = Date.now();
      setAvatarTimestamp(newTimestamp);

      // Update Redux store so sidebar avatar updates immediately
      if (updatedEmployee.avatar) {
        dispatch(updateUserAvatar(updatedEmployee.avatar));
      }

      // Update parent component with fresh employee data
      if (onEmployeeUpdate) {
        onEmployeeUpdate(updatedEmployee);
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

  // Generate avatar URL with cache busting
  const avatarUrl = employee.avatar
    ? `/uploads/${employee.avatar}?t=${avatarTimestamp}`
    : null;

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
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div
            className="relative w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-4 border-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow group"
            onClick={handleImageClick}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-gray-500">
                {(fullName[0] || "E").toUpperCase()}
              </span>
            )}

            {/* Upload overlay */}
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
            <h4 className="text-xs font-semibold text-[#757575] uppercase mb-3">
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
            <h4 className="text-xs font-semibold text-[#757575] uppercase mb-3">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
