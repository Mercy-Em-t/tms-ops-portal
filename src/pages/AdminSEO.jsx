import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/auth-service";
import { supabase } from "../services/supabase-client";
import { getAllMetadataConfigs } from "../services/seo-service";
import GoogleListingModal from "../components/GoogleListingModal";

export default function AdminSEO() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(true);
  
  const [configs, setConfigs] = useState([]);
  const [shops, setShops] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState({ type: null, id: null, name: "" });

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") {
      navigate("/login");
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    
    // Fetch all existing SEO configs
    const existingConfigs = await getAllMetadataConfigs();
    setConfigs(existingConfigs);
    
    // Fetch all active shops to allow the admin to select a shop that doesn't have SEO yet
    const { data: allShops } = await supabase.from('shops').select('id, name');
    setShops(allShops || []);
    
    setLoading(false);
  };

  const handleOpenModal = (type, id = null, name = "") => {
    setModalTarget({ type, id, name });
    setIsModalOpen(true);
  };

  const handleCloseModal = (didUpdate) => {
    setIsModalOpen(false);
    if (didUpdate) {
      loadData();
    }
  };

  // Helper to check if a shop already has configured metadata
  const hasConfig = (targetType, targetId) => {
    return configs.some(c => c.target_type === targetType && c.target_id === targetId);
  };
  
  const platformConfig = configs.find(c => c.target_type === 'platform');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Link to="/admin" className="text-gray-400 hover:text-gray-600">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
             </Link>
             <h1 className="text-xl font-bold text-gray-800">Global SEO Center</h1>
          </div>
          <button
             onClick={() => { logout(); navigate("/login"); }}
             className="text-sm font-bold text-red-500 hover:text-red-700 transition"
          >
             Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {loading ? (
           <div className="text-center py-12 text-gray-500">Loading Configuration Engine...</div>
        ) : (
          <>
            {/* PLATFORM METADATA */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
                  <div>
                    <h2 className="text-lg font-bold">Platform Discovery</h2>
                    <p className="text-blue-100 text-sm">Control how your master platform appears on Google.</p>
                  </div>
                  <button 
                     onClick={() => handleOpenModal('platform', null, 'The Modern Savannah')}
                     className="bg-white text-blue-600 font-bold px-4 py-2 rounded-lg text-sm hover:shadow-md transition"
                  >
                     {platformConfig ? "Edit Schema" : "Setup Schema"}
                  </button>
               </div>
               {platformConfig && (
                   <div className="p-6 bg-gray-50 border-t border-blue-100">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">Live</span>
                        <span className="text-sm text-gray-500">Injecting on / route</span>
                      </div>
                      <p className="text-gray-700 font-medium">{platformConfig.json_ld.name}</p>
                      <p className="text-sm text-gray-500 max-w-lg mt-1 truncate">{platformConfig.json_ld.description}</p>
                   </div>
               )}
            </section>

            {/* SHOP METADATA */}
            <section>
               <h2 className="text-xl font-bold text-gray-800 mb-4">Shop Directory SEO</h2>
               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                  {shops.length === 0 ? (
                     <div className="p-8 text-center text-gray-500">No shops registered on the platform yet.</div>
                  ) : (
                     shops.map(shop => {
                        const isConfigured = hasConfig('shop', shop.id);
                        return (
                           <div key={shop.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition">
                              <div>
                                 <h3 className="font-bold text-gray-800 text-lg">{shop.name}</h3>
                                 <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                    Status: 
                                    {isConfigured ? (
                                       <span className="text-green-600 font-medium flex items-center gap-1">
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                                          Schema Active
                                       </span>
                                    ) : (
                                       <span className="text-amber-500 font-medium">Auto-generated Fallback</span>
                                    )}
                                 </p>
                              </div>
                              <button
                                 onClick={() => handleOpenModal('shop', shop.id, shop.name)}
                                 className={`px-4 py-2 font-medium rounded-xl border text-sm transition ${isConfigured ? 'border-gray-200 text-gray-700 hover:bg-gray-100' : 'border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'}`}
                              >
                                 {isConfigured ? "Manage Listing" : "Enhance SEO"}
                              </button>
                           </div>
                        );
                     })
                  )}
               </div>
            </section>
          </>
        )}
      </main>

      <GoogleListingModal 
         isOpen={isModalOpen}
         onClose={handleCloseModal}
         targetType={modalTarget.type}
         targetId={modalTarget.id}
         targetName={modalTarget.name}
      />
    </div>
  );
}
