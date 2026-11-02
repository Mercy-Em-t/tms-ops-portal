import React, { useState, useEffect } from 'react';
import AdminHeader from '../components/AdminHeader';
import { BusinessModeler } from '../components/BusinessModeler';
import { getCurrentUser } from '../services/auth-service';
import { supabase } from '../services/supabase-client';

export default function BusinessIntelligence() {
  const user = getCurrentUser();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShop() {
      // For demo/admin purposes, we fetch the first shop or a specific one
      const { data } = await supabase.from('shops').select('*').limit(1).single();
      if (data) setShop(data);
      setLoading(false);
    }
    fetchShop();
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading Intelligence Engine...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AdminHeader title="Business Intelligence" user={user} backLink="/admin/ops" />
      
      <main className="max-w-7xl mx-auto p-6 pt-24">
        <div className="mb-10">
          <h1 className="text-4xl font-black">Business Modeling Hub</h1>
          <p className="text-gray-400 mt-2">Configure high-level attributes, discovery behavior, and SEO for <strong>{shop?.name}</strong>.</p>
        </div>

        {shop && (
          <BusinessModeler 
            shopData={shop} 
            onSave={(metadata) => {
              console.log("Saving Business Intel:", metadata);
              alert("Business Intelligence Saved! (Simulated)");
            }} 
          />
        )}

        <section className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
            <h3 className="font-bold text-blue-400">Behavioral Modeling</h3>
            <p className="text-sm text-gray-400 mt-2">Define how the business responds to automated customer inquiries based on established missions.</p>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
            <h3 className="font-bold text-purple-400">Discovery Engine</h3>
            <p className="text-sm text-gray-400 mt-2">Proprietary logic handles "Where can I get this" queries by mapping keywords to service areas.</p>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
            <h3 className="font-bold text-green-400">SEO Sentinel</h3>
            <p className="text-sm text-gray-400 mt-2">Automated meta-tag generation ensures maximum visibility on search engines and social feeds.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
