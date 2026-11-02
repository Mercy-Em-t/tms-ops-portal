import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/auth-service";
import { PLANS } from "../config/plans";

export default function AdminPlans() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    // Lock down to System Admin only!
    if (!user || user.system_role !== "system_admin") {
      navigate("/login");
    }
  }, [navigate]);

  const handleSave = () => {
     alert("Currently operating in statically compiled mode. To mutate global pricing, edit src/config/plans.js directly to guarantee 100% downstream synchronization.");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/admin"
            className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
          >
            ← System Admin
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Global Subscription Models</h1>
          <div className="flex items-center gap-4">
            <button
               onClick={() => { logout(); navigate("/login"); }}
               className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors cursor-pointer"
            >
               Logout
            </button>
            <button 
               onClick={handleSave}
               className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow cursor-pointer hover:bg-indigo-700"
            >
               Publish Changes
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
           <h2 className="text-2xl font-black text-gray-900">Tier Configuration</h2>
           <p className="text-gray-500 mt-1">Define the limits and marketing copy for the subscription packages offered to your Shop owners.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
           {PLANS.map(plan => {
             const isDark = plan.theme === 'dark';
             
             const borderColor = {
                green: "border-green-500",
                blue: "border-blue-500",
                purple: "border-purple-500"
             }[plan.colorTag] || "border-gray-400";
             
             const textColor = {
                green: "text-green-600",
                blue: "text-blue-600",
                purple: "text-purple-600"
             }[plan.colorTag] || "text-gray-600";

             return (
             <div key={plan.id} className={`${isDark ? 'bg-gray-900 shadow-xl' : 'bg-white shadow-md'} rounded-2xl border-t-8 p-6 flex flex-col ${borderColor}`}>
                <div className="mb-4">
                  <h3 className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                  <div className={`mt-2 text-2xl font-black ${textColor} w-full`}>KSh {plan.priceLabel}</div>
                </div>
                
                <div className="flex-1 space-y-6">
                   <div>
                       <p className={`text-[10px] font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'} uppercase mb-1 tracking-widest`}>Merchant Experience</p>
                       <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{plan.merchantExperience}</p>
                   </div>
                   
                   <div>
                       <p className={`text-[10px] font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'} uppercase mb-1 tracking-widest`}>Consumer Experience</p>
                       <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{plan.consumerExperience}</p>
                   </div>
                   
                   <div>
                       <p className={`text-[10px] font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'} uppercase mt-4 mb-2 tracking-widest`}>Advertised Capabilities</p>
                       <ul className="space-y-2">
                           {plan.features.map((feature, idx) => (
                              <li key={idx} className={`flex gap-2 items-start text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} ${feature.active ? '' : 'line-through opacity-50'}`}>
                                <span className={feature.active ? 'text-green-500' : 'text-red-400 font-bold'}>{feature.active ? '✓' : '✗'}</span>
                                {feature.text}
                              </li>
                           ))}
                       </ul>
                   </div>
                </div>
             </div>
           )})}
        </div>
      </main>
    </div>
  );
}
