import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/auth-service";
import { supabase } from "../services/supabase-client";
import AdminHeader from "../components/AdminHeader";

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = getCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") {
       navigate("/login");
       return;
    }
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
    if (data) setSuppliers(data);
    setLoading(false);
  };

  const handleToggleVerify = async (id, status) => {
    const { error } = await supabase.from('suppliers').update({ is_verified: status }).eq('id', id);
    if (!error) fetchSuppliers();
  };

  return (
    <div className="min-h-screen bg-white">
      <AdminHeader title="Suppliers Lab" user={user} backLink="/admin/ops" />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-10">
           <h2 className="text-3xl font-black text-gray-900 mb-2">Vetting Station</h2>
           <p className="text-gray-500">Approve or suspend wholesalers in the Savannah B2B ecosystem.</p>
        </div>

        {loading ? (
             <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
             </div>
        ) : suppliers.length === 0 ? (
           <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <p className="text-gray-500 font-bold">No supplier applications found.</p>
           </div>
        ) : (
           <div className="grid gap-4">
              {suppliers.map(s => (
                 <div key={s.id} className="bg-white border border-gray-100 rounded-3xl p-6 flex items-center justify-between hover:shadow-xl hover:border-indigo-100 transition-all group">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">
                          {s.name.charAt(0)}
                       </div>
                       <div>
                          <h3 className="font-bold text-gray-900">{s.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{s.industry}</span>
                             <span className="text-xs text-gray-400">•</span>
                             <span className="text-xs font-mono text-gray-500">{s.contact_phone}</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex items-center gap-4">
                       <div className="text-right mr-4 hidden sm:block">
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">M-Pesa Setup</p>
                          <p className="text-xs font-medium text-gray-600">{s.mpesa_shortcode ? '✅ Configured' : '❌ Missing'}</p>
                       </div>

                       {s.is_verified ? (
                          <button 
                            onClick={() => handleToggleVerify(s.id, false)}
                            className="bg-red-50 text-red-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-red-600 hover:text-white transition"
                          >
                             Suspend
                          </button>
                       ) : (
                          <button 
                            onClick={() => handleToggleVerify(s.id, true)}
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
                          >
                             Verify Supplier
                          </button>
                       )}
                    </div>
                 </div>
              ))}
           </div>
        )}
      </main>
    </div>
  );
}
