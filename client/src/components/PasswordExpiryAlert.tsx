import { useNavigate } from "react-router-dom";
import { PAGE_PATHS } from "../config/roles";
import { AlertTriangle, X } from "lucide-react";

interface PasswordExpiryAlertProps {
  message: string;
  onClose: () => void;
}

export default function PasswordExpiryAlert({
  message,
  onClose,
}: PasswordExpiryAlertProps) {
  const navigate = useNavigate();

  const handleChangePassword = () => {
    navigate(`${PAGE_PATHS.createPassword}?expired=true`);
  };

  return (
    <div className="mb-4 rounded-lg border-l-4 border-orange-500 bg-orange-50 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600" />
          <div>
            <h3 className="font-semibold text-orange-900">
              Password Expiry Warning
            </h3>
            <p className="mt-1 text-sm text-orange-800">{message}</p>
            <button
              onClick={handleChangePassword}
              className="mt-2 text-sm font-medium text-orange-900 underline hover:text-orange-700"
            >
              Change password now
            </button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-4 flex-shrink-0 text-orange-600 hover:text-orange-800"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
