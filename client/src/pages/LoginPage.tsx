import { FormEvent, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { IconLinkedIn, IconFacebook, IconTwitterX } from "../components/Icons";
import { login as loginApi } from "../api/auth.api";
import { useAppDispatch } from "../app/hooks";
import { loginSuccess } from "../store/authSlice";
import { getApiErrorMessage } from "../utils/errors";
import { validateLogin } from "../validations/auth.validation";
import { PAGE_PATHS } from "../config/roles";
import { STORAGE_KEYS } from "../constants/storage";
import cannyforeLogo from "../assets/logo.png";
import rightPanelImage from "../assets/login_intelligent.png";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [supportsPasswordToggle, setSupportsPasswordToggle] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const testInput = document.createElement("input");

    try {
      testInput.type = "password";
      testInput.type = "text";

      const supportsTextType = testInput.type === "text";

      testInput.type = "password";
      const supportsPasswordType = testInput.type === "password";

      setSupportsPasswordToggle(supportsTextType && supportsPasswordType);
    } catch {
      setSupportsPasswordToggle(false);
    }
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const validationError = validateLogin(username, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    sessionStorage.removeItem(STORAGE_KEYS.passwordSetupToken);
    setLoading(true);
    try {
      const loginData = await loginApi(username, password, rememberMe);
      const token = loginData.token;
      const user = loginData.user;

      if (loginData.requiresPasswordChange && user) {
        if (!loginData.passwordSetupToken) {
          setError("Password setup could not be started. Please try again.");
          return;
        }
        sessionStorage.setItem(
          STORAGE_KEYS.passwordSetupToken,
          loginData.passwordSetupToken,
        );
        navigate(PAGE_PATHS.createPassword);
        return;
      }

      if (!token || !user) {
        setError("Login could not be completed. Please try again.");
        return;
      }

      dispatch(loginSuccess({ token, user }));
      navigate(PAGE_PATHS.employees);
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
          <div className="flex h-24 w-full max-w-2xl items-center justify-center rounded-2xl border border-slate-100 bg-white px-10 shadow-xl shadow-slate-200/80 sm:h-28 md:h-32">
            <img
              src={cannyforeLogo}
              alt="Cannyfore"
              className="h-14 max-w-full object-contain sm:h-16 md:h-20"
            />
          </div>
        </div>

        <div className="flex w-full flex-1 items-center justify-center lg:py-10">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white  px-6 py-8 shadow-2xl shadow-slate-200/80 sm:px-9 sm:py-10 md:min-h-[28rem]">
            <div className="mb-5 flex justify-center"></div>

            <div className="mb-4 flex items-center gap-2 text-slate-800">
              <User size={22} />
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
                  <User size={18} />
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
                  <Lock size={18} aria-hidden="true" />
                </span>

                <input
                  type={
                    supportsPasswordToggle && showPass ? "text" : "password"
                  }
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className={`password-input h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-50 ${
                    supportsPasswordToggle ? "pr-14" : "pr-4"
                  }`}
                />

                {supportsPasswordToggle && (
                  <button
                    type="button"
                    onClick={() => setShowPass((current) => !current)}
                    className="absolute right-2 top-1/2 flex h-9 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    aria-label={showPass ? "Hide password" : "Show password"}
                    aria-pressed={showPass}
                  >
                    {showPass ? (
                      <EyeOff size={17} aria-hidden="true" />
                    ) : (
                      <Eye size={17} aria-hidden="true" />
                    )}
                  </button>
                )}
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
                className="flex h-11 w-full my-5 items-center justify-center gap-3 rounded-full border-none bg-gradient-to-r from-blue-950 to-teal-500 px-5 text-base font-bold text-white shadow-lg shadow-teal-600/20 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span>{loading ? "Logging in..." : "Login"}</span>
                <LogIn size={19} />
              </button>
            </form>

            <p className="mt-4 text-sm text-slate-500">
              Forgot Your{" "}
              <button
                type="button"
                onClick={() => navigate(PAGE_PATHS.forgotPassword)}
                className="font-bold text-blue-950 hover:text-teal-600"
              >
                Password?
              </button>
            </p>
          </div>
        </div>

        <footer className="pb-2 text-center">
          <p className="mt-1 text-xs text-slate-400">
            Cannyfore © {new Date().getFullYear()} All rights reserved.
          </p>
          <div className="mt-3 flex justify-center gap-3">
            <a
              href="https://www.linkedin.com/company/cannyfore/posts/?feedView=all"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A66C2] text-white transition hover:opacity-90"
              aria-label="Visit Cannyfore on LinkedIn"
            >
              <IconLinkedIn />
            </a>
            <a
              href="https://www.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-white transition hover:opacity-90"
              aria-label="Visit Cannyfore on Facebook"
            >
              <IconFacebook />
            </a>
            <a
              href="https://x.com/Cannyfore_tech"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition hover:bg-slate-800"
              aria-label="Visit Cannyfore on X (Twitter)"
            >
              <IconTwitterX />
            </a>
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
