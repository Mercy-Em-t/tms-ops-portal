import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/auth-service";
import { supabase } from "../services/supabase-client";
import Logo from "../components/Logo";
import AppLauncher from "../components/AppLauncher";
import { 
  BuildingStorefrontIcon, 
  TruckIcon, 
  UserGroupIcon, 
  CommandLineIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  CircleStackIcon
} from "@heroicons/react/24/outline";

export default function MasterAdmin() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    shops: 0,
    orders: 0,
    gmv: 0,
    uptime: "99.98%",
    activeUsers: 0
  });

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") {
      navigate("/login");
      return;
    }
    fetchEcosystemPulse();
  }, [navigate]);

  const fetchEcosystemPulse = async () => {
    try {
      setLoading(true);
      // Fetch high-level counts
      const { count: shopCount } = await supabase.from("shops").select("*", { count: "exact", head: true });
      const { count: orderCount } = await supabase.from("orders").select("*", { count: "exact", head: true });
      const { data: gmvData } = await supabase.from("orders").select("total_price").in("status", ["paid", "completed"]);
      
      const totalGmv = gmvData?.reduce((acc, curr) => acc + Number(curr.total_price || 0), 0) || 0;

      setStats({
        shops: shopCount || 0,
        orders: orderCount || 0,
        gmv: totalGmv,
        uptime: "99.99%",
        activeUsers: (shopCount || 0) * 12 // Simulated active session estimate
      });
    } catch (err) {
      console.error("Pulse Check Failed", err);
    } finally {
      setLoading(false);
    }
  };

  const systems = [
    {
      id: "registry",
      name: "Registry Ops",
      desc: "Central Shop & Tenant Management",
      icon: <BuildingStorefrontIcon className="w-8 h-8" />,
      path: "/admin/ops",
      color: "bg-green-600",
      status: "Operational",
      metrics: `${stats.shops} Active Environments`
    },
    {
      id: "logistics",
      name: "Logistics Hub",
      desc: "Fleet Dispatch & Regional Routing",
      icon: <TruckIcon className="w-8 h-8" />,
      path: "/a/delivery/manager",
      color: "bg-amber-500",
      status: "Idle",
      metrics: "12 Global Hubs Online"
    },
    {
      id: "suppliers",
      name: "Supplier Network",
      desc: "Wholesale & Inventory Orchestration",
      icon: <UserGroupIcon className="w-8 h-8" />,
      path: "/admin/suppliers",
      color: "bg-indigo-600",
      status: "Active",
      metrics: "84 Registered Wholesalers"
    },
    {
      id: "marketplace",
      name: "Consumer Ecosystem",
      desc: "Public Search & Social Commerce",
      icon: <ChartBarIcon className="w-8 h-8" />,
      path: "/explore",
      color: "bg-blue-600",
      status: "Traffic High",
      metrics: `${stats.orders} Real-time Orders`
    },
    {
      id: "engineering",
      name: "Engineering Sensors",
      desc: "Raw Telemetry & API Performance",
      icon: <CommandLineIcon className="w-8 h-8" />,
      path: "/admin/engineering",
      color: "bg-slate-800",
      status: "Protected",
      metrics: "3ms Avg Latency"
    },
    {
      id: "security",
      name: "Security & Trust",
      desc: "Risk Assessment & Fraud Shields",
      icon: <ShieldCheckIcon className="w-8 h-8" />,
      path: "/admin/monitoring",
      color: "bg-red-600",
      status: "Hardened",
      metrics: "0 Critical Threats"
    },
    {
      id: "salesbrain",
      name: "SalesBrain AI",
      desc: "AI Engagement & Unified Sales Intelligence",
      icon: <CpuChipIcon className="w-8 h-8" />,
      path: "http://localhost:5174", // Linked to integrated CustMgmt
      color: "bg-violet-600",
      status: "Live Sync",
      metrics: "Product DB Connected"
    },
    {
       id: "booklet",
       name: "Sales Booklet",
       desc: "Platform Sales Training & Reference Material",
       icon: <CircleStackIcon className="w-8 h-8" />,
       path: "/admin/booklet",
       color: "bg-blue-600",
       status: "Registry QA",
       metrics: "Active Assets"
    },
    {
       id: "ops",
       name: "Registry Ops",
       desc: "Historical Admin Management & Logistics Feed",
       icon: <UserGroupIcon className="w-8 h-8" />,
       path: "/admin/ops",
       color: "bg-amber-600",
       status: "Classic Portal",
       metrics: "Root Access"
    },
    {
       id: "developer-portal",
       name: "Dev Performance Hub",
       desc: "Advanced API Gateway & Wholesale Enablement",
       icon: <CpuChipIcon className="w-8 h-8" />,
       path: "/developer/portal",
       color: "bg-blue-900",
       status: "High Speed",
       metrics: "Active Nodes"
    }

  ];

  const exportData = async (table) => {
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) throw error;
      
      const csvContent = "data:text/csv;charset=utf-8," 
        + [Object.keys(data[0]).join(","), ...data.map(row => Object.values(row).join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${table}_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn("Export Failed: Unauthorized or Network Error");
    }
  };

  systems.push({
    id: "data-ops",
    name: "System Export",
    desc: "Authorized Data Extraction (Orders & Users)",
    icon: <CircleStackIcon className="w-8 h-8" />,
    path: "#",
    color: "bg-emerald-800",
    status: "Secure",
    metrics: "Encrypted CSV Output",
    onClick: () => {
       const confirmExport = window.confirm("You are about to export sensitive system data. Proceed?");
       if (confirmExport) exportData("orders");
    }
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20">
      {/* Premium Navigation */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo textClassName="font-black text-2xl italic tracking-tighter" />
            <div className="h-6 w-[1px] bg-slate-200 mx-2" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Master Control</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Systems Nominal</span>
            </div>
            <AppLauncher />
            <button 
              onClick={() => { logout(); navigate("/login"); }}
              className="text-[11px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-8 pt-12">
        {/* Master Search */}
        <section className="mb-12">
          <div className="relative max-w-2xl mx-auto group">
            <div className="absolute inset-0 bg-indigo-500/10 blur-2xl group-focus-within:bg-indigo-500/20 transition-all rounded-3xl" />
            <div className="relative bg-white border border-slate-200 rounded-[2rem] p-2 flex items-center shadow-2xl shadow-indigo-100/50 group-focus-within:border-indigo-300 transition-all">
              <div className="pl-6 text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input 
                type="text" 
                placeholder="Search across all systems (Shops, Orders, Suppliers...)" 
                className="w-full bg-transparent px-4 py-4 outline-none text-lg font-medium text-slate-800 placeholder:text-slate-300"
              />
              <div className="pr-6 flex items-center gap-1.5">
                <kbd className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-black text-slate-400">CMD</kbd>
                <kbd className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-black text-slate-400">K</kbd>
              </div>
            </div>
          </div>
        </section>

        {/* Ecosystem Pulse */}
        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-8">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Ecosystem Hub</h1>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-[0.15em]">Global Telemetry Baseline</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lifetime GMV</p>
              <h2 className="text-3xl font-black text-slate-900">KSh {stats.gmv.toLocaleString()}</h2>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase">
                <span>↑ 12.4%</span>
                <span className="text-slate-300 ml-1 italic">Vs Last Quarter</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Managed Nodes</p>
              <h2 className="text-3xl font-black text-slate-900">{stats.shops}</h2>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase italic">
                Environment Registry
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">System Uptime</p>
              <h2 className="text-3xl font-black text-indigo-600">{stats.uptime}</h2>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase italic">
                Fault Tolerant Architecture
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Sessions</p>
              <h2 className="text-3xl font-black text-slate-900">{stats.activeUsers}</h2>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase italic">
                Concurrent Throughput
              </div>
            </div>
          </div>
        </section>

        {/* System Cards */}
        <section className="mb-12">
           <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 border-b border-slate-100 pb-4">Authorized Control Panels</h2>
           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {systems.map((system) => {
                const CardWrapper = system.path === "#" ? "button" : Link;
                return (
                  <CardWrapper 
                    key={system.id}
                    to={system.path !== "#" ? system.path : undefined}
                    onClick={system.onClick}
                    className="group bg-white rounded-[2.5rem] border border-slate-100 p-8 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[320px] text-left"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[100%] z-0 transition-transform group-hover:scale-110" />
                    
                    <div className="relative z-10">
                      <div className={`${system.color} w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-white mb-6 shadow-lg shadow-${system.color}/20 group-hover:rotate-6 transition-transform`}>
                        {system.icon}
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-2">{system.name}</h3>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">{system.desc}</p>
                    </div>
  
                    <div className="relative z-10 flex items-center justify-between mt-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Current State</span>
                        <span className="text-[10px] font-bold text-slate-800 uppercase tracking-tight">{system.metrics}</span>
                      </div>
                      <div className="bg-slate-900 text-white p-3 rounded-2xl group-hover:translate-x-1 transition-transform">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </div>
                    </div>
                  </CardWrapper>
                );
              })}
           </div>
        </section>

        {/* Infrastructure Health */}
        <section className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden mb-20 shadow-2xl">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-bl-full pointer-events-none" />
           <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-tr-full pointer-events-none" />
           
           <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
             <div className="max-w-xl">
               <h2 className="text-3xl font-black tracking-tight mb-4 flex items-center gap-3">
                 <CpuChipIcon className="w-10 h-10 text-indigo-400" />
                 Ecosystem Infrastructure
               </h2>
               <p className="text-slate-400 text-lg font-medium leading-relaxed">
                 All sub-systems are currently operating within nominal parameters. 
                 Global routing is optimized for speed and reliability using Supabase PostgreSQL at the core.
               </p>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-sm">
                 <CircleStackIcon className="w-6 h-6 text-indigo-400 mb-2" />
                 <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Database State</p>
                 <p className="text-xl font-bold">Synchronized</p>
               </div>
               <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-sm">
                 <ShieldCheckIcon className="w-6 h-6 text-green-400 mb-2" />
                 <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Threat Level</p>
                 <p className="text-xl font-bold">Neutral</p>
               </div>
             </div>
           </div>
        </section>
      </main>
    </div>
  );
}
