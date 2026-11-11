import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../services/auth-service";
import Logo from "./Logo";
import AppLauncher from "./AppLauncher";

export default function AdminHeader({ title, user, backLink = "/admin" }) {
  const navigate = useNavigate();
  const [canInstallPwa, setCanInstallPwa] = useState(Boolean(typeof window !== "undefined" && window.__deferredPwaPrompt));
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator?.standalone === true;
    setIsStandalone(Boolean(standalone));

    const handlePwaReady = () => setCanInstallPwa(true);
    window.addEventListener("pwa-install-available", handlePwaReady);
    return () => window.removeEventListener("pwa-install-available", handlePwaReady);
  }, []);

  const handleInstallPwa = async () => {
    if (window.__deferredPwaPrompt) {
      window.__deferredPwaPrompt.prompt();
      const choice = await window.__deferredPwaPrompt.userChoice;
      if (choice?.outcome === "accepted") {
        window.__deferredPwaPrompt = null;
        setCanInstallPwa(false);
      }
      return;
    }
    alert(
      "📲 To install TMS Ops on your phone:\n\n" +
      "• Android (Chrome): Tap the ⋮ menu (top-right) → 'Add to Home screen' or 'Install app'.\n" +
      "• iPhone (Safari): Tap Share (⬆) → 'Add to Home Screen'."
    );
  };

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 py-3.5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Logo textClassName="font-black text-lg md:text-xl italic tracking-tighter" />
          {backLink && (
            <Link to={backLink} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition flex items-center gap-1">
              <span className="text-sm">←</span> {title || "System Hub"}
            </Link>
          )}
        </div>
        
        <div className="flex items-center gap-3 md:gap-5">
          <Link
            to="/admin/replay"
            className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-black uppercase tracking-wider transition shadow-xs"
          >
            ⏱️ Replay Desk
          </Link>

          <Link
            to="/admin/payouts"
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider transition shadow-xs"
          >
            📲 Live Till
          </Link>

          {!isStandalone && (
            <button
              onClick={handleInstallPwa}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                canInstallPwa
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs animate-pulse"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
              }`}
            >
              ⬇ Install App
            </button>
          )}

          {user && (
            <span className="hidden lg:block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {user.email}
            </span>
          )}
          <AppLauncher />
          <button 
            onClick={() => navigate("/admin/shops")}
            className="hidden sm:inline-block text-[11px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition"
          >
            Shops
          </button>
          <button 
            onClick={() => { logout(); navigate("/login"); }}
            className="text-[11px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
