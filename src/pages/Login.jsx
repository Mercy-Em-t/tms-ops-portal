import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authenticateUser, getCurrentUser } from "../services/auth-service";
import Logo from "../components/Logo";
import {
  LockClosedIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  ArrowRightIcon
} from "@heroicons/react/24/outline";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/admin";

  const [email, setEmail] = useState(() => {
    return localStorage.getItem("tms_ops_remembered_email") || "admin@tmsavannah.com";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [autoLoginSuccess, setAutoLoginSuccess] = useState(false);

  // If already logged in as system_admin, auto-redirect to admin
  useEffect(() => {
    const existingUser = getCurrentUser();
    if (existingUser && existingUser.system_role === "system_admin") {
      navigate(redirectTarget, { replace: true });
    }
  }, [navigate, redirectTarget]);

  const handleLoginSubmit = async (e, customEmail = null, customPassword = null) => {
    if (e) e.preventDefault();
    const targetEmail = (customEmail ?? email).trim();
    const targetPassword = customPassword ?? password;

    if (!targetEmail || !targetPassword) {
      setError("Please enter both work email and master password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authenticateUser(targetEmail, targetPassword, null);

      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      const user = res.user;

      if (!user) {
        setError("Authentication handshake completed but user session could not be established.");
        setLoading(false);
        return;
      }

      // Check system_admin authorization
      if (user.system_role !== "system_admin") {
        setError(
          `Access Denied: Account (${user.email}) has role "${user.system_role || user.role || 'user'}" and lacks system_admin privileges required for TMS Operations.`
        );
        setLoading(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem("tms_ops_remembered_email", targetEmail);
      } else {
        localStorage.removeItem("tms_ops_remembered_email");
      }

      setAutoLoginSuccess(true);
      setTimeout(() => {
        navigate(redirectTarget, { replace: true });
      }, 500);
    } catch (err) {
      console.error("Ops Login Error:", err);
      setError(err.message || "An unexpected error occurred during authentication.");
      setLoading(false);
    }
  };

  const fillAndLogin = async (presetEmail, presetPassword) => {
    setEmail(presetEmail);
    setPassword(presetPassword);
    await handleLoginSubmit(null, presetEmail, presetPassword);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl mb-3">
            <Logo className="h-10 w-10" textClassName="font-black text-2xl tracking-tight text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <ShieldCheckIcon className="w-3.5 h-3.5" />
            Central Operations Command • Level 4
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Operator Access Gateway
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Platform Orchestration, Multi-Tenant Routing & Edge Observability
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl border border-slate-800 sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 animate-fade-in text-xs font-semibold leading-relaxed">
              <ShieldExclamationIcon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-200">Authentication Failed</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {autoLoginSuccess && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 animate-fade-in text-xs font-bold">
              <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Identity Verified. Initializing Master Ops Console...</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLoginSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tmsavannah.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-black uppercase tracking-wider text-slate-300">
                  Master Password
                </label>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                  256-Bit TLS
                </span>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono tracking-wider transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded-lg transition"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Remember work email</span>
              </label>

              <span className="text-[11px] text-slate-500">
                Port 5180 Protected
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || autoLoginSuccess}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white rounded-xl text-sm font-black uppercase tracking-wider transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <LockClosedIcon className="w-4 h-4" />
                  <span>Sign In to Ops Console</span>
                </>
              )}
            </button>
          </form>

          {/* CREDENTIALS ASSISTANT (Never forget credentials again) */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <KeyIcon className="w-3.5 h-3.5 text-amber-400" />
                Ops Credentials Vault
              </span>
              <span className="text-[10px] text-amber-400/90 font-mono bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                1-Click Sign In
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Primary Admin Quick Fill */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between hover:border-slate-700 transition">
                <div>
                  <p className="text-xs font-black text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    Master Administrator
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                    admin@tmsavannah.com
                  </p>
                  <p className="text-[10px] font-mono text-emerald-400/80">
                    Password: <span className="text-white font-bold">AdminOps2026!</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fillAndLogin("admin@tmsavannah.com", "AdminOps2026!")}
                  disabled={loading || autoLoginSuccess}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Auto-fill and sign in immediately"
                >
                  <span>⚡ Quick In</span>
                  <ArrowRightIcon className="w-3 h-3" />
                </button>
              </div>

              {/* Secondary Admin Quick Fill */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between hover:border-slate-700 transition">
                <div>
                  <p className="text-xs font-black text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                    Backup Operator
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                    memurugat@gmail.com
                  </p>
                  <p className="text-[10px] font-mono text-cyan-400/80">
                    Password: <span className="text-white font-bold">AdminOps2026!</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fillAndLogin("memurugat@gmail.com", "AdminOps2026!")}
                  disabled={loading || autoLoginSuccess}
                  className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/40 text-cyan-300 hover:text-white rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Auto-fill and sign in immediately"
                >
                  <span>⚡ Quick In</span>
                  <ArrowRightIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* System Footer info */}
          <div className="mt-6 text-center text-[10px] text-slate-500 font-mono">
            TMS Ops Portal v1.0 • Connected to Supabase Cloud Node
          </div>
        </div>
      </div>
    </div>
  );
}
