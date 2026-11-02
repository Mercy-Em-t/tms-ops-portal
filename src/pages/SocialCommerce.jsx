import React, { useState, useEffect } from 'react';
import ShoppableImage from '../components/ShoppableImage';
import AdminHeader from '../components/AdminHeader';
import { getCurrentUser } from '../services/auth-service';
import { supabase } from '../services/supabase-client';

export default function SocialCommerce() {
  const user = getCurrentUser();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDemoProducts() {
      const { data } = await supabase.from('menu_items').select('id, name, price, image_url').limit(3);
      setProducts(data || []);
      setLoading(false);
    }
    fetchDemoProducts();
  }, []);

  const demoTags = products.length > 0 ? [
    { x: 30, y: 40, product: products[0] },
    { x: 70, y: 60, product: products[1] || products[0] },
    { x: 50, y: 30, product: products[2] || products[0] }
  ] : [];

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Initializing Commerce Engine...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AdminHeader title="Social Commerce" user={user} backLink="/admin/ops" />
      
      <main className="max-w-7xl mx-auto p-6 pt-24 text-center">
        <div className="mb-12">
          <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-amber-400 bg-clip-text text-transparent">
            IG-Ready Shoppable Tags
          </h1>
          <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
            Transform your social media photography into a frictionless store. Tag products on your images and capture customers directly from Instagram.
          </p>
        </div>

        <div className="flex justify-center">
          <ShoppableImage 
            imageUrl="/shoppable_lifestyle_demo.png" 
            tags={demoTags} 
          />
        </div>

        <section className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-8 bg-white/5 border border-white/10 rounded-3xl group hover:bg-white/10 transition-all">
            <div className="text-3xl mb-4">📸</div>
            <h3 className="font-bold text-lg">Direct In-Feed Tags</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Customers click hotspots within the photo to reveal price and product details without leaving the content stream.
            </p>
          </div>
          <div className="p-8 bg-white/5 border border-white/10 rounded-3xl group hover:bg-white/10 transition-all">
            <div className="text-3xl mb-4">🔗</div>
            <h3 className="font-bold text-lg">IG Deep Linking</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Generate links for IG Stories that pre-populate the cart and trigger an automated "Complete Order" DM.
            </p>
          </div>
          <div className="p-8 bg-white/5 border border-white/10 rounded-3xl group hover:bg-white/10 transition-all">
            <div className="text-3xl mb-4">💬</div>
            <h3 className="font-bold text-lg">Automated DMs</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Sync with WhatsApp Business or IG DMs to notify operators whenever a shoppable tag is clicked.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
