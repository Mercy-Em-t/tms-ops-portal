import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase-client";
import { getCurrentUser } from "../services/auth-service";

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [stats, setStats] = useState({
     totalShops: 0,
     activeOrders: 0,
     totalGMV: 0,
     pendingGMV: 0,
     totalOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") {
      navigate("/login");
      return;
    }
    fetchGlobalStats();
  }, [user?.email, navigate]);

  const fetchGlobalStats = async () => {
    try {
      setLoading(true);
      
      // 1. Total Shops
      const { count: shopCount } = await supabase
        .from("shops")
        .select('*', { count: 'exact', head: true });

      // 2. Global Orders Aggregation
      const { data: allOrders, error } = await supabase
        .from("orders")
        .select("total_price, status")
        .limit(99999);

      if (error) throw error;

      let activeOrdersCount = 0;
      let totalCompletedVolume = 0;
      let totalPendingVolume = 0;

      if (allOrders) {
         allOrders.forEach(o => {
            if (o.status.includes('paid') || o.status.includes('completed')) {
               totalCompletedVolume += Number(o.total_price || 0);
            } else if (o.status !== 'archived' && o.status !== 'cancelled') {
               activeOrdersCount++;
               totalPendingVolume += Number(o.total_price || 0);
            }
         });
      }

      setStats({
         totalShops: shopCount || 0,
         activeOrders: activeOrdersCount,
         totalGMV: totalCompletedVolume,
         pendingGMV: totalPendingVolume,
         totalOrders: allOrders?.length || 0
      });

    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-gray-900 shadow-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Link to="/admin" className="text-gray-400 hover:text-white transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
             </Link>
             <h1 className="text-xl font-bold text-white flex items-center gap-2">
                📈 Aggregated Analytics
             </h1>
          </div>
          <button onClick={fetchGlobalStats} className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 transition flex items-center gap-2">
             <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
             Refresh
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
         <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full"></div>
               <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total Tenants</h3>
               {loading ? (
                  <div className="h-10 bg-gray-100 rounded w-16 animate-pulse"></div>
               ) : (
                  <div className="text-4xl font-black text-gray-900">{stats.totalShops}</div>
               )}
               <p className="text-xs text-gray-400 mt-2">Active shops on the platform</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full"></div>
               <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-2">Active Pending Orders</h3>
               {loading ? (
                  <div className="h-10 bg-gray-100 rounded w-16 animate-pulse"></div>
               ) : (
                  <div className="text-4xl font-black text-amber-700">{stats.activeOrders}</div>
               )}
               <p className="text-xs text-amber-600/60 mt-2">Currently awaiting fulfillment</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden lg:col-span-2 shadow-xl ring-1 ring-green-900/5">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600"></div>
               <h3 className="text-sm font-bold text-green-700 uppercase tracking-wider mb-2">Lifetime Platform GMV</h3>
               {loading ? (
                  <div className="h-12 bg-gray-100 rounded w-48 animate-pulse"></div>
               ) : (
                  <div className="text-5xl font-black text-gray-900 tracking-tight">
                     <span className="text-2xl text-green-500 mr-2">KSh</span>
                     {stats.totalGMV.toLocaleString()}
                  </div>
               )}
               <p className="text-sm text-gray-500 mt-3 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Plus <strong className="text-gray-800">KSh {stats.pendingGMV.toLocaleString()}</strong> in uncaptured volume
               </p>
            </div>

            {/* WhatsApp API Financials */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 border border-green-200 shadow-sm relative overflow-hidden lg:col-span-4 mt-4">
               <div className="absolute -right-4 -bottom-4 opacity-10">
                  <svg className="w-48 h-48 text-green-700" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
               </div>
               
               <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="bg-green-500 p-2 rounded-lg text-white">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                  </div>
                  <h3 className="text-lg font-bold text-green-900">WhatsApp Cloud API Financials</h3>
               </div>

               <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                  <div>
                     <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-1">Message Volume</p>
                     {loading ? <div className="h-8 bg-green-200/50 rounded w-16 animate-pulse"></div> : (
                        <p className="text-3xl font-black text-green-900">
                           {stats.totalOrders > 0 ? (stats.totalOrders * 1.5).toFixed(0) : 0} <span className="text-sm font-medium text-green-700/80">est. msg</span>
                        </p>
                     )}
                  </div>
                  
                  <div>
                     <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-1">Estimated API Cost</p>
                     {loading ? <div className="h-8 bg-green-200/50 rounded w-24 animate-pulse"></div> : (
                        <p className="text-3xl font-black text-green-900">
                           <span className="text-lg text-green-700 mr-1">KSh</span>
                           {stats.totalOrders > 0 ? (stats.totalOrders * 1.5 * 2).toLocaleString() : 0}
                        </p>
                     )}
                     <p className="text-[10px] text-green-700 mt-1 font-medium">Model: 2 KSh per session</p>
                  </div>
                  
                  <div>
                     <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-1">API Cost Ratio</p>
                     {loading ? <div className="h-8 bg-green-200/50 rounded w-16 animate-pulse"></div> : (
                        <p className="text-3xl font-black text-green-900">
                           {stats.totalGMV > 0 && stats.totalOrders > 0 
                              ? (((stats.totalOrders * 1.5 * 2) / stats.totalGMV) * 100).toFixed(2) 
                              : "0.00"}%
                        </p>
                     )}
                     <p className="text-[10px] text-green-700 mt-1 font-medium">% of Lifetime GMV</p>
                  </div>

                  <div>
                     <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-1">Status</p>
                     <div className="mt-2 inline-flex items-center gap-2 bg-green-200/50 px-3 py-1.5 rounded-lg border border-green-300">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-sm font-bold text-green-900">Sustainable</span>
                     </div>
                  </div>
               </div>
            </div>

         </div>
      </main>
    </div>
  );
}
