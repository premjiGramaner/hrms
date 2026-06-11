import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginApi } from '../api/auth.api';
import { useAppDispatch } from '../app/hooks';
import { loginSuccess } from '../store/authSlice';
import { getApiErrorMessage } from '../utils/errors';
import { validateLogin } from '../validations/auth.validation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const validationError = validateLogin(username, password);
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      const { data } = await loginApi(username, password);
      dispatch(loginSuccess({ token: data.token, user: data.user }));
      navigate('/employees');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Invalid username or password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen font-sans">
      {/* ── LEFT PANEL ── */}
      <div className="flex-0 w-1/2 bg-white flex flex-col items-center px-10 py-8 min-h-screen">
        {/* Top logo */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm px-8 py-4 flex justify-center mb-8">
          <Logo />
        </div>

        {/* Login card */}
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-md p-7 flex-1">
          {/* Orange icon */}
          <div className="flex justify-center mb-4.5">
            <OrangeIcon />
          </div>

          {/* Title */}
          <div className="flex items-center gap-2 mb-5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="text-2xl font-bold text-gray-900">Login</span>
          </div>

          {error && <div className="bg-red-50 border-l-4 border-red-300 rounded px-3.5 py-2.5 text-red-900 text-sm mb-3.5">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {/* Username */}
            <div className="relative mb-3.5">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                required
                className="w-full pl-10 pr-3.5 py-3 border-1.5 border-slate-200 rounded-xl text-sm text-gray-700 bg-slate-50 outline-none transition-all focus:border-teal-600 focus:bg-white focus:shadow-sm focus:shadow-teal-600/20"
              />
            </div>

            {/* Password */}
            <div className="relative mb-4.5">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-11 py-3 border-1.5 border-slate-200 rounded-xl text-sm text-gray-700 bg-slate-50 outline-none transition-all focus:border-teal-600 focus:bg-white focus:shadow-sm focus:shadow-teal-600/20"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer flex items-center p-1"
              >
                {showPass
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>

            {/* Remember */}
            <label className="flex items-center gap-2 mb-4.5 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 accent-blue-900 cursor-pointer"
              />
              <span className="text-sm text-slate-600">Keep me logged in for 30 days</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.25 px-5 border-none rounded-full bg-gradient-to-r from-blue-900 to-teal-600 text-white text-base font-bold cursor-pointer flex items-center justify-center gap-2.5 mb-4 transition-opacity hover:shadow-lg disabled:opacity-70"
            >
              <span>{loading ? 'Logging in…' : 'Login'}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
            </button>
          </form>

          <p className="text-center text-sm text-slate-600 mb-3">Forgot Your <strong className="text-blue-900 cursor-pointer">Password?</strong></p>
          <p className="text-center text-xs text-slate-400 mb-2.5">Or Login With</p>
          <div className="flex justify-center">
            <button className="w-10 h-10 rounded-full bg-teal-600 text-white border-none font-bold text-base cursor-pointer">L</button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6 text-center">
          <p className="text-xs text-slate-400 my-0.5">OrangeHRM 8.1.0.1</p>
          <p className="text-xs text-slate-400 my-0.5">CannyFore® 2005 – 2026 OrangeHRM, Inc. All rights reserved.</p>
          <div className="flex justify-center gap-2 mt-2">
            {['in','f','t','yt'].map(n => (
              <div key={n} className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-bold cursor-pointer">{n}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div
        className="flex-0 w-1/2 bg-cover bg-center bg-no-repeat flex flex-col items-center justify-between px-10 py-12 relative overflow-hidden"
        style={{ backgroundImage: 'url(/login-bg.png)' }}
      >
      </div>
    </div>
  );
}


/* ── Sub-components ── */

function Logo() {
  return (
    <img src="/logo.png" alt="Cannyfore" className="h-12 max-w-55 object-contain" />
  );
}

function OrangeIcon() {
  return (
    <div className="w-18 h-18 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden">
      <img src="/orangehrm-logo.png" alt="OrangeHRM" className="w-14 h-14 object-contain" />
    </div>
  );
}
