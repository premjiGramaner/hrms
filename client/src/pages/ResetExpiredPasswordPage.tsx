import React, { FormEvent, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { resetExpiredPassword } from "../api/auth.api";
import { getApiErrorMessage } from "../utils/errors";
import cannyforeLogo from "../assets/logo.png";
import rightPanelImage from "../assets/login_intelligent.png";
import orangeHrmLogo from "../assets/orangehrm-logo.png";

export default function ResetExpiredPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username;

  // Redirect to login if no username is provided
  React.useEffect(() => {
    if (!username) {
      navigate("/login");
    }
  }, [username, navigate]);

  const validatePassword = (password: string): string | null => {
    if (!password) {
      return "Password is required";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least 1 uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least 1 lowercase letter";
    }
    if (!/\d/.test(password)) {
      return "Password must contain at least 1 number";
    }
    if (!/[@$!%*?&#]/.test(password)) {
      return "Password must contain at least 1 special character (@$!%*?&#)";
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setValidationErrors({});

    // Validate new password
    const newPasswordError = validatePassword(newPassword);
    if (newPasswordError) {
      setValidationErrors({ newPassword: newPasswordError });
      return;
    }

    // Validate confirm password
    if (!confirmPassword) {
      setValidationErrors({ confirmPassword: "Please confirm your password" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setLoading(true);
    try {
      await resetExpiredPassword(username, newPassword, confirmPassword);
      navigate("/login", {
        state: {
          message:
            "Password reset successfully. Please login with your new password.",
        },
      });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to reset password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white font-sans text-slate-800 lg:grid lg:grid-cols-2">
      <section className="flex min-h-screen flex-col items-center px-5 py-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex w-full justify-center">
          <div className="flex h-[108px] w-full max-w-[650px] items-center justify-center rounded-2xl border border-slate-100 bg-white px-10 shadow-xl shadow-slate-200/80">
            <img
              src={cannyforeLogo}
              alt="Cannyfore"
              className="h-14 max-w-full object-contain sm:h-16 md:h-[4.25rem]"
            />
          </div>
        </div>

        <div className="flex w-full flex-1 items-center justify-center py-8 lg:py-10">
          <div className="w-full max-w-[420px] rounded-3xl border border-slate-200 bg-white px-9 py-8 shadow-2xl shadow-slate-200/80">
            <div className="mb-5 flex justify-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-slate-50">
                <img
                  src={orangeHrmLogo}
                  alt="OrangeHRM"
                  className="h-20 w-20 object-contain"
                />
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2 text-slate-800">
              <LockIcon />
              <h1 className="text-2xl font-bold">Reset Password</h1>
            </div>

            <div className="mb-4 rounded-xl border-l-4 border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
              Your password has expired. Please create a new password.
            </div>

            {error && (
              <div className="mb-4 rounded-xl border-l-4 border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-900">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <LockIcon small />
                  </span>
                  <input
                    type={showNewPass ? "text" : "password"}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      setValidationErrors((prev) => ({
                        ...prev,
                        newPassword: undefined,
                      }));
                    }}
                    autoFocus
                    autoComplete="new-password"
                    className={`h-11 w-full rounded-xl border ${
                      validationErrors.newPassword
                        ? "border-red-300"
                        : "border-slate-200"
                    } bg-white pl-11 pr-14 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-50`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass((current) => !current)}
                    className="absolute right-2 top-1/2 flex h-9 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                    aria-label={showNewPass ? "Hide password" : "Show password"}
                  >
                    <EyeIcon hidden={showNewPass} />
                  </button>
                </div>
                {validationErrors.newPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    {validationErrors.newPassword}
                  </p>
                )}
              </div>

              <div className="mb-5">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <LockIcon small />
                  </span>
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setValidationErrors((prev) => ({
                        ...prev,
                        confirmPassword: undefined,
                      }));
                    }}
                    autoComplete="new-password"
                    className={`h-11 w-full rounded-xl border ${
                      validationErrors.confirmPassword
                        ? "border-red-300"
                        : "border-slate-200"
                    } bg-white pl-11 pr-14 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-50`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass((current) => !current)}
                    className="absolute right-2 top-1/2 flex h-9 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                    aria-label={
                      showConfirmPass ? "Hide password" : "Show password"
                    }
                  >
                    <EyeIcon hidden={showConfirmPass} />
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-700">
                  Password Requirements:
                </p>
                <ul className="space-y-1 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>Minimum 8 characters</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>At least 1 uppercase letter</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>At least 1 lowercase letter</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>At least 1 number</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>At least 1 special character (@$!%*?&#)</span>
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-3 rounded-full border-none bg-gradient-to-r from-blue-950 to-teal-500 px-5 text-base font-bold text-white shadow-lg shadow-teal-600/20 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span>{loading ? "Resetting..." : "Reset Password"}</span>
                <CheckIcon />
              </button>
            </form>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-sm font-medium text-blue-950 hover:text-teal-600"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>

        <footer className="pb-2 text-center">
          <p className="text-xs text-slate-400">OrangeHRM 8.1.0.1</p>
          <p className="mt-1 text-xs text-slate-400">
            CannyFore © 2005 - 2026 OrangeHRM, Inc. All rights reserved.
          </p>
          <div className="mt-2 flex justify-center gap-2">
            {["in", "f", "x", "yt"].map((item) => (
              <span
                key={item}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white"
              >
                {item}
              </span>
            ))}
          </div>
        </footer>
      </section>

      <section className="hidden min-h-screen overflow-hidden bg-slate-950 lg:block">
        <img
          src={rightPanelImage}
          alt="Cannyfore intelligent decision making"
          className="h-full min-h-screen w-full object-cover"
        />
      </section>
    </main>
  );
}

function LockIcon({ small = false }: { small?: boolean }) {
  const size = small ? 18 : 22;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
