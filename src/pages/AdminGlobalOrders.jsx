import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase-client";
import { getCurrentUser } from "../services/auth-service";

export default function AdminGlobalOrders() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") {
      navigate("/login");
      return;
    }
    fetchGlobalOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchGlobalOrders = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          shop_id,
          total_price,
          status,
          created_at,
          client_name,
          client_phone,
          shops (
            name,
            subdomain
          )
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Failed to fetch global orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      (o.shops?.name?.toLowerCase().includes(s)) ||
      (o.shops?.subdomain?.toLowerCase().includes(s)) ||
      (o.client_name?.toLowerCase().includes(s)) ||
      (o.client_phone?.includes(s)) ||
      (o.id.toLowerCase().includes(s));
    
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    if (!filteredOrders || filteredOrders.length === 0) return;
    
    const headers = ["Order ID", "Shop Name", "Shop Subdomain", "Total (KSh)", "Customer Name", "Customer Phone", "Status", "Date Created"];
    
    const rows = filteredOrders.map(o => [
      o.id,
      o.shops?.name || "Unknown",
      o.shops?.subdomain || "",
      o.total_price,
      o.client_name || "Anonymous",
      o.client_phone || "",
      o.status,
      new Date(o.created_at).toLocaleString()
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ShopQR_Global_Orders_Filtered_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                🌍 Global Order Stream
             </h1>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={exportToCSV} disabled={loading || filteredOrders.length === 0} className="text-sm bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Export Filtered
             </button>
             <button onClick={fetchGlobalOrders} className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 transition flex items-center gap-2 cursor-pointer">
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Refresh
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
           <div className="relative flex-1 w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Shop, Customer, Subdomain..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              />
           </div>
           
           <select 
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
             className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full md:w-48 p-2 outline-none"
           >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="completed">Completed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="cancelled">Cancelled</option>
              <option value="archived">Archived</option>
           </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-gray-500">
               <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                 <tr>
                   <th scope="col" className="px-6 py-4 font-bold">Time</th>
                   <th scope="col" className="px-6 py-4 font-bold">Shop</th>
                   <th scope="col" className="px-6 py-4 font-bold">Order ID</th>
                   <th scope="col" className="px-6 py-4 font-bold">Customer</th>
                   <th scope="col" className="px-6 py-4 font-bold">Amount</th>
                   <th scope="col" className="px-6 py-4 font-bold">Status</th>
                 </tr>
               </thead>
               <tbody>
                 {loading && filteredOrders.length === 0 ? (
                   <tr>
                     <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                        <div className="flex justify-center mb-2">
                           <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></span>
                        </div>
                        Tapping into global stream...
                     </td>
                   </tr>
                 ) : filteredOrders.length === 0 ? (
                   <tr>
                     <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                       No orders found matching your criteria.
                     </td>
                   </tr>
                 ) : (
                   filteredOrders.map((o) => (
                     <tr key={o.id} className="bg-white border-b border-gray-100 hover:bg-gray-50/50 transition">
                       <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                          {new Date(o.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                       </td>
                       <td className="px-6 py-4">
                         <div className="font-bold text-gray-900">{o.shops?.name || "Unknown Shop"}</div>
                         <div className="text-xs text-gray-400 font-mono">{o.shops?.subdomain || o.shop_id.slice(0,8)}</div>
                       </td>
                       <td className="px-6 py-4 font-mono text-xs text-gray-500">
                         {o.id.split("-")[0].toUpperCase()}
                       </td>
                       <td className="px-6 py-4">
                         <div className="font-medium text-gray-800">{o.client_name || 'Anonymous'}</div>
                         <div className="text-xs text-gray-400">{o.client_phone || 'No Phone provided'}</div>
                       </td>
                       <td className="px-6 py-4 font-bold text-gray-900">
                          KSh {o.total_price?.toLocaleString()}
                       </td>
                       <td className="px-6 py-4">
                         <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${
                            o.status.includes('paid') || o.status.includes('completed') 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : o.status.includes('archived') || o.status.includes('cancelled')
                              ? 'bg-gray-100 text-gray-600 border-gray-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                         }`}>
                           {o.status.replace('_', ' ')}
                         </span>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
           {!loading && filteredOrders.length > 0 && (
              <div className="bg-gray-50 border-t border-gray-200 p-4 text-center text-xs text-gray-500">
                 Showing matching orders from latest 200 global records
              </div>
           )}
        </div>
      </main>
    </div>
  );
}
