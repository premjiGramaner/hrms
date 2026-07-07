import React, { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as loginApi } from "../api/auth.api";
import { useAppDispatch } from "../app/hooks";
import { loginSuccess } from "../store/authSlice";
import { getApiErrorMessage } from "../utils/errors";
import { validateLogin } from "../validations/auth.validation";
import cannyforeLogo from "../assets/logo.png";
import rightPanelImage from "../assets/login_intelligent.png";
import orangeHrmLogo from "../assets/orangehrm-logo.png";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const validationError = validateLogin(username, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await loginApi(username, password, rememberMe);
      const payload = (response as { data?: any } | undefined)?.data ?? response;
      const data = payload as {
        token?: string;
        user?: { id: number; username: string; role: string; name: string; avatar?: string };
        requiresPasswordChange?: boolean;
        userId?: number;
        isFirstLogin?: boolean;
      };
      const token = data?.token;
      const user = data?.user;
      const requiresPasswordChange = data?.requiresPasswordChange;
      const userId = data?.userId;

      if (requiresPasswordChange && user) {
        navigate(
          `/create-password?userId=${encodeURIComponent(String(userId ?? user.id))}&username=${encodeURIComponent(user.username)}`,
        );
        return;
      }

      if (!token || !user) {
        setError("Login could not be completed. Please try again.");
        return;
      }

      dispatch(loginSuccess({ token, user }));
      navigate("/employees");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Invalid username or password."));
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

            <div className="mb-4 flex items-center gap-2 text-slate-800">
              <UserIcon />
              <h1 className="text-2xl font-bold">Login</h1>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border-l-4 border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-900">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="relative mb-3">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <UserIcon small />
                </span>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoFocus
                  autoComplete="username"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
                />
              </div>

              <div className="relative mb-4">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <LockIcon />
                </span>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-14 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((current) => !current)}
                  className="absolute right-2 top-1/2 flex h-9 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  <EyeIcon hidden={showPass} />
                </button>
              </div>

              <label className="mb-5 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-teal-600"
                />
                Keep me logged in for 30 days
              </label>

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-3 rounded-full border-none bg-gradient-to-r from-blue-950 to-teal-500 px-5 text-base font-bold text-white shadow-lg shadow-teal-600/20 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span>{loading ? "Logging in..." : "Login"}</span>
                <LoginArrowIcon />
              </button>
            </form>

            <p className="mt-4 text-sm text-slate-500">
              Forgot Your{" "}
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="font-bold text-blue-950 hover:text-teal-600"
              >
                Password?
              </button>
            </p>

            <div className="my-4 h-px bg-slate-200" />

            <p className="text-center text-xs text-slate-400">Or Login With</p>
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-base font-bold text-white"
              >
                L
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

function UserIcon({ small = false }: { small?: boolean }) {
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
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

function LoginArrowIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}
