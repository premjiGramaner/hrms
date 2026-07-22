import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../api/auth.api";
import { getApiErrorMessage } from "../utils/errors";
import { PAGE_PATHS } from "../config/roles";
import { IconLock } from "../components/Icons";
import cannyforeLogo from "../assets/logo.png";
import rightPanelImage from "../assets/login_intelligent.png";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(trimmed);
      setSubmitted(true);
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
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-slate-50"></div>
            </div>

            <div className="mb-4 flex items-center gap-2 text-slate-800">
              <IconLock size={22} />
              <h1 className="text-2xl font-bold">Forgot Password</h1>
            </div>

            {submitted ? (
              <div className="space-y-4">
                <div className="rounded-xl border-l-4 border-teal-400 bg-teal-50 px-3.5 py-3 text-sm text-teal-900">
                  If an account with that email exists, a password reset link
                  has been sent. Check your inbox.
                </div>
                <button
                  type="button"
                  onClick={() => navigate(PAGE_PATHS.login)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-950 to-teal-500 text-base font-bold text-white shadow-lg transition hover:shadow-xl"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-slate-500">
                  Enter your work email address and we'll send you a link to set
                  a new password.
                </p>

                {error && (
                  <div className="mb-4 rounded-xl border-l-4 border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-900">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="relative mb-5">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                      <MailIcon />
                    </span>
                    <input
                      type="email"
                      placeholder="Work email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                      autoComplete="email"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-11 w-full items-center justify-center gap-3 rounded-full border-none bg-gradient-to-r from-blue-950 to-teal-500 px-5 text-base font-bold text-white shadow-lg shadow-teal-600/20 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                </form>

                <p className="mt-4 text-sm text-slate-500">
                  Remember your password?{" "}
                  <button
                    type="button"
                    onClick={() => navigate(PAGE_PATHS.login)}
                    className="font-bold text-blue-950 hover:text-teal-600"
                  >
                    Login
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

function MailIcon() {
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
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 7L2 7" />
    </svg>
  );
}
