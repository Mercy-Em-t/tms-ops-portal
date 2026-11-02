import { Link, useNavigate } from "react-router-dom";
import { logout } from "../services/auth-service";
import Logo from "./Logo";
import AppLauncher from "./AppLauncher";

export default function AdminHeader({ title, user, backLink = "/admin" }) {
  const navigate = useNavigate();

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo textClassName="font-black text-xl italic tracking-tighter" />
          {backLink && (
            <Link to={backLink} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition flex items-center gap-1">
              <span className="text-sm">←</span> {title || "System Hub"}
            </Link>
          )}
        </div>
        
        <div className="flex items-center gap-6">
          {user && (
            <span className="hidden md:block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {user.email}
            </span>
          )}
          <AppLauncher />
          <button 
            onClick={() => navigate("/select-shop")}
            className="text-[11px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition"
          >
            Switch Shop
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
