import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  BuildingStorefrontIcon, 
  TruckIcon, 
  UserGroupIcon, 
  CommandLineIcon, 
  Square3Stack3DIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  CpuChipIcon
} from "@heroicons/react/24/outline";

export default function AppLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const apps = [
    { 
      name: "Marketplace", 
      desc: "Public Shopping", 
      icon: <GlobeAltIcon className="w-6 h-6 text-blue-500" />, 
      path: "/",
      color: "bg-blue-50"
    },
    { 
      name: "Registry Ops", 
      desc: "Shop Management", 
      icon: <BuildingStorefrontIcon className="w-6 h-6 text-green-600" />, 
      path: "/admin", 
      color: "bg-green-50"
    },
    { 
      name: "Logistics Hub", 
      desc: "Delivery & Fleet", 
      icon: <TruckIcon className="w-6 h-6 text-amber-500" />, 
      path: "/a/delivery/manager",
      color: "bg-amber-50"
    },
    { 
      name: "Supplier Network", 
      desc: "Wholesale Portal", 
      icon: <UserGroupIcon className="w-6 h-6 text-indigo-500" />, 
      path: "/admin/suppliers",
      color: "bg-indigo-50"
    },
    { 
      name: "Engineering", 
      desc: "System Telemetry", 
      icon: <CommandLineIcon className="w-6 h-6 text-slate-700" />, 
      path: "/admin/engineering",
      color: "bg-slate-100"
    },
    { 
      name: "Security Lab", 
      desc: "Trust & Safety", 
      icon: <ShieldCheckIcon className="w-6 h-6 text-red-500" />, 
      path: "/admin/monitoring",
      color: "bg-red-50"
    },
    { 
      name: "SalesBrain AI", 
      desc: "AI Sales Engine", 
      icon: <CpuChipIcon className="w-6 h-6 text-violet-600" />, 
      path: "http://localhost:5174", 
      color: "bg-violet-50"
    }
  ];

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-slate-100 rounded-full transition-colors group relative"
        title="App Launcher"
      >
        <Square3Stack3DIcon className="w-6 h-6 text-slate-500 group-hover:text-slate-900" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-[100] animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">System Ecosystem</h3>
            <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-bold">MASTER</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {apps.map((app) => {
              const isExternal = app.path.startsWith('http');
              const Component = isExternal ? 'a' : Link;
              const props = isExternal ? { href: app.path } : { to: app.path };

              return (
                <Component
                  key={app.name}
                  {...props}
                  onClick={() => setIsOpen(false)}
                  className="flex flex-col items-center text-center p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
                >
                  <div className={`w-12 h-12 ${app.color} rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                    {app.icon}
                  </div>
                  <span className="text-xs font-bold text-slate-800">{app.name}</span>
                  <span className="text-[9px] text-slate-400 font-medium leading-tight mt-1">{app.desc}</span>
                </Component>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-50">
            <Link 
              to="/admin" 
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition"
            >
              Master Admin Hub →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
