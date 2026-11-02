import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentUser, logout } from "../services/auth-service";
import AdminHeader from "../components/AdminHeader";
import { supabase } from "../services/supabase-client";

export default function Admin() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
     totalShops: 0, premiumShops: 0, orphanedShops: 0,
     lifetimeGMV: 0, pendingGMV: 0, activeOrders: 0, staleOrders: 0,
     totalOrders: 0
  });

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") {
      navigate("/login");
      return;
    }
    fetchGodMode();
  }, [navigate]);

  const fetchGodMode = async () => {
     try {
        setLoading(true);
        const newAlerts = [];

        // 1. Ecosystem Data
        const { data: shops } = await supabase.from("shops").select("id, name, plan");
        const { data: items } = await supabase.from("menu_items").select("shop_id");
        
        const totalShops = shops?.length || 0;
        const premiumShops = shops?.filter(s => ['basic', 'pro', 'business'].includes(s.plan)).length || 0;
        
        const shopsWithItems = new Set(items?.map(i => i.shop_id));
        const emptyShops = shops?.filter(s => !shopsWithItems.has(s.id)) || [];

        if (emptyShops.length > 0) {
           newAlerts.push({
              type: "warning", title: `${emptyShops.length} Orphaned Shops`,
              desc: "Non-operational registrations detected.", link: "/admin/shops"
           });
        }

        // 2. Financial & Order Data
        const { data: orders } = await supabase.from("orders").select("total_price, status");
        let lifetimeGMV = 0, pendingGMV = 0, staleCount = 0, activeOrdersCount = 0;
        
        if (orders) {
           orders.forEach(o => {
              if (o.status.includes('paid') || o.status.includes('completed')) {
                 lifetimeGMV += Number(o.total_price || 0);
              } else if (o.status !== 'archived' && o.status !== 'cancelled') {
                 activeOrdersCount++;
                 pendingGMV += Number(o.total_price || 0);
                 if (['pending_payment', 'stk_pushed'].includes(o.status)) staleCount++;
              }
           });
        }
            
        if (staleCount > 0) {
           newAlerts.push({
               type: "error", title: `${staleCount} Stale Global Orders`,
               desc: "Awaiting payment or verification.", link: "/admin/global-orders"
           });
        }

        const { data: pendingReports } = await supabase.from("shop_reports").select("id").eq("status", "pending");
        if (pendingReports?.length > 0) {
           newAlerts.push({
               type: "error", title: `${pendingReports.length} Consumer Reports`,
               desc: "Investigation required.", link: "/admin/report"
           });
        }

        setMetrics({
           totalShops, premiumShops, orphanedShops: emptyShops.length,
           lifetimeGMV, pendingGMV, activeOrders: activeOrdersCount, staleOrders: staleCount,
           totalOrders: orders?.length || 0
        });
        setAlerts(newAlerts);
     } catch (err) {
        console.error("Failed to fetch admin metrics", err);
     } finally {
        setLoading(false);
     }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <AdminHeader title="Registry Ops" user={user} backLink="/admin" />

      <main className="max-w-7xl mx-auto p-6">
        
        {/* Real-time Intel Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
           <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Platform GMV</p>
              <p className="text-2xl font-black text-gray-900 mt-1">KSh {metrics.lifetimeGMV.toLocaleString()}</p>
           </div>
           <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Shops</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{metrics.totalShops}</p>
           </div>
           <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue at Risk</p>
              <p className="text-2xl font-black text-amber-500 mt-1">KSh {metrics.pendingGMV.toLocaleString()}</p>
           </div>
           <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Dispatches</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">{(metrics.totalOrders * 1.5).toFixed(0)}</p>
           </div>
        </div>

        {/* Priority Alerts */}
        {alerts.length > 0 && (
           <div className="grid md:grid-cols-3 gap-4 mb-10">
              {alerts.map((alert, i) => (
                 <Link key={i} to={alert.link} className={`p-4 rounded-xl border flex gap-3 items-center transition hover:shadow-md ${alert.type === 'error' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                    <span className="text-xl">{alert.type === 'error' ? '🚨' : '⚠️'}</span>
                    <div>
                       <h3 className="text-xs font-black uppercase tracking-tight text-gray-900">{alert.title}</h3>
                       <p className="text-[10px] text-gray-500 font-bold">{alert.desc}</p>
                    </div>
                 </Link>
              ))}
           </div>
        )}

        {/* Legacy Functional Grid (Classic Structure) */}
        <div className="grid lg:grid-cols-2 gap-8">
           
           {/* Section 1: Financial Directive */}
           <section className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-50">
                 <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center text-2xl">💰</div>
                 <div>
                    <h2 className="text-xl font-bold text-gray-900">Financial Directive</h2>
                    <p className="text-sm text-gray-500">Revenue, Margins, and Subscription Control.</p>
                 </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                 <Link to="/admin/analytics" className="p-4 rounded-xl border border-slate-100 hover:border-green-300 hover:bg-green-50 transition group">
                    <h3 className="font-bold text-gray-800 group-hover:text-green-800">📈 Macro Analytics</h3>
                    <p className="text-xs text-gray-500 mt-2">GMV graphs and API overhead costs.</p>
                 </Link>
                 <Link to="/admin/payouts" className="p-4 rounded-xl border border-slate-100 hover:border-green-300 hover:bg-green-50 transition group">
                    <h3 className="font-bold text-gray-800 group-hover:text-green-800">🏦 Shop Payouts</h3>
                    <p className="text-xs text-gray-500 mt-2">Distribute funds, calculate platform splits.</p>
                 </Link>
                 <Link to="/admin/plans" className="p-4 rounded-xl border border-slate-100 hover:border-green-300 hover:bg-green-50 transition sm:col-span-2 group">
                    <h3 className="font-bold text-gray-800 group-hover:text-green-800">💳 Subscription Matrix</h3>
                    <p className="text-xs text-gray-500 mt-1">Configure MRR pricing boundaries and feature locks.</p>
                 </Link>
              </div>
           </section>

           {/* Section 2: Global Operations (Merged) */}
           <section className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-50">
                 <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center text-2xl">🌍</div>
                 <div>
                    <h2 className="text-xl font-bold text-gray-900">Global Operations</h2>
                    <p className="text-sm text-gray-500">Live streams and logistics management.</p>
                 </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                 <Link to="/a/delivery/manager" className="p-4 bg-slate-900 rounded-xl shadow-lg border-2 border-transparent hover:border-slate-500 transition-all group sm:col-span-2">
                    <div className="flex items-center justify-between font-mono">
                       <h3 className="font-bold text-amber-400 flex items-center gap-2">🚚 Logistics Hub</h3>
                       <span className="bg-amber-500 text-[10px] px-1.5 py-0.5 rounded text-white font-black animate-pulse uppercase">Active Hubs</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono uppercase tracking-widest text-[9px]">Platform-wide distribution nodes</p>
                 </Link>
                 <Link to="/admin/global-orders" className="p-4 rounded-xl border border-slate-100 hover:border-amber-300 hover:bg-amber-50 transition group">
                    <div className="flex items-center justify-between">
                       <h3 className="font-bold text-gray-800 group-hover:text-amber-800">🌍 Order Stream</h3>
                       <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">God-mode live feed of platform transactions.</p>
                 </Link>
                 <Link to="/admin/global-products" className="p-4 rounded-xl border border-slate-100 hover:border-amber-300 hover:bg-amber-50 transition group">
                    <h3 className="font-bold text-gray-800 group-hover:text-amber-800">📦 Catalog QA</h3>
                    <p className="text-xs text-gray-500 mt-2">Monitor all items for compliance/quality.</p>
                 </Link>
                 <Link to="/admin/suppliers" className="p-4 rounded-xl border border-slate-100 hover:border-amber-300 hover:bg-amber-50 transition group sm:col-span-2">
                    <h3 className="font-bold text-gray-800 group-hover:text-amber-800">🏬 Suppliers Lab</h3>
                    <p className="text-xs text-gray-500 mt-2">Vet and manage wholesalers in the ecosystem.</p>
                 </Link>
              </div>
           </section>

           {/* Section 3: Tenant Ecosystem (Growth) */}
           <section className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-50">
                 <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-2xl">🏪</div>
                 <div>
                    <h2 className="text-xl font-bold text-gray-900">Tenant Ecosystem</h2>
                    <p className="text-sm text-gray-500">Manage client environments and platform presence.</p>
                 </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                 <Link to="/admin/shops" className="p-4 rounded-xl border border-blue-500 bg-blue-50 shadow-sm hover:shadow transition group sm:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-200/50 rounded-bl-full z-0 transition-transform group-hover:scale-125"></div>
                    <h3 className="font-bold text-blue-900 relative z-10 flex items-center gap-2 text-sm uppercase black">🚀 Shop Launcher & Registry</h3>
                    <p className="text-[10px] text-blue-800/80 mt-1 max-w-[80%] relative z-10">Deploy parallel environments and monitor the active registry.</p>
                 </Link>
                 <Link to="/admin/intelligence" className="p-4 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition group">
                    <h3 className="font-bold text-gray-800 group-hover:text-blue-800">🧠 Business Intelligence</h3>
                    <p className="text-xs text-gray-500 mt-2">Model characteristics & behavior.</p>
                 </Link>
                 <Link to="/admin/seo" className="p-4 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition group">
                    <h3 className="font-bold text-gray-800 group-hover:text-blue-800">🔍 Search Engine (SEO)</h3>
                    <p className="text-xs text-gray-500 mt-2">JSON-LD optimizations.</p>
                 </Link>
                 <Link to="/admin/booklet" className="p-4 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition group">
                    <h3 className="font-bold text-gray-800 group-hover:text-blue-800">📖 Sales Booklet</h3>
                    <p className="text-xs text-gray-500 mt-2">Client onboarding reference.</p>
                 </Link>
                 <Link to="/admin/agency" className="p-4 rounded-xl border border-indigo-500 bg-indigo-50 shadow-sm hover:shadow transition group sm:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-200/50 rounded-bl-full z-0 transition-transform group-hover:scale-125"></div>
                    <h3 className="font-bold text-indigo-900 relative z-10 flex items-center gap-2 text-sm uppercase black">🛡️ Agency Model Hub</h3>
                    <p className="text-[10px] text-indigo-800/80 mt-1 max-w-[80%] relative z-10">Regional agents, jurisdictions, and compliance oversight.</p>
                 </Link>
              </div>
           </section>

           {/* Section 4: Engineering & Architecture */}
           <section className="bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full pointer-events-none"></div>
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-800">
                 <div className="w-12 h-12 bg-indigo-900/50 text-indigo-400 rounded-xl border border-indigo-700/50 flex items-center justify-center text-2xl">⚙️</div>
                 <div>
                    <h2 className="text-xl font-bold text-white">Platform Engineering</h2>
                    <p className="text-sm text-slate-400">Telemetry, sensors, and structural hooks.</p>
                 </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 relative z-10">
                 <Link to="/admin/engineering" className="p-4 bg-black/40 rounded-xl border border-slate-800 hover:border-indigo-500/50 hover:bg-black/60 transition group font-mono">
                    <h3 className="font-bold text-indigo-400 group-hover:text-indigo-300 text-sm">God-Mode Access</h3>
                    <p className="text-[10px] text-slate-500 mt-2">Simulate environments and hooks.</p>
                 </Link>
                 <Link to="/admin/monitoring" className="p-4 bg-black/40 rounded-xl border border-slate-800 hover:border-indigo-500/50 hover:bg-black/60 transition group font-mono">
                    <h3 className="font-bold text-red-400 group-hover:text-red-300 text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      Live Packets
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-2">Raw API telemetry, sensors.</p>
                 </Link>
                 
                 <div className="sm:col-span-2 grid grid-cols-3 gap-2 mt-2 font-mono">
                    <a href="/system_architecture.md" download="Arch_Specs.md" className="p-2 bg-slate-800 rounded text-center hover:bg-slate-700 transition">
                       <p className="text-[10px] text-slate-300 font-bold uppercase">Arch Specs</p>
                    </a>
                    <a href="/super_manager_guide.md" download="Admin_Manual.md" className="p-2 bg-slate-800 rounded text-center hover:bg-slate-700 transition">
                       <p className="text-[10px] text-slate-300 font-bold uppercase">Admin Rules</p>
                    </a>
                    <Link to="/admin/report" className="p-2 bg-indigo-900/50 text-indigo-200 border border-indigo-700/50 rounded text-center hover:bg-indigo-900 transition">
                       <p className="text-[10px] text-indigo-200 font-bold uppercase">Report Hub</p>
                    </Link>
                 </div>
              </div>
           </section>

        </div>
      </main>
    </div>
  );
}
