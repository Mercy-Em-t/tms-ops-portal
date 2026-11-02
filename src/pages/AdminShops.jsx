import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase-client";
import { getCurrentUser, logout } from "../services/auth-service";
import AdminHeader from "../components/AdminHeader";

export default function AdminShops() {
  const [shops, setShops] = useState([]);
  const [upgradeRequests, setUpgradeRequests] = useState([]);
  const [kycRequests, setKycRequests] = useState([]);
  const [onboardingRequests, setOnboardingRequests] = useState([]);
  const [marketplacePending, setMarketplacePending] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newShopName, setNewShopName] = useState("");
  const [newShopSubdomain, setNewShopSubdomain] = useState("");
  const [newShopPhone, setNewShopPhone] = useState("");
  const [newShopWhatsApp, setNewShopWhatsApp] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newShopIndustry, setNewShopIndustry] = useState("");
  const [industryTypes, setIndustryTypes] = useState([]);
  
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeLauncherTab, setActiveLauncherTab] = useState("shop");
  
  const [selectedShop, setSelectedShop] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSubdomain, setEditSubdomain] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [editSlug, setEditSlug] = useState("");

  // Community State
  const [newCommunityName, setNewCommunityName] = useState("");
  const [newCommunitySlug, setNewCommunitySlug] = useState("");
  const [newCommunityDesc, setNewCommunityDesc] = useState("");

  // Supplier State
  const [newSupName, setNewSupName] = useState("");
  const [newSupIndustry, setNewSupIndustry] = useState("retail");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [newSupEmail, setNewSupEmail] = useState("");
  const [newSupMpesa, setNewSupMpesa] = useState("");
  const [newSupPasskey, setNewSupPasskey] = useState("");

  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") {
      navigate("/login");
      return;
    }
    fetchShops();
  }, [navigate]);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const { data: shopsData, error: shopsErr } = await supabase
        .from("shops")
        .select(`*, id:shop_id, shop_users (email, role), shop_members (role, profiles (display_name, phone))`)
        .order("created_at", { ascending: false });
      if (shopsData) setShops(shopsData);

      const { data: reqData } = await supabase
        .from("upgrade_requests")
        .select(`*, shops (name)`)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (reqData) setUpgradeRequests(reqData);

      const { data: kycData } = await supabase
        .from("shop_kyc")
        .select(`*, shops (name)`)
        .eq("verification_status", "pending")
        .order("submitted_at", { ascending: false });
      if (kycData) setKycRequests(kycData);

      const { data: onbData } = await supabase
        .from("onboarding_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (onbData) setOnboardingRequests(onbData);
      
      const { data: indData } = await supabase
        .from("industry_types")
        .select("*")
        .order("created_at", { ascending: true });
      if (indData) {
         setIndustryTypes(indData);
         if (indData.length > 0 && !newShopIndustry) setNewShopIndustry(indData[0].slug);
      }

      const { data: mktData } = await supabase
        .from('shops')
        .select('id:shop_id, name, subdomain, industry_type, plan, created_at, shop_users(email), shop_members(role, profiles(display_name))')
        .eq('marketplace_status', 'pending_review')
        .order('created_at', { ascending: false });
      if (mktData) setMarketplacePending(mktData);
    } catch (err) {
      console.error("Fetch shops failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShop = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const { data: authData } = await supabase.auth.getSession();
      const adminToken = authData?.session?.access_token || "mock-admin-token-for-admin@tmsavannah.com";

      const response = await fetch("/api/admin/create-shop", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            adminToken,
            shopName: newShopName,
            subdomain: newShopSubdomain,
            phone: newShopPhone,
            whatsapp: newShopWhatsApp,
            industry: newShopIndustry,
            ownerEmail: newAdminEmail
         })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Deployment failed.");

      alert(`✅ Success! Sandbox Space Deployed.\n\nTemporary Credentials for ${newAdminEmail}:\n\nPassword: ${resData.tempPassword}`);
      setNewShopName(""); setNewShopSubdomain(""); setNewShopPhone(""); setNewAdminEmail("");
      fetchShops();
    } catch (err) {
      alert("Deployment failed: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleProcessUpgrade = async (reqId, shopId, approved) => {
    try {
      const { data: authData } = await supabase.auth.getSession();
      const adminToken = authData?.session?.access_token || "mock-admin-token-for-admin@tmsavannah.com";
      const response = await fetch("/api/admin/process-upgrade", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminToken, requestId: reqId, shopId, approved })
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error);
      alert(resData.message); fetchShops();
    } catch (err) { alert("Error: " + err.message); }
  };

  const handleProcessKYC = async (kycId, approved) => {
    try {
      const { data: authData } = await supabase.auth.getSession();
      const adminToken = authData?.session?.access_token || "mock-admin-token-for-admin@tmsavannah.com";
      const response = await fetch("/api/admin/process-kyc", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminToken, kycId, approved })
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error);
      alert(resData.message); fetchShops();
    } catch (err) { alert("Error: " + err.message); }
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault(); setIsCreating(true);
    try {
      const { data: authData } = await supabase.auth.getSession();
      const adminToken = authData?.session?.access_token || "mock-admin-token-for-admin@tmsavannah.com";
      const response = await fetch("/api/admin/create-community", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminToken, name: newCommunityName, slug: newCommunitySlug, description: newCommunityDesc })
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error);
      alert(resData.message); setNewCommunityName(""); setNewCommunitySlug(""); setNewCommunityDesc(""); fetchShops();
    } catch (err) { alert("Error: " + err.message); } finally { setIsCreating(false); }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault(); setIsCreating(true);
    try {
      const { data: authData } = await supabase.auth.getSession();
      const adminToken = authData?.session?.access_token || "mock-admin-token-for-admin@tmsavannah.com";
      const response = await fetch("/api/admin/create-supplier", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminToken, name: newSupName, industry: newSupIndustry, phone: newSupPhone, email: newSupEmail, mpesaShortcode: newSupMpesa, mpesaPasskey: newSupPasskey })
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error);
      alert(`✅ Success! Wholesaler Registered.\n\nTemp Password for ${newSupEmail}: ${resData.tempPassword}`);
      setNewSupName(""); setNewSupPhone(""); setNewSupEmail(""); fetchShops();
    } catch (err) { alert("Error: " + err.message); } finally { setIsCreating(false); }
  };

  const handleToggleSuspension = async (shopId, currentStatus) => {
    try {
      const { data: authData } = await supabase.auth.getSession();
      const adminToken = authData?.session?.access_token || "mock-admin-token-for-admin@tmsavannah.com";
      const response = await fetch("/api/admin/update-shop-metadata", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminToken, shopId, isSuspended: !currentStatus })
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error);
      alert(resData.message); fetchShops();
    } catch (err) { alert("Error: " + err.message); }
  };

  const handleProcessMarketplace = async (shopId, status) => {
    try {
      const { data: authData } = await supabase.auth.getSession();
      const adminToken = authData?.session?.access_token || "mock-admin-token-for-admin@tmsavannah.com";
      const response = await fetch("/api/admin/process-marketplace-listing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminToken, shopId, status })
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error);
      alert(resData.message); fetchShops();
    } catch (err) { alert("Error: " + err.message); }
  };

  const openEditModal = (shop) => {
    setSelectedShop(shop);
    setEditName(shop.name);
    setEditPhone(shop.phone || "");
    setEditSubdomain(shop.subdomain || "");
    setEditPlan(shop.plan || "free");
    setEditSlug(shop.slug || "");
    setShowEditModal(true);
  };

  const handleUpdateMetadata = async (e) => {
    if (e) e.preventDefault(); 
    if (isUpdating) return; // Debounce
    setIsUpdating(true);
    try {
      if (editPhone && editPhone.length < 9) {
        alert("Please enter a valid contact phone number.");
        setIsUpdating(false);
        return;
      }

      const { data: authData } = await supabase.auth.getSession();
      const adminToken = authData?.session?.access_token || "mock-admin-token-for-admin@tmsavannah.com";
      const response = await fetch("/api/admin/update-shop-metadata", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          adminToken, 
          shopId: selectedShop?.id || e, // Overloaded for quick change
          name: editName || undefined, 
          phone: editPhone || undefined, 
          subdomain: editSubdomain || undefined,
          slug: editSlug || undefined,
          plan: editPlan 
        })
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error);
      alert(resData.message); 
      setShowEditModal(false); 
      fetchShops();
    } catch (err) { alert("Error: " + err.message); } finally { setIsUpdating(false); }
  };

  const handleQuickPlanChange = async (shopId, newPlan) => {
     if (!window.confirm(`Are you sure you want to change this shop to the ${newPlan.toUpperCase()} tier?`)) return;
     
     setIsUpdating(true);
     try {
        const { data: authData } = await supabase.auth.getSession();
        const adminToken = authData?.session?.access_token || "mock-admin-token-for-admin@tmsavannah.com";
        const response = await fetch("/api/admin/update-shop-metadata", {
           method: "POST", 
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ 
             adminToken, 
             shopId, 
             plan: newPlan,
             // Explicitly passing undefined for others so they aren't cleared
             name: undefined,
             subdomain: undefined,
             phone: undefined
           })
        });
        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error);
        fetchShops();
     } catch (err) { alert("Plan Change Failed: " + err.message); } finally { setIsUpdating(false); }
  };

  const handleArchiveOnboarding = async (id) => {
     const { error } = await supabase.from("onboarding_requests").update({ status: "archived" }).eq("id", id);
     if (error) alert("Failed to archive: " + error.message);
     else fetchShops();
  };

  const prefillFromOnboarding = (req) => {
     setNewShopName(req.shop_name); setNewShopPhone(req.phone); setNewAdminEmail(req.email);
     setNewShopIndustry(req.industry || "retail"); setActiveLauncherTab("shop");
     window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AdminHeader title="Global Infrastructure" user={user} backLink="/admin/ops" />

      <main className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-[3fr_2fr] gap-8">
        <div className="flex flex-col gap-8">
           {onboardingRequests.length > 0 && (
              <section className="bg-green-50 rounded-xl p-6 border border-green-200">
                 <h2 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">Join Requests: Onboarding Feed</h2>
                 <div className="space-y-3">
                    {onboardingRequests.map(req => (
                       <div key={req.id} className="bg-white rounded-lg p-4 shadow-sm border border-green-100 flex justify-between items-center">
                          <div><p className="font-bold text-gray-900">{req.shop_name}</p><p className="text-xs text-gray-500">{req.email} · {req.phone}</p></div>
                          <div className="flex gap-2">
                             <button onClick={() => handleArchiveOnboarding(req.id)} className="px-3 py-1.5 bg-gray-50 text-gray-400 font-bold text-xs rounded-md">Archive</button>
                             <button onClick={() => prefillFromOnboarding(req)} className="px-3 py-1.5 bg-green-600 text-white font-bold text-xs rounded-md">Load to Launcher</button>
                          </div>
                       </div>
                    ))}
                 </div>
              </section>
           )}

           {upgradeRequests.length > 0 && (
              <section className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                 <h2 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">Action Required: Upgrade Requests</h2>
                 <div className="space-y-3">
                    {upgradeRequests.map(req => (
                       <div key={req.id} className="bg-white rounded-lg p-4 shadow-sm border border-orange-100 flex justify-between items-center">
                          <div><p className="font-bold text-gray-800">{req.shops?.name}</p><p className="text-xs text-gray-500">{req.requested_tier.toUpperCase()} tier</p></div>
                          <div className="flex gap-2">
                             <button onClick={() => handleProcessUpgrade(req.id, req.shop_id, false)} className="px-3 py-1.5 bg-red-50 text-red-600 font-bold text-xs rounded-md">Reject</button>
                             <button onClick={() => handleProcessUpgrade(req.id, req.shop_id, true)} className="px-3 py-1.5 bg-green-500 text-white font-bold text-xs rounded-md">Approve</button>
                          </div>
                       </div>
                    ))}
                 </div>
              </section>
           )}

           {kycRequests.length > 0 && (
              <section className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                 <h2 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">Compliance Required: KYC Profiles</h2>
                 <div className="space-y-3">
                    {kycRequests.map(req => (
                       <div key={req.id} className="bg-white rounded-lg p-4 shadow-sm border border-blue-100 flex justify-between items-center">
                          <div><p className="font-bold text-gray-800">{req.legal_business_name}</p><p className="text-xs text-gray-500">{req.business_type} · {req.owner_full_name}</p></div>
                          <div className="flex gap-2">
                             <button onClick={() => handleProcessKYC(req.id, false)} className="px-3 py-1.5 bg-red-50 text-red-600 font-bold text-xs rounded-md">Reject</button>
                             <button onClick={() => handleProcessKYC(req.id, true)} className="px-3 py-1.5 bg-green-500 text-white font-bold text-xs rounded-md">Approve</button>
                          </div>
                       </div>
                    ))}
                 </div>
              </section>
           )}

           {marketplacePending.length > 0 && (
              <section className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                 <h2 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">Discovery Required: Marketplace Listings</h2>
                 <div className="space-y-3">
                    {marketplacePending.map(shop => (
                       <div key={shop.id} className="bg-white rounded-lg p-4 shadow-sm border border-purple-100 flex justify-between items-center">
                          <div><p className="font-bold text-gray-800">{shop.name}</p><p className="text-xs text-gray-500">{shop.subdomain}.tmsavannah.com</p></div>
                          <div className="flex gap-2">
                             <button onClick={() => handleProcessMarketplace(shop.id, 'rejected')} className="px-3 py-1.5 bg-red-50 text-red-600 font-bold text-xs rounded-md">Reject</button>
                             <button onClick={() => handleProcessMarketplace(shop.id, 'approved')} className="px-3 py-1.5 bg-purple-600 text-white font-bold text-xs rounded-md">Approve</button>
                          </div>
                       </div>
                    ))}
                 </div>
              </section>
           )}

           <section>
              <h2 className="text-lg font-bold text-gray-800 mb-4">Active Shop Ecosystem</h2>
              {loading ? <p className="text-gray-500 py-4">Polling regional nodes...</p> : (
                 <div className="space-y-4">
                    {shops.map(shop => (
                       <div key={shop.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                             <div>
                                <h3 className="text-lg font-bold text-gray-900">{shop.name}</h3>
                                <p className="text-xs text-gray-400 font-mono">
                                  Slug: <span className="text-indigo-600 font-bold">{shop.slug}</span> · Subdomain: {shop.subdomain}.tmsavannah.com
                                </p>
                                <div className="flex gap-2 items-center mt-1">
                                  {shop.is_suspended && <span className="bg-red-100 text-red-800 font-black px-2 py-0.5 rounded text-[10px] uppercase">FROZEN</span>}
                                  {(shop.mpesa_shortcode && shop.mpesa_passkey) 
                                     ? <span className="bg-green-100 text-green-800 font-black px-2 py-0.5 rounded text-[10px] uppercase">M-PESA: READY</span>
                                     : <span className="bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded text-[10px] uppercase">M-PESA: MISSING</span>}
                                </div>
                             </div>
                             <div className="flex flex-col items-end gap-1">
                                <select 
                                   defaultValue={shop.plan} 
                                   onChange={(e) => handleQuickPlanChange(shop.id, e.target.value)}
                                   disabled={isUpdating}
                                   className="bg-indigo-50 text-indigo-800 font-black px-3 py-1.5 rounded-full text-[10px] uppercase border-none outline-none cursor-pointer hover:bg-indigo-100 transition-colors appearance-none text-center"
                                >
                                   <option value="free">FREE Tier</option>
                                   <option value="basic">BASIC Tier</option>
                                   <option value="pro">PRO Tier</option>
                                   <option value="business">BUSINESS Tier</option>
                                </select>
                             </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 text-sm border border-blue-50">
                             <div className="flex justify-between items-start mb-2">
                                <p className="font-bold text-gray-800 text-xs">Administrative Control Panel:</p>
                                <div className="flex gap-2">
                                   <button onClick={() => openEditModal(shop)} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Surgical Edit</button>
                                   <button onClick={() => handleToggleSuspension(shop.id, shop.is_suspended)} className={`text-[10px] font-black uppercase ${shop.is_suspended ? 'text-green-600' : 'text-red-600'}`}>{shop.is_suspended ? 'Thaw Store' : 'Freeze Store'}</button>
                                </div>
                             </div>
                             {shop.shop_users?.map((su, idx) => (
                                 <p key={`su-${idx}`} className="text-gray-600 text-xs flex justify-between">
                                    <span>{su.email}</span>
                                    <span className="bg-blue-100 text-blue-800 px-1.5 rounded uppercase">{su.role}</span>
                                 </p>
                              ))}
                              {shop.shop_members?.map((sm, idx) => (
                                 <p key={`sm-${idx}`} className="text-indigo-600/90 text-xs font-medium flex justify-between mt-1 pt-1 border-t border-indigo-50/50">
                                    <span>{sm.profiles?.display_name || "V2 Member"} {sm.profiles?.phone && `(${sm.profiles.phone})`}</span>
                                    <span className="bg-emerald-100 text-emerald-800 px-1.5 rounded text-[10px] font-bold uppercase">{sm.role}</span>
                                 </p>
                              ))}
                          </div>
                       </div>
                    ))}
                 </div>
              )}
           </section>
        </div>

        <aside className="sticky top-24">
           <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100 bg-gray-50/50">
                 {['shop', 'community', 'supplier'].map(tab => (
                    <button key={tab} onClick={() => setActiveLauncherTab(tab)} className={`flex-1 py-4 text-[10px] font-black uppercase transition-all ${activeLauncherTab === tab ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}>{tab}</button>
                 ))}
              </div>
              <div className="p-6">
                 {activeLauncherTab === 'shop' && (
                    <form onSubmit={handleCreateShop} className="space-y-4">
                       <h2 className="text-xl font-black">Launch Shop</h2>
                       <div><label className="text-[10px] font-black text-gray-400 uppercase">Entity Name</label><input required value={newShopName} onChange={(e) => setNewShopName(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none text-sm" /></div>
                       <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-[10px] font-black text-gray-400 uppercase">Industry</label><select value={newShopIndustry} onChange={(e) => setNewShopIndustry(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none text-sm">{industryTypes.map(ind => <option key={ind.slug} value={ind.slug}>{ind.name}</option>)}</select></div>
                          <div className="flex flex-col justify-center">
                             <span className="text-[8px] font-black text-gray-300 uppercase">Subdomain Status:</span>
                             <span className="text-[10px] text-gray-400 italic">Locked (Free Tier)</span>
                          </div>
                       </div>
                       <div><label className="text-[10px] font-black text-gray-400 uppercase">Owner Email</label><input required type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none text-sm" /></div>
                       <button type="submit" disabled={isCreating} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl disabled:opacity-50">{isCreating ? "Booting..." : "⚡ Boot Environment"}</button>
                    </form>
                 )}
                 {activeLauncherTab === 'community' && (
                    <form onSubmit={handleCreateCommunity} className="space-y-4">
                       <h2 className="text-xl font-black">Build Community</h2>
                       <div><label className="text-[10px] font-black text-gray-400 uppercase">Name</label><input required value={newCommunityName} onChange={(e) => setNewCommunityName(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm" /></div>
                       <button type="submit" disabled={isCreating} className="w-full bg-teal-600 text-white font-black py-4 rounded-2xl disabled:opacity-50">🌱 Sprout Community</button>
                    </form>
                 )}
                 {activeLauncherTab === 'supplier' && (
                    <form onSubmit={handleCreateSupplier} className="space-y-4">
                       <h2 className="text-xl font-black">Onboard Supplier</h2>
                       <div><label className="text-[10px] font-black text-gray-400 uppercase">Name</label><input required value={newSupName} onChange={(e) => setNewSupName(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm" /></div>
                       <div><label className="text-[10px] font-black text-gray-400 uppercase">Email</label><input required type="email" value={newSupEmail} onChange={(e) => setNewSupEmail(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm" /></div>
                       <button type="submit" disabled={isCreating} className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl disabled:opacity-50">🚀 Provision Wholesaler</button>
                    </form>
                 )}
              </div>
           </div>
        </aside>
      </main>

      {/* Surgical Edit Modal */}
      {showEditModal && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
               <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
                  <h3 className="font-black text-indigo-900 uppercase tracking-widest text-sm">Surgical Metadata Edit</h3>
                  <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
               </div>
               <form onSubmit={handleUpdateMetadata} className="p-6 space-y-4">
                  <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Entity Name</label>
                     <input required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl px-4 py-3 outline-none text-sm transition" />
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Subscription Tier (Level Up)</label>
                     <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl px-4 py-3 outline-none text-sm transition">
                        <option value="free">Free - Entry Level</option>
                        <option value="basic">Basic - Growing Store</option>
                        <option value="pro">Pro - Scaling High Volume</option>
                        <option value="business">Business - Enterprise Network</option>
                     </select>
                  </div>
                  {(editPlan === 'pro' || editPlan === 'business' || editPlan === 'enterprise') ? (
                    <div>
                        <label className="block text-[10px] font-black text-indigo-400 uppercase mb-1">Premium Subdomain</label>
                        <input required value={editSubdomain} onChange={(e) => setEditSubdomain(e.target.value)} className="w-full bg-indigo-50 border-2 border-indigo-200 focus:border-indigo-400 rounded-xl px-4 py-3 outline-none text-sm font-mono transition" />
                        <p className="text-[10px] text-indigo-400 mt-1">✓ Premium subdomain unlocked for this tier.</p>
                    </div>
                  ) : (
                    <div className="bg-gray-100 p-4 rounded-xl border border-dashed border-gray-300">
                        <p className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-2">
                           🔒 Subdomain Locked
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1 italic italic">Free and Basic levels use generic URLs. Upgrade to Pro to enable subdomains.</p>
                    </div>
                  )}
                  <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Public Slug</label>
                     <input value={editSlug} onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl px-4 py-3 outline-none text-sm transition" />
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Contact Phone</label>
                     <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-xl px-4 py-3 outline-none text-sm transition" />
                  </div>
                  <div className="pt-4 flex gap-3">
                     <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm">Cancel</button>
                     <button type="submit" disabled={isUpdating} className="flex-1 px-4 py-3 bg-indigo-600 text-white font-black rounded-xl text-sm shadow-lg shadow-indigo-100">{isUpdating ? "Saving..." : "Save Changes"}</button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
