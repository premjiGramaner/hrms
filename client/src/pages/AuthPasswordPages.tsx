import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  forgotPassword,
  resetPassword,
  verifyPasswordToken,
} from "../api/auth.api";
import cannyforeLogo from "../assets/logo.png";
import orangeHrmLogo from "../assets/orangehrm-logo.png";
import rightPanelImage from "../assets/login_intelligent.png";
import { getApiErrorMessage } from "../utils/errors";
import { PAGE_PATHS } from "../config/roles";
import { STORAGE_KEYS } from "../constants/storage";
import { EyeOff, Eye } from "lucide-react";

const MISSING_PASSWORD_LINK_MESSAGE =
  "This password setup session is missing or expired. Return to login and sign in with your temporary password.";

function validatePassword(password: string, confirmPassword: string) {
  if (!password || !confirmPassword)
    return "Both password fields are required.";
  if (password !== confirmPassword)
    return "Password and confirm password must match.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password))
    return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password))
    return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(password))
    return "Password must include a special character.";
  return "";
}

function AuthShell({
  title,
  subtitle,
  children,
  isError,
}: {
  title: string;
  subtitle: string | ReactNode;
  children: ReactNode;
  isError?: boolean;
}) {
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
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-50">
                <img
                  src={orangeHrmLogo}
                  alt="OrangeHRM"
                  className="h-20 w-20 object-contain"
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {!isError && (
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {subtitle}
              </p>
            )}
            <div className="mt-6">{children}</div>
          </div>
        </div>
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

function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          title={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}

function PasswordForm({ mode }: { mode: "create" | "reset" }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token] = useState(() => {
    const queryToken = params.get("token")?.trim() || "";
    if (queryToken) return queryToken;
    return mode === "create"
      ? sessionStorage.getItem(STORAGE_KEYS.passwordSetupToken) || ""
      : "";
  });
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [linkError, setLinkError] = useState("");
  const [formError, setFormError] = useState("");
  const [authenticatedUserName, setAuthenticatedUserName] = useState("");
  const [isExpiredPassword, setIsExpiredPassword] = useState(false);
  const [success, setSuccess] = useState("");
  const [verifyingToken, setVerifyingToken] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const submitLabel = mode === "create" ? "Create Password" : "Reset Password";

  const subtitle = useMemo(() => {
    if (mode === "create") {
      return authenticatedUserName
        ? `Create a permanent password for ${authenticatedUserName}.`
        : "Create your permanent password before accessing HRMS.";
    }
    return authenticatedUserName
      ? `Enter a new password for ${authenticatedUserName}.`
      : "Enter a new password for your HRMS account.";
  }, [mode, authenticatedUserName]);

  useEffect(() => {
    let active = true;

    const verify = async () => {
      if (!token) {
        setLinkError(
          mode === "create"
            ? MISSING_PASSWORD_LINK_MESSAGE
            : "This password link is missing or invalid.",
        );
        setVerifyingToken(false);
        return;
      }

      const expiredParam = params.get("expired");
      if (expiredParam === "true") {
        setIsExpiredPassword(true);
      }

      setVerifyingToken(true);
      try {
        const user = await verifyPasswordToken(token);
        if (active) {
          setAuthenticatedUserName(user.name || "");
        }
      } catch (err: unknown) {
        if (active) {
          if (mode === "create") {
            sessionStorage.removeItem(STORAGE_KEYS.passwordSetupToken);
          }
          setLinkError(
            getApiErrorMessage(
              err,
              "This password link is missing, invalid, or expired.",
            ),
          );
        }
      } finally {
        if (active) {
          setVerifyingToken(false);
        }
      }
    };

    verify();
    return () => {
      active = false;
    };
  }, [mode, token, params]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    setSuccess("");

    if (isExpiredPassword && !oldPassword) {
      setFormError("Current password is required for security verification.");
      return;
    }

    const validationError = validatePassword(password, confirmPassword);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (!token) {
      setLinkError(
        mode === "create"
          ? MISSING_PASSWORD_LINK_MESSAGE
          : "This password link is missing or invalid.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await resetPassword(
        token,
        password,
        confirmPassword,
        isExpiredPassword ? oldPassword : undefined,
      );
      if (mode === "create") {
        sessionStorage.removeItem(STORAGE_KEYS.passwordSetupToken);
      }
      setSuccess(data.message || "Password updated successfully.");
      const redirectDelay = mode === "create" ? 2000 : 1200;
      setTimeout(
        () => navigate(PAGE_PATHS.login, { replace: true }),
        redirectDelay,
      );
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, "Unable to update password."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title={submitLabel} subtitle={subtitle} isError={!!linkError}>
      {success && (
        <div className="mb-4 rounded-xl border-l-4 border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
          {success}
        </div>
      )}
      {linkError && (
        <div className="mb-4 rounded-xl border-l-4 border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-900">
          {linkError}
        </div>
      )}
      {formError && (
        <div className="mb-4 rounded-xl border-l-4 border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-900">
          {formError}
        </div>
      )}
      {verifyingToken && (
        <p className="py-4 text-center text-sm font-semibold text-slate-500">
          Validating password link...
        </p>
      )}
      {!verifyingToken && !linkError && !success && (
        <form onSubmit={onSubmit} noValidate>
          {isExpiredPassword && (
            <>
              <PasswordInput
                label="Current Password"
                value={oldPassword}
                onChange={setOldPassword}
                autoComplete="current-password"
              />
              <p className="mb-4 text-xs leading-5 text-amber-700 bg-amber-50 border-l-4 border-amber-400 px-3 py-2 rounded">
                For security, please verify your current password before setting
                a new one.
              </p>
            </>
          )}
          <PasswordInput
            label="New Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <PasswordInput
            label="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
          <p className="mb-5 text-xs leading-5 text-slate-500">
            Use at least 8 characters with uppercase, lowercase, number, and
            special character.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-950 to-teal-500 px-5 text-base font-bold text-white shadow-lg shadow-teal-600/20 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Saving..." : submitLabel}
          </button>
        </form>
      )}

      <Link
        to={PAGE_PATHS.login}
        onClick={() => {
          if (mode === "create") {
            sessionStorage.removeItem(STORAGE_KEYS.passwordSetupToken);
          }
        }}
        className="mt-5 block text-center text-sm font-bold text-blue-950 hover:text-teal-600"
      >
        Back to Login
      </Link>
    </AuthShell>
  );
}

export function CreatePasswordPage() {
  return <PasswordForm mode="create" />;
}

export function ResetPasswordPage() {
  return <PasswordForm mode="reset" />;
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await forgotPassword(email.trim());
      setMessage(data.message);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Unable to send reset link."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot Password"
      subtitle="Enter your registered email address and we will send a secure reset link."
    >
      {error && (
        <div className="mb-4 rounded-xl border-l-4 border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-900">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-xl border-l-4 border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
          {message}
        </div>
      )}
      <form onSubmit={onSubmit} noValidate>
        <label className="mb-5 block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">
            Registered Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-950 to-teal-500 px-5 text-base font-bold text-white shadow-lg shadow-teal-600/20 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
      <Link
        to={PAGE_PATHS.login}
        className="mt-5 block text-center text-sm font-bold text-blue-950 hover:text-teal-600"
      >
        Back to Login
      </Link>
    </AuthShell>
  );
}
