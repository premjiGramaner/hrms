import { FormEvent, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getApiErrorMessage } from "../utils/errors";
import { useAppDispatch } from "../app/hooks";
import { logout } from "../store/authSlice";
import { setPassword as setPasswordApi } from "../api/auth.api";
import { PAGE_PATHS } from "../config/roles";
import { IconEye, IconEyeOff, IconLock } from "../components/Icons";
import cannyforeLogo from "../assets/logo.png";
import rightPanelImage from "../assets/login_intelligent.png";
import orangeHrmLogo from "../assets/orangehrm-logo.png";

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const token: string = (location.state as { token?: string })?.token ?? "";

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
      await setPasswordApi(token, password, confirmPassword);
      setDone(true);
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err, "Something went wrong. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    dispatch(logout());
    navigate(PAGE_PATHS.login);
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="text-red-600">Session expired. Please log in again.</p>
          <button
            onClick={() => navigate(PAGE_PATHS.login)}
            className="mt-4 rounded-full bg-blue-950 px-6 py-2 text-sm font-bold text-white"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

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
          <div className="w-full max-w-[386px] rounded-3xl border border-slate-200 bg-white px-9 py-8 shadow-2xl shadow-slate-200/80">
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
              <h1 className="text-2xl font-bold">Set Your Password</h1>
            </div>
            <p className="mb-5 text-sm text-slate-500">
              Welcome! This is your first login. Please set a new password to
              continue.
            </p>

            {done ? (
              <div className="space-y-4">
                <div className="rounded-xl border-l-4 border-teal-400 bg-teal-50 px-3.5 py-3 text-sm text-teal-900">
                  Password set successfully! Please log in with your new
                  password.
                </div>
                <button
                  type="button"
                  onClick={handleGoToLogin}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-950 to-teal-500 text-base font-bold text-white shadow-lg transition hover:shadow-xl"
                >
                  Go to Login
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 rounded-xl border-l-4 border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-900">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
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
                    disabled={loading}
                    className="flex h-11 w-full items-center justify-center gap-3 rounded-full border-none bg-gradient-to-r from-blue-950 to-teal-500 px-5 text-base font-bold text-white shadow-lg shadow-teal-600/20 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "Saving..." : "Set Password"}
                  </button>
                </form>
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
