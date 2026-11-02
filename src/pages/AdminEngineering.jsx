import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/auth-service";
import packageJson from "../../package.json";

export default function AdminEngineering() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") {
      navigate("/login");
    }
  }, [navigate, user]);

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono pb-20">
      <header className="bg-gray-900 shadow-sm sticky top-0 z-10 border-b border-green-900/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/admin"
            className="flex items-center gap-2 text-green-400 font-bold hover:text-green-300 transition"
          >
            ← Exit Compartment
          </Link>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 flex items-center justify-center font-black animate-pulse border border-green-500 bg-green-500/20 text-green-400">
               !
             </div>
             <h1 className="text-lg font-black text-green-400 tracking-widest hidden sm:block uppercase">System Engineering Compartment</h1>
              <span className="text-[10px] text-green-600 font-mono ml-2 border border-green-900/50 px-1 rounded">v{packageJson.version}</span>
          </div>
          <button
             onClick={() => { logout(); navigate("/login"); }}
             className="text-sm font-bold text-red-500 hover:text-red-400 transition"
          >
             KILL SESSION
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
         <div className="grid md:grid-cols-[2fr_1fr] gap-6">
            
            {/* 3D Video Sim */}
            <section className="bg-gray-900 border border-green-900/50 rounded-lg p-1 relative overflow-hidden shadow-2xl shadow-green-900/20">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>
               <div className="bg-black relative rounded-md overflow-hidden aspect-video flex items-center justify-center border border-gray-800">
                  <video 
                     className="w-full h-full object-cover opacity-80 mix-blend-screen filter contrast-125 saturate-50"
                     autoPlay 
                     loop 
                     muted 
                     playsInline
                  >
                     <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
                     Your browser does not support the video tag.
                  </video>
                  
                  {/* Overlay HUD */}
                  <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                     <div className="flex justify-between items-start">
                        <div className="bg-black/80 text-green-500 px-3 py-1 font-bold text-xs uppercase border border-green-900/50">
                           Sim: LIVE_ECOSYSTEM_MODEL
                        </div>
                        <div className="flex gap-1">
                           <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                        </div>
                     </div>
                     <div className="text-[10px] text-green-400/70 drop-shadow-md">
                        <p>X: 42.19, Y: -11.02, Z: 104.5</p>
                        <p>NODES_ACTIVE: 1024</p>
                     </div>
                  </div>
               </div>
            </section>

            {/* Control Rig */}
            <section className="bg-gray-900 border border-green-900/50 rounded-lg p-6 flex flex-col gap-6">
               <div>
                  <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wider">Root Access Tools</h2>
                  <p className="text-xs text-green-600">God-mode tools for deploying structural features.</p>
               </div>

               <div className="space-y-4 flex-1">
                  <div className="p-4 bg-black border border-gray-800 rounded relative group overflow-hidden">
                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 group-hover:w-full transition-all duration-300 opacity-20"></div>
                     <h3 className="font-bold text-indigo-400 relative z-10">Deploy New Module</h3>
                     <p className="text-xs text-gray-500 mt-1 relative z-10">Inject new React hooks, pages, or entire feature suites globally.</p>
                     <button className="mt-3 text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 px-3 py-1 uppercase font-bold hover:bg-indigo-500/40 transition relative z-10 w-full text-left">
                        &gt; Execute Build
                     </button>
                  </div>

                  <div className="p-4 bg-black border border-gray-800 rounded relative group overflow-hidden">
                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 group-hover:w-full transition-all duration-300 opacity-20"></div>
                     <h3 className="font-bold text-amber-400 relative z-10">Database Migration Sync</h3>
                     <p className="text-xs text-gray-500 mt-1 relative z-10">Force push new SQL schema diffs to the Supabase Production Cluster.</p>
                     <button className="mt-3 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/50 px-3 py-1 uppercase font-bold hover:bg-amber-500/40 transition relative z-10 w-full text-left">
                        &gt; Sync Schema
                     </button>
                  </div>

                  <div className="p-4 bg-black border border-gray-800 rounded relative group overflow-hidden">
                     <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 group-hover:w-full transition-all duration-300 opacity-20"></div>
                     <h3 className="font-bold text-red-500 relative z-10">Teardown / Nuke</h3>
                     <p className="text-xs text-gray-500 mt-1 relative z-10">Permanently sever a module or rollback the entire cluster version.</p>
                     <button className="mt-3 text-xs bg-red-500/20 text-red-400 border border-red-500/50 px-3 py-1 uppercase font-bold hover:bg-red-500/40 transition relative z-10 w-full text-left">
                        &gt; Init Nuke Protocol
                     </button>
                  </div>
               </div>

               <div className="pt-4 border-t border-green-900/30">
                  <p className="text-[10px] text-green-700 font-bold uppercase text-center">Unauthorized access is strictly forbidden.</p>
                   <p className="text-[11px] text-green-600 font-mono text-center mt-1">BUILD_VERSION_V2.4: {packageJson.version}-STABLE</p>
               </div>
            </section>

         </div>
      </main>
    </div>
  );
}
