import { useRef, useState, useEffect } from "react";
import { Employee } from "../../../types";
import {
  updateProfileImage,
  getSupervisorsByIds,
} from "../../../api/employee.api";
import { getApiErrorMessage } from "../../../utils/errors";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { updateUserAvatar, updateUserName } from "../../../store/authSlice";
import { getAvatarSrc } from "../../../utils/avatar";
import {
  IconUpload,
  IconEye,
  IconX,
  IconMapPin,
} from "../../../components/Icons";
import {
  AVATAR_PLACEHOLDER_SERVICE,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_IMAGE_EXTENSIONS,
} from "../../../config/constants";
import { IconButton } from "../../../components/common/Button";

interface EmployeeProfileCardProps {
  employee: Employee;
  onEmployeeUpdate?: (updatedEmployee: Employee) => void;
}

interface Supervisor {
  name: string;
  id: number;
}

const LABEL_CLASSES = "text-xs text-slate-600";
const VALUE_CLASSES = "text-sm text-slate-800";

interface InfoFieldProps {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}

const InfoField = ({ label, value, valueClassName }: InfoFieldProps) => (
  <div>
    <p className={LABEL_CLASSES}>{label}</p>
    <p className={valueClassName || VALUE_CLASSES}>{value}</p>
  </div>
);

export default function EmployeeProfileCard({
  employee,
  onEmployeeUpdate,
}: EmployeeProfileCardProps) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [showImageModal, setShowImageModal] = useState(false);
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

  const handleViewImage = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (avatarUrl && !avatarUrl.includes(AVATAR_PLACEHOLDER_SERVICE)) {
      setShowImageModal(true);
    }
  };

  const validateImageFile = (file: File): string | null => {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return `Please select a ${SUPPORTED_IMAGE_EXTENSIONS.join(", ").toUpperCase()} image.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
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

      const isCurrentLoggedInUser =
        currentUser && Number(currentUser.id) === Number(updatedEmployee.id);

      if (isCurrentLoggedInUser && updatedEmployee.avatar) {
        dispatch(updateUserAvatar(updatedEmployee.avatar));

        dispatch(
          updateUserName({
            first_name: updatedEmployee.first_name,
            last_name: updatedEmployee.last_name,
          }),
        );
      } else {
        console.log(
          "ℹ Not updating Redux - Current user:",
          currentUser?.id,
          "Updated employee:",
          updatedEmployee.id,
        );
      }

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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const avatarUrl = getAvatarSrc(employee.avatar);

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
      <h2 className="text-base font-semibold text-slate-800 mb-4">About</h2>

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
          <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-950 to-slate-500 flex items-center justify-center border-4 border-white shadow-lg group">
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

            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {uploading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <IconButton
                    onClick={handleImageClick}
                    icon={<IconUpload size={20} color="#fff" />}
                    variant="ghost"
                    size="md"
                    rounded
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 hover:scale-110"
                    title="Upload new photo"
                  />
                  {avatarUrl &&
                    !avatarUrl.includes(AVATAR_PLACEHOLDER_SERVICE) && (
                      <IconButton
                        onClick={handleViewImage}
                        icon={<IconEye size={20} color="#fff" />}
                        variant="ghost"
                        size="md"
                        rounded
                        className="bg-white/20 backdrop-blur-sm hover:bg-white/30 hover:scale-110"
                        title="View full image"
                      />
                    )}
                </>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_IMAGE_EXTENSIONS.join(",")}
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="text-center mt-4">
            <h3 className="font-bold text-lg text-slate-800">{fullName}</h3>
            <p className={VALUE_CLASSES}>{employee.job_title || "Employee"}</p>
            <p
              className={`${LABEL_CLASSES} mt-1 flex items-center justify-center gap-1`}
            >
              <IconMapPin size={12} color="#64748b" />
              {employee.location || "Not specified"}
            </p>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-6 border-l pl-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-600 mb-3">
              Basic info
            </h4>
            <div className="info-section">
              <InfoField
                label="Employee Id"
                value={employee.employee_id || "N/A"}
                valueClassName="text-sm text-slate-600 font-medium"
              />
              <InfoField
                label="Full Name"
                value={fullName}
                valueClassName={`${VALUE_CLASSES} font-medium`}
              />
              <InfoField
                label="Designation"
                value={employee.job_title || "N/A"}
              />
              <InfoField label="Location" value={employee.location || "N/A"} />
              <InfoField
                label="Birthday"
                value={
                  employee.dob
                    ? new Date(employee.dob).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "N/A"
                }
              />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-600 mb-3">
              Employment
            </h4>
            <div className="info-section">
              <InfoField
                label="Joined Date"
                value={
                  employee.joined_date
                    ? new Date(employee.joined_date).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )
                    : "N/A"
                }
              />
              <InfoField label="Sub Unit" value={employee.sub_unit || "N/A"} />
              <InfoField
                label="Job Category"
                value={employee.job_category || "N/A"}
              />
              <InfoField label="Supervisor" value={getSupervisorNames()} />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-600 mb-3">
              Contact
            </h4>
            <div className="info-section">
              <InfoField
                label="Work Phone"
                value={employee.work_tel || employee.mobile || "N/A"}
                valueClassName="text-sm text-slate-600"
              />
              <InfoField
                label="Work Email"
                value={employee.work_email || employee.email || "N/A"}
                valueClassName="text-sm text-slate-600 break-all"
              />
              <InfoField
                label="Employment Status"
                value={employee.employment_status || "N/A"}
              />
            </div>
          </div>
        </div>
      </div>

      {showImageModal && avatarUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <IconButton
              onClick={() => setShowImageModal(false)}
              icon={<IconX size={20} color="#fff" />}
              variant="ghost"
              size="md"
              rounded
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white"
              aria-label="Close image viewer"
            />
            <img
              src={avatarUrl}
              alt={fullName}
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
