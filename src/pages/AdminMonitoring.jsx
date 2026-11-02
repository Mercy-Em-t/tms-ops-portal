import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase-client";
import { getCurrentUser } from "../services/auth-service";

export default function AdminMonitoring() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [logs, setLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState("intercept"); // "intercept" or "audit"
  const [loading, setLoading] = useState(true);

  // We'll simulate some of the "Live Performance" and "Suspicious Behavior" 
  // until we connect advanced Postgres functions, but we WILL fetch actual 
  // qr_events to serve as the live system log.
  
  useEffect(() => {
    if (!user || user.system_role !== "system_admin") {
      navigate("/login");
      return;
    }
    fetchAllData();
  }, [user, navigate]);

  const fetchAllData = async () => {
     setLoading(true);
     await Promise.all([fetchLiveLogs(), fetchAuditLogs(), fetchSecurityAlerts()]);
     setLoading(false);
  };

  const fetchAuditLogs = async () => {
     try {
        const { data, error } = await supabase
           .from("system_audit_logs")
           .select("*")
           .order("created_at", { ascending: false })
           .limit(50);
        if (error) throw error;
        setAuditLogs(data || []);
     } catch (err) {
        console.error("Audit Fetch Failed:", err);
     }
  };

  const fetchLiveLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          qr_id,
          event_type,
          timestamp,
          device_info,
          qrs (
             shop_id,
             shops ( name )
          )
        `)
        .order("timestamp", { ascending: false })
        .limit(50);
        
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  };

  const fetchSecurityAlerts = async () => {
     try {
       // 1. Redundant File logs from local storage
       const localStr = localStorage.getItem("savannah_security_file_logs");
       const localLogs = localStr ? JSON.parse(localStr) : [];

       // 2. Telemetry alerts from cloud events table
       const { data: cloudLogs } = await supabase
         .from("events")
         .select("*")
         .like("event_type", "security_alert_%")
         .order("created_at", { ascending: false })
         .limit(50);

       // Merge & Deduplicate based on exact match of timestamp and event_type
       const unified = [...localLogs];
       if (cloudLogs) {
         cloudLogs.forEach(cl => {
           const match = unified.find(u => u.timestamp === cl.created_at || u.metadata?.targetPath === cl.metadata?.targetPath);
           if (!match) {
             unified.push({
               event_type: cl.event_type,
               user: cl.metadata?.attemptedByEmail || "System Event",
               timestamp: cl.created_at || cl.timestamp,
               metadata: cl.metadata || {}
             });
           }
         });
       }

       setSecurityAlerts(unified.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
     } catch (err) {
       console.error("Failed to fetch security alerts:", err);
     }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col font-mono text-green-500">
      <header className="bg-gray-900 shadow-sm border-b border-green-900/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Link to="/admin" className="text-green-700 hover:text-green-400 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
             </Link>
             <h1 className="text-lg font-bold text-green-500 flex items-center gap-2 uppercase tracking-widest">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                Operations Console
             </h1>
          </div>
          <button onClick={fetchAllData} className="text-xs bg-green-900/20 hover:bg-green-900/40 text-green-400 px-3 py-1.5 rounded border border-green-800 transition flex items-center gap-2 uppercase">
             <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
             Sync Nodes
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        
        {/* Panel A: Live System Performance */}
        <div className="border border-green-900/50 bg-gray-900/50 rounded flex flex-col overflow-hidden relative group">
           <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 blur-3xl group-hover:bg-green-500/20 transition-all"></div>
           <div className="bg-green-900/20 px-4 py-2 border-b border-green-900/50 font-bold uppercase text-xs tracking-wider flex justify-between items-center">
              System Health
              <span className="text-green-400 text-[10px]">NOMINAL</span>
           </div>
           <div className="p-4 space-y-4 text-sm flex-1">
              <div className="flex justify-between items-center pb-2 border-b border-green-900/20">
                 <span className="text-gray-500">API Latency</span>
                 <span className="text-green-400">42ms</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-green-900/20">
                 <span className="text-gray-500">DB Connections</span>
                 <span className="text-green-400">12 / 100</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-green-900/20">
                 <span className="text-gray-500">Edge Uptime</span>
                 <span className="text-green-400">99.99%</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-green-900/20">
                 <span className="text-gray-500">Storage Pipeline</span>
                 <span className="text-green-400 text-xs px-2 py-0.5 border border-green-800 rounded">ACTIVE</span>
              </div>
              <div className="mt-8">
                 <div className="text-xs text-gray-500 mb-2">Memory Load (Simulated)</div>
                 <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '28%' }}></div>
                 </div>
              </div>
           </div>
        </div>

        {/* Panel B: Suspicious Behavior & Security */}
        <div className="border border-red-900/30 bg-gray-900/50 rounded flex flex-col overflow-hidden relative group">
           <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 blur-3xl group-hover:bg-red-500/10 transition-all"></div>
           <div className="bg-red-900/20 px-4 py-2 border-b border-red-900/30 font-bold uppercase text-xs tracking-wider text-red-500 flex justify-between items-center">
              Security Flags
              <span className="text-red-400 text-[10px] bg-red-900/30 px-2 py-0.5 rounded border border-red-800">{securityAlerts.length} ALERT</span>
           </div>
           <div className="p-4 space-y-2 text-sm flex-1 overflow-y-auto">
               {securityAlerts.length > 0 ? (
                 securityAlerts.map((alert, idx) => (
                   <div key={idx} className="border-l-2 border-red-500 bg-red-900/10 pl-3 py-2 mb-2 rounded border-t border-r border-b border-red-900/20">
                      <div className="text-red-400 text-xs font-bold mb-1 uppercase tracking-wider">
                         ⚠️ {alert.event_type?.replace('security_alert_', '')?.replace(/_/g, ' ')}
                      </div>
                      <div className="text-gray-300 text-[11px] leading-relaxed">
                         User: <span className="text-white font-mono">{alert.user}</span><br/>
                         {alert.metadata?.targetPath && (
                           <>Target: <span className="text-white font-mono">{alert.metadata.targetPath}</span><br/></>
                         )}
                         {alert.url && (
                           <>Origin: <span className="text-gray-400 font-mono text-[10px] break-all">{alert.url}</span><br/></>
                         )}
                      </div>
                      <div className="text-red-800 text-[10px] mt-1">
                         {alert.timestamp ? new Date(alert.timestamp).toLocaleString('en-GB') : "N/A"}
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="text-gray-600 italic py-2">No suspicious alerts detected on the edge network.</div>
               )}

               <div className="border border-green-500 bg-green-500/10 p-3 my-4 rounded relative overflow-hidden">
                  <div className="text-green-400 font-bold mb-1 uppercase tracking-wider text-xs">🚀 Action Required: M-Pesa Integration</div>
                  <div className="text-gray-300 text-[11px] leading-relaxed">
                     Remember to configure the Daraja API for ShopQR! <br/><br/>
                     1. Run <span className="text-white font-mono bg-black/40 px-1 rounded">supabase secrets set MPESA_CONSUMER_KEY=xyz MPESA_CONSUMER_SECRET=abc MPESA_ENVIRONMENT=sandbox</span><br/>
                     2. Deploy edge functions <span className="text-white font-mono bg-black/40 px-1 rounded">mpesa-stk-push</span> & <span className="text-white font-mono bg-black/40 px-1 rounded">mpesa-webhook</span><br/>
                     <span className="text-green-500/70 text-[10px] mt-1 block font-bold">Waiting for Supabase remote deployment...</span>
                  </div>
               </div>
           </div>
        </div>

        {/* Panel C: System Logs Controller */}
        <div className="border border-blue-900/30 bg-gray-900/50 rounded flex flex-col overflow-hidden relative group">
           <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 blur-3xl group-hover:bg-blue-500/10 transition-all"></div>
           
           <div className="flex border-b border-blue-900/30 bg-blue-900/10">
              <button 
                onClick={() => setActiveTab("intercept")}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition ${activeTab === "intercept" ? "bg-blue-900/40 text-blue-400" : "text-gray-600 hover:text-blue-500"}`}
              >
                Traffic Intercept
              </button>
              <button 
                onClick={() => setActiveTab("audit")}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition ${activeTab === "audit" ? "bg-blue-900/40 text-blue-400" : "text-gray-600 hover:text-blue-500"}`}
              >
                Security Audit
              </button>
           </div>

           <div className="p-4 flex-1 overflow-y-auto max-h-[60vh] text-[11px] space-y-1.5">
             {loading && (logs.length === 0 && auditLogs.length === 0) ? (
                <div className="text-blue-900">Waiting for packet stream...</div>
             ) : activeTab === "intercept" ? (
                logs.length === 0 ? (
                   <div className="text-gray-600">No recent activity detected on the edge network.</div>
                ) : (
                   logs.map((log) => (
                      <div key={log.id} className="flex gap-2">
                          <span className="text-gray-600 shrink-0">
                             {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-GB') : ''}
                          </span>
                          <span className="text-blue-500 shrink-0">[{log.event_type?.toUpperCase()}]</span>
                          <span className="text-gray-400 truncate">
                             {log.qrs?.shops?.name ? `[${log.qrs.shops.name}]` : '[Unknown Shop]'} 
                             {' '}
                             {log.device_info?.context === 'menu' ? 'Menu Scanned' : 
                              log.device_info?.context === 'order' ? 'Pre-checkout Session' : 
                              log.device_info?.context === 'campaign' ? 'Ad Campaign Click' : 
                              'Node Resolving'}
                          </span>
                      </div>
                   ))
                )
             ) : (
                auditLogs.length === 0 ? (
                   <div className="text-gray-600">Secure record is empty.</div>
                ) : (
                   auditLogs.map((log) => (
                      <div key={log.id} className="flex flex-col gap-0.5 pb-2 border-b border-blue-900/10 last:border-0 mb-2">
                          <div className="flex justify-between text-gray-400">
                             <span className="text-blue-400 font-bold uppercase">{log.action || 'SYSTEM_ACTION'}</span>
                             <span>{new Date(log.created_at).toLocaleTimeString('en-GB')}</span>
                          </div>
                          <div className="text-gray-500">
                             <span className="text-gray-600">Subject:</span> {log.performed_by_email || 'System'} | <span className="text-gray-600">Target:</span> {log.target_email || 'N/A'}
                          </div>
                          {log.details && (
                             <div className="text-gray-400 text-[10px] italic truncate">{JSON.stringify(log.details)}</div>
                          )}
                      </div>
                   ))
                )
             )}
           </div>
        </div>

      </main>
    </div>
  );
}
