import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase-client";
import { getCurrentUser } from "../services/auth-service";

export default function AdminGlobalProducts() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") {
      navigate("/login");
      return;
    }
    fetchGlobalProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchGlobalProducts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("menu_items")
        .select(`
          id,
          name,
          category,
          price,
          created_at,
          shop_id,
          shops (
            name,
            subdomain
          )
        `)
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Failed to fetch global products:", err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ["all", ...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(p => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      (p.name?.toLowerCase().includes(s)) ||
      (p.shops?.name?.toLowerCase().includes(s)) ||
      (p.shops?.subdomain?.toLowerCase().includes(s));
    
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-gray-900 shadow-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Link to="/admin" className="text-gray-400 hover:text-white transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
             </Link>
             <h1 className="text-xl font-bold text-white flex items-center gap-2">
                📦 Global Product Catalog 
             </h1>
          </div>
          <button onClick={fetchGlobalProducts} className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 transition flex items-center gap-2 cursor-pointer">
             <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
             Refresh
          </button>
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
                placeholder="Search Product, Shop, Subdomain..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-green-500 focus:border-green-500 transition"
              />
           </div>
           
           <select 
             value={categoryFilter}
             onChange={(e) => setCategoryFilter(e.target.value)}
             className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full md:w-48 p-2 outline-none capitalize"
           >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
           </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-gray-500">
               <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                 <tr>
                   <th scope="col" className="px-6 py-4 font-bold">Added On</th>
                   <th scope="col" className="px-6 py-4 font-bold">Shop</th>
                   <th scope="col" className="px-6 py-4 font-bold">Item Name</th>
                   <th scope="col" className="px-6 py-4 font-bold">Category</th>
                   <th scope="col" className="px-6 py-4 font-bold">Price</th>
                   <th scope="col" className="px-6 py-4 font-bold">Status</th>
                 </tr>
               </thead>
               <tbody>
                 {loading && filteredProducts.length === 0 ? (
                   <tr>
                     <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                        <div className="flex justify-center mb-2">
                           <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></span>
                        </div>
                        Loading catalog indices...
                     </td>
                   </tr>
                 ) : filteredProducts.length === 0 ? (
                   <tr>
                     <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                       No products matching your search criteria.
                     </td>
                   </tr>
                 ) : (
                   filteredProducts.map((p) => (
                     <tr key={p.id} className="bg-white border-b border-gray-100 hover:bg-gray-50/50 transition">
                       <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                          {new Date(p.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                       </td>
                       <td className="px-6 py-4">
                         <div className="font-bold text-gray-900">{p.shops?.name || "Unknown Shop"}</div>
                         <div className="text-xs text-gray-400 font-mono">{p.shops?.subdomain || p.shop_id.slice(0,8)}</div>
                       </td>
                       <td className="px-6 py-4 font-medium text-gray-800">
                         {p.name}
                       </td>
                       <td className="px-6 py-4">
                         <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{p.category}</span>
                       </td>
                       <td className="px-6 py-4 font-bold text-gray-900">
                          KSh {p.price.toLocaleString()}
                       </td>
                       <td className="px-6 py-4">
                          <span className="flex items-center gap-1 text-green-600 font-medium text-xs"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Available</span>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
           {!loading && filteredProducts.length > 0 && (
              <div className="bg-gray-50 border-t border-gray-200 p-4 text-center text-xs text-gray-500">
                 Showing matching index results from latest 300 platform products 
              </div>
           )}
        </div>
      </main>
    </div>
  );
}
