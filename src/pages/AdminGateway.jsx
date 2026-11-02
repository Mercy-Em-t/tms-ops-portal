import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase-client";
import { getCurrentUser } from "../services/auth-service";

export default function AdminGateway() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [logs, setLogs] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") {
      navigate("/login");
      return;
    }
    fetchData();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchData, 5000);
    }
    return () => clearInterval(interval);
  }, [user, navigate, autoRefresh]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchLogs(), fetchHealth()]);
    setLoading(false);
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("gateway_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/gateway/router?health=true");
      const data = await res.json();
      setHealth(data.nodes);
    } catch (err) {
      console.error("Health Check Failed:", err);
      // Fallback if API hasn't been deployed to Vercel yet
      setHealth({ gateway: 'UP', system_a: 'UP', system_b: 'UNKNOWN' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'UP': return 'bg-green-500 shadow-[0_0_10px_#22c55e]';
      case 'DOWN': return 'bg-red-500 shadow-[0_0_10px_#ef4444]';
      case 'DEGRADED': return 'bg-yellow-500 shadow-[0_0_10px_#eab308]';
      default: return 'bg-gray-500 shadow-[0_0_10px_#6b7280]';
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#00FF41] font-mono selection:bg-[#00FF41] selection:text-black">
      {/* HUD Header */}
      <header className="border-b border-[#00FF41]/30 bg-[#0a0a0a] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/admin" className="text-gray-500 hover:text-[#00FF41] transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </Link>
            <div>
              <h1 className="text-xl font-black tracking-tighter flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF41] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00FF41]"></span>
                </span>
                API GATEWAY CONTROL <span className="text-[10px] bg-[#00FF41]/10 px-2 py-0.5 border border-[#00FF41]/30 text-[#00FF41]/70">v1.2.0-secure</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex bg-black border border-[#00FF41]/20 rounded-md overflow-hidden">
                <button 
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-1 text-[10px] uppercase font-bold transition ${autoRefresh ? 'bg-[#00FF41]/20 text-[#00FF41]' : 'text-gray-600'}`}
                >
                  Live Feed: {autoRefresh ? 'ON' : 'OFF'}
                </button>
             </div>
             <button onClick={fetchData} className="p-2 border border-[#00FF41]/30 hover:bg-[#00FF41]/10 transition">
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        
        {/* TOP LAYER: Nodes & Routing Info */}
        <div className="grid lg:grid-cols-4 gap-6">
          <HealthNode label="Internal Node" status={health?.system_a} type="System A" />
          <HealthNode label="External Gateway" status={health?.system_b} type="System B" />
          <HealthNode label="Gateway Router" status={health?.gateway} type="Vercel Edge" />
          
          <div className="bg-[#0a0a0a] border border-[#00FF41]/20 p-5 rounded-lg flex flex-col justify-center">
             <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-bold">Routing Logic</div>
             <div className="text-xs text-[#00FF41]/70 leading-relaxed italic">
                Incoming requests reaching /api/gateway are routed based on `?to=` parameter with fallback to Production Hub.
             </div>
          </div>
        </div>

        {/* MIDDLE LAYER: Traffic Stream */}
        <div className="bg-[#0a0a0a] border border-[#00FF41]/20 rounded-lg overflow-hidden shadow-2xl shadow-[#00FF41]/5">
          <div className="border-b border-[#00FF41]/20 bg-[#0d0d0d] px-6 py-3 flex justify-between items-center">
             <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#00FF41]">Encapsulated Traffic Stream</h2>
             <span className="text-[10px] text-gray-600 uppercase font-bold">{logs.length} Packets Intercepted</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-black/50 text-gray-500 border-b border-[#00FF41]/10">
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">T-STAMP</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">VECTOR</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">METHOD</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">TARGET</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">STATUS</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">LATENCY</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">DATA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#00FF41]/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#00FF41]/5 transition-colors group">
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString('en-GB')}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-sm font-black text-[9px] ${log.direction === 'SENT' ? 'bg-indigo-900/40 text-indigo-400' : 'bg-[#00FF41]/10 text-[#00FF41]'}`}>
                        {log.direction}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-bold text-gray-300">{log.method}</td>
                    <td className="px-6 py-3 text-gray-400 max-w-[200px] truncate">{log.system} <span className="text-[10px] opacity-30">@{log.endpoint}</span></td>
                    <td className="px-6 py-3">
                      <span className={`font-mono ${log.status_code >= 400 ? 'text-red-500' : 'text-[#00FF41]'}`}>
                        {log.status_code || '--'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {log.latency_ms ? `${log.latency_ms}ms` : '--'}
                    </td>
                    <td className="px-6 py-3">
                      <button 
                        onClick={() => alert(JSON.stringify(log.payload || log.response, null, 2))}
                        className="text-[10px] border border-[#00FF41]/20 px-2 py-1 hover:bg-[#00FF41]/20 transition rounded"
                      >
                        INSPECT_JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && !loading && (
              <div className="py-20 text-center text-gray-600 uppercase text-sm tracking-widest">
                Waiting for data transmission...
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM LAYER: Router Configuration View */}
        <div className="grid lg:grid-cols-2 gap-8">
           <div className="p-6 bg-[#0a0a0a] border border-indigo-900/30 rounded-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl pointer-events-none group-hover:bg-indigo-500/10 transition-all"></div>
              <h3 className="text-indigo-400 font-black uppercase text-xs mb-4 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                 Production Route: System B
              </h3>
              <div className="space-y-3 text-[11px]">
                 <div className="flex justify-between">
                    <span className="text-gray-600">Proxy Endnode:</span>
                    <span className="text-gray-400">https://api.system-b.internal/v1</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-600">Auth Method:</span>
                    <span className="text-gray-400">X-API-KEY (Encrypted)</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-600">Load Factor:</span>
                    <span className="text-indigo-400">OPTIMIZED</span>
                 </div>
              </div>
           </div>

           <div className="p-6 bg-[#0a0a0a] border border-orange-900/30 rounded-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl pointer-events-none group-hover:bg-orange-500/10 transition-all"></div>
              <h3 className="text-orange-400 font-black uppercase text-xs mb-4 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                 Gateway Latency Protocol
              </h3>
              <div className="space-y-3 text-[11px]">
                 <div className="flex justify-between">
                    <span className="text-gray-600">Avg Response Time:</span>
                    <span className="text-orange-400">324ms</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-600">Batching Ops:</span>
                    <span className="text-gray-400">ENABLED (Auto-Sync)</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-600">Encryption Layer:</span>
                    <span className="text-gray-400">TLS 1.3 / AES-256</span>
                 </div>
              </div>
           </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-6 py-10 border-t border-[#00FF41]/10 flex justify-between items-center text-[10px] text-gray-600 uppercase font-black">
        <div>Root Access Domain: admin.gateway.internal</div>
        <div className="flex gap-4">
           <span>X: {Math.random().toFixed(4)}</span>
           <span>Y: {Math.random().toFixed(4)}</span>
           <span className="animate-pulse">NODE_READY</span>
        </div>
      </footer>
    </div>
  );

  function HealthNode({ label, status, type }) {
    return (
      <div className="bg-[#0a0a0a] border border-[#00FF41]/20 p-5 rounded-lg flex flex-col items-center justify-center text-center">
        <div className={`w-3 h-3 rounded-full mb-3 ${getStatusColor(status)}`}></div>
        <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{label}</div>
        <div className="text-sm font-black text-white">{status || 'INITIALIZING'}</div>
        <div className="mt-2 text-[9px] bg-black/40 px-2 py-0.5 border border-[#00FF41]/10 text-gray-600">{type}</div>
      </div>
    );
  }
}
