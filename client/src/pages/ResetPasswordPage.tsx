import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth.api";
import { getApiErrorMessage } from "../utils/errors";
import { PAGE_PATHS } from "../config/roles";
import { IconEye, IconEyeOff, IconLock } from "../components/Icons";
import cannyforeLogo from "../assets/logo.png";
import rightPanelImage from "../assets/login_intelligent.png";
import orangeHrmLogo from "../assets/orangehrm-logo.png";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid or missing reset token. Please request a new link.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password, "");
      setDone(true);
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err, "Something went wrong. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white font-sans text-slate-800 lg:grid lg:grid-cols-2">
      <section className="flex min-h-screen flex-col items-center px-5 py-4 sm:px-8 lg:px-12 xl:px-16">
        {/* Logo header */}
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
          <div className="w-full max-w-[386px] rounded-3xl border border-slate-200 bg-white px-9 py-8 shadow-2xl shadow-slate-200/80">
            {/* Logo circle */}
            <div className="mb-5 flex justify-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-slate-50">
                <img
                  src={orangeHrmLogo}
                  alt="OrangeHRM"
                  className="h-20 w-20 object-contain"
                />
              </div>
            </div>

            <div className="mb-2 flex items-center gap-2 text-slate-800">
              <IconLock size={22} />
              <h1 className="text-2xl font-bold">Set New Password</h1>
            </div>
            <p className="mb-5 text-sm text-slate-500">
              Choose a strong password. It must be at least 8 characters.
            </p>

            {done ? (
              <div className="space-y-4">
                <div className="rounded-xl border-l-4 border-teal-400 bg-teal-50 px-3.5 py-3 text-sm text-teal-900">
                  Your password has been updated successfully. You can now log
                  in with your new password.
                </div>
                <button
                  type="button"
                  onClick={() => navigate(PAGE_PATHS.login)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-950 to-teal-500 text-base font-bold text-white shadow-lg transition hover:shadow-xl"
                >
                  Go to Login
                </button>
              </div>
            ) : (
              <>
                {!token && (
                  <div className="mb-4 rounded-xl border-l-4 border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-900">
                    Invalid reset link. Please request a new one.
                  </div>
                )}

                {error && (
                  <div className="mb-4 rounded-xl border-l-4 border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-900">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  {/* New password */}
                  <div className="relative mb-3">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                      <IconLock size={18} />
                    </span>
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="New password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      autoComplete="new-password"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-14 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-2 top-1/2 flex h-9 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                      aria-label={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? (
                        <IconEyeOff size={17} />
                      ) : (
                        <IconEye size={17} />
                      )}
                    </button>
                  </div>

                  {/* Confirm password */}
                  <div className="relative mb-5">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                      <IconLock size={18} />
                    </span>
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-14 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-2 top-1/2 flex h-9 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirm ? (
                        <IconEyeOff size={17} />
                      ) : (
                        <IconEye size={17} />
                      )}
                    </button>
                  </div>

                  {/* Password match indicator */}
                  {confirmPassword.length > 0 && (
                    <p
                      className={`-mt-3 mb-4 text-xs ${
                        password === confirmPassword
                          ? "text-teal-600"
                          : "text-red-500"
                      }`}
                    >
                      {password === confirmPassword
                        ? "✓ Passwords match"
                        : "✗ Passwords do not match"}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !token}
                    className="flex h-11 w-full items-center justify-center gap-3 rounded-full border-none bg-gradient-to-r from-blue-950 to-teal-500 px-5 text-base font-bold text-white shadow-lg shadow-teal-600/20 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "Updating..." : "Set Password"}
                  </button>
                </form>

                <p className="mt-4 text-sm text-slate-500">
                  <button
                    type="button"
                    onClick={() => navigate(PAGE_PATHS.login)}
                    className="font-bold text-blue-950 hover:text-teal-600"
                  >
                    Back to Login
                  </button>
                </p>
              </>
            )}
          </div>
        </div>

        <footer className="pb-2 text-center">
          <p className="mt-1 text-xs text-slate-400">
            Cannyfore © {new Date().getFullYear()} All rights reserved.
          </p>
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
