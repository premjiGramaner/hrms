import { FormEvent, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { IconLinkedIn, IconFacebook, IconTwitterX } from "../components/Icons";
import { login as loginApi } from "../api/auth.api";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { loginSuccess } from "../store/authSlice";
import { getApiErrorMessage } from "../utils/errors";
import { validateLogin } from "../validations/auth.validation";
import { PAGE_PATHS } from "../config/roles";
import { STORAGE_KEYS } from "../constants/storage";
import { UI_MESSAGES, SOCIAL_LINKS } from "../constants/uiMessages";
import cannyforeLogo from "../assets/logo.png";
import rightPanelImage from "../assets/login_intelligent.png";

const PASSWORD_EXPIRY_REDIRECT_DELAY = 2000;

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

  const token = useAppSelector((state) => state.auth.token);

  useEffect(() => {
    if (token && token !== "cookie_auth") {
      navigate(PAGE_PATHS.myInfo, { replace: true });
    }
  }, [token, navigate]);

  const handlePasswordVisibilityToggle = () => {
    setShowPass((current) => !current);
  };

  const handleForgotPassword = () => {
    navigate(PAGE_PATHS.forgotPassword);
  };

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
      const {
        token,
        user,
        requiresPasswordChange,
        passwordSetupToken,
        passwordExpired,
        message,
        passwordReminderMessage,
      } = loginData;

      if (requiresPasswordChange && user) {
        if (!passwordSetupToken) {
          setError(UI_MESSAGES.LOGIN.PASSWORD_SETUP_ERROR);
          return;
        }
        sessionStorage.setItem(
          STORAGE_KEYS.passwordSetupToken,
          passwordSetupToken,
        );

        if (passwordExpired) {
          setError(message || UI_MESSAGES.LOGIN.PASSWORD_EXPIRED_REDIRECT);
          setTimeout(() => {
            navigate(`${PAGE_PATHS.createPassword}?expired=true`);
          }, PASSWORD_EXPIRY_REDIRECT_DELAY);
          return;
        }

        navigate(PAGE_PATHS.createPassword);
        return;
      }

      if (!token || !user) {
        setError(UI_MESSAGES.LOGIN.LOGIN_INCOMPLETE);
        return;
      }

      dispatch(loginSuccess({ token, user }));

      if (passwordSetupToken) {
        sessionStorage.setItem(
          STORAGE_KEYS.passwordSetupToken,
          passwordSetupToken,
        );
      }

      if (passwordReminderMessage) {
        sessionStorage.setItem(
          STORAGE_KEYS.passwordReminder,
          passwordReminderMessage,
        );
      }

      navigate(PAGE_PATHS.employees);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, UI_MESSAGES.LOGIN.INVALID_CREDENTIALS));
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
              alt={UI_MESSAGES.ACCESSIBILITY.LOGO_ALT}
              className="h-14 max-w-full object-contain sm:h-16 md:h-20"
            />
          </div>
        </div>

        <div className="flex w-full flex-1 items-center justify-center lg:py-10">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white  px-6 py-8 shadow-2xl shadow-slate-200/80 sm:px-9 sm:py-10 md:min-h-[28rem]">
            <div className="mb-4 flex items-center gap-2 text-slate-800">
              <User size={22} />
              <h1 className="text-2xl font-bold">{UI_MESSAGES.LOGIN.TITLE}</h1>
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
                  placeholder={UI_MESSAGES.LOGIN.USERNAME_PLACEHOLDER}
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
                  placeholder={UI_MESSAGES.LOGIN.PASSWORD_PLACEHOLDER}
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
                    onClick={handlePasswordVisibilityToggle}
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
                {UI_MESSAGES.LOGIN.REMEMBER_ME}
              </label>

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full my-5 items-center justify-center gap-3 rounded-full border-none bg-gradient-to-r from-blue-950 to-teal-500 px-5 text-base font-bold text-white shadow-lg shadow-teal-600/20 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span>
                  {loading
                    ? UI_MESSAGES.LOGIN.LOGGING_IN
                    : UI_MESSAGES.LOGIN.LOGIN_BUTTON}
                </span>
                <LogIn size={19} />
              </button>
            </form>

            <p className="mt-4 text-sm text-slate-500">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="font-bold text-blue-950 hover:text-teal-600"
              >
                {UI_MESSAGES.LOGIN.FORGOT_PASSWORD}
              </button>
            </p>
          </div>
        </div>

        <footer className="pb-2 text-center">
          <p className="mt-1 text-xs text-slate-400">
            {UI_MESSAGES.FOOTER.COPYRIGHT(new Date().getFullYear())}
          </p>
          <div className="mt-3 flex justify-center gap-3">
            <a
              href={SOCIAL_LINKS.LINKEDIN}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A66C2] text-white transition hover:opacity-90"
              aria-label={UI_MESSAGES.FOOTER.LINKEDIN_ARIA}
            >
              <IconLinkedIn />
            </a>
            <a
              href={SOCIAL_LINKS.FACEBOOK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-white transition hover:opacity-90"
              aria-label={UI_MESSAGES.FOOTER.FACEBOOK_ARIA}
            >
              <IconFacebook />
            </a>
            <a
              href={SOCIAL_LINKS.TWITTER}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition hover:bg-slate-800"
              aria-label={UI_MESSAGES.FOOTER.TWITTER_ARIA}
            >
              <IconTwitterX />
            </a>
          </div>
        </footer>
      </section>

      <section className="hidden min-h-screen overflow-hidden bg-slate-950 lg:block">
        <img
          src={rightPanelImage}
          alt={UI_MESSAGES.ACCESSIBILITY.RIGHT_PANEL_ALT}
          className="h-full min-h-screen w-full object-cover"
        />
      </section>
    </main>
  );
}
