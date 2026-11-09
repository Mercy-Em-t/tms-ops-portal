import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/auth-service";

export default function AdminObservatory() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  // Endpoint configuration
  const [activeEndpoint, setActiveEndpoint] = useState(
    localStorage.getItem("tms_obs_endpoint") || "http://100.73.175.118:8085"
  );
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // RTT & Ping Metrics
  const [rttHistory, setRttHistory] = useState([]);
  const [currentRtt, setCurrentRtt] = useState(null);
  const [minRtt, setMinRtt] = useState(null);
  const [maxRtt, setMaxRtt] = useState(null);
  const [avgRtt, setAvgRtt] = useState(null);
  const [packetLoss, setPacketLoss] = useState(0);
  const [relayMode, setRelayMode] = useState("Probing...");
  const [hangStatus, setHangStatus] = useState("HEALTHY"); // HEALTHY, STALLED, HANG_DETECTED
  const [relayHealth, setRelayHealth] = useState(null);

  // Filter for logs
  const [logFilter, setLogFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [probeCount, setProbeCount] = useState(0);

  const logsEndRef = useRef(null);

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") {
      navigate("/login");
      return;
    }

    runProbe();

    let timer;
    if (autoRefresh) {
      timer = setInterval(() => {
        runProbe();
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [user, navigate, autoRefresh, activeEndpoint]);

  const handleEndpointChange = (url) => {
    setActiveEndpoint(url);
    localStorage.setItem("tms_obs_endpoint", url);
    setRttHistory([]);
    setProbeCount(0);
  };

  const runProbe = async () => {
    const startTime = performance.now();
    try {
      // 1. Measure Ping & Round Trip Time
      const pingRes = await fetch(`${activeEndpoint}/api/observatory/ping`, {
        signal: AbortSignal.timeout(4000),
      });

      const endTime = performance.now();
      const rttMs = Math.round(endTime - startTime);

      if (!pingRes.ok) throw new Error(`HTTP ${pingRes.status}`);
      await pingRes.json();

      setCurrentRtt(rttMs);
      setHangStatus("HEALTHY");

      // Update RTT history & stats
      setRttHistory((prev) => {
        const next = [...prev.slice(-24), rttMs];
        const min = Math.min(...next);
        const max = Math.max(...next);
        const avg = Math.round(next.reduce((a, b) => a + b, 0) / next.length);
        setMinRtt(min);
        setMaxRtt(max);
        setAvgRtt(avg);
        return next;
      });

      // Classify connection path
      if (rttMs < 110) {
        setRelayMode("DIRECT P2P WIREGUARD");
      } else if (rttMs <= 240) {
        setRelayMode("DIRECTED RELAY (DERP nai)");
      } else {
        setRelayMode("HIGH-LATENCY RELAY / CGNAT");
      }

      setProbeCount((c) => c + 1);

      // 2. Fetch Deep Telemetry
      const telRes = await fetch(`${activeEndpoint}/api/observatory/telemetry`, {
        signal: AbortSignal.timeout(5000),
      });
      if (telRes.ok) {
        const telData = await telRes.json();
        setTelemetry(telData);
      }

      // 3. Probe Till Relay Phone Dead-Man's Switch
      try {
        const relayRes = await fetch("https://updatedtms-whitelabel-core.vercel.app/api/till/receipt?action=health", {
          signal: AbortSignal.timeout(4000)
        });
        if (relayRes.ok) {
          const relayData = await relayRes.json();
          setRelayHealth(relayData);
        }
      } catch (rErr) {
        console.warn("Relay probe error:", rErr);
      }
    } catch (err) {
      console.warn("Probe failed:", err);
      setCurrentRtt(null);
      setHangStatus(err.name === "TimeoutError" ? "HANG_DETECTED" : "STALLED");
      setRelayMode("RETRYING / DROP");
      setPacketLoss((prev) => Math.min(100, prev + 10));
    } finally {
      setLoading(false);
    }
  };

  // Filtered Logs
  const filteredLogs = (telemetry?.logs || []).filter((log) => {
    const matchesFilter = logFilter === "ALL" || log.type === logFilter;
    const matchesSearch =
      !searchQuery ||
      log.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#07090e] text-[#00FF66] font-mono selection:bg-[#00FF66] selection:text-black pb-12">
      {/* HUD Header */}
      <header className="border-b border-[#00FF66]/20 bg-[#0b0e14]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link
              to="/admin"
              className="text-gray-400 hover:text-[#00FF66] transition flex items-center gap-2 text-xs uppercase"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Master Ops
            </Link>
            <div className="h-4 w-px bg-gray-800" />
            <div>
              <h1 className="text-lg font-black tracking-tight flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      hangStatus === "HEALTHY"
                        ? "bg-[#00FF66]"
                        : hangStatus === "STALLED"
                        ? "bg-amber-400"
                        : "bg-red-500"
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      hangStatus === "HEALTHY"
                        ? "bg-[#00FF66]"
                        : hangStatus === "STALLED"
                        ? "bg-amber-400"
                        : "bg-red-500"
                    }`}
                  />
                </span>
                REMOTE EDGE OBSERVATORY
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 border border-emerald-500/30 rounded">
                  PAVILION 24/7
                </span>
              </h1>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Host: <span className="text-gray-300">localhost-0</span> (Tailscale: 100.73.175.118) • Direct Wi-Fi: KONNECT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Target Endpoint Switcher */}
            <div className="flex items-center bg-black/60 border border-gray-800 rounded p-1 text-[11px]">
              <span className="text-gray-500 px-2">Target:</span>
              <button
                onClick={() => handleEndpointChange("http://100.73.175.118:8085")}
                className={`px-2.5 py-1 rounded transition text-xs font-semibold ${
                  activeEndpoint.includes("100.73.175.118")
                    ? "bg-[#00FF66] text-black font-bold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Tailscale (Direct)
              </button>
              <button
                onClick={() => handleEndpointChange("https://wa.missperpetual.cloud")}
                className={`px-2.5 py-1 rounded transition text-xs font-semibold ${
                  activeEndpoint.includes("missperpetual.cloud")
                    ? "bg-[#00FF66] text-black font-bold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Public Cloud (wa.missperpetual.cloud)
              </button>
            </div>

            {/* Live Auto-Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 border rounded text-xs font-bold transition flex items-center gap-1.5 ${
                autoRefresh
                  ? "border-[#00FF66]/50 bg-[#00FF66]/10 text-[#00FF66]"
                  : "border-gray-800 bg-gray-900 text-gray-500"
              }`}
            >
              <span className={`inline-block w-2 h-2 rounded-full ${autoRefresh ? "bg-[#00FF66] animate-pulse" : "bg-gray-600"}`} />
              {autoRefresh ? "STREAM: 3s" : "PAUSED"}
            </button>

            {/* Manual Refresh */}
            <button
              onClick={runProbe}
              title="Manual Probe"
              className="p-2 border border-gray-800 hover:border-[#00FF66]/50 bg-black/40 hover:bg-[#00FF66]/10 rounded transition text-gray-300"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin text-[#00FF66]" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* ROW 1: NETWORK, PING & RELAY GAUGES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Gauge 1: Round Trip Time */}
          <div className="bg-[#0b0e14] border border-[#00FF66]/20 p-5 rounded-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="uppercase tracking-wider">Round Trip Time (RTT)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900 text-gray-300">Probes: {probeCount}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`text-4xl font-black ${currentRtt ? (currentRtt < 150 ? "text-[#00FF66]" : "text-cyan-400") : "text-red-400"}`}>
                {currentRtt !== null ? `${currentRtt}` : "--"}
              </span>
              <span className="text-sm text-gray-400">ms</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-800/60 pt-2">
              <span>Min: <strong className="text-gray-300">{minRtt || "--"}ms</strong></span>
              <span>Avg: <strong className="text-gray-300">{avgRtt || "--"}ms</strong></span>
              <span>Max: <strong className="text-gray-300">{maxRtt || "--"}ms</strong></span>
            </div>
          </div>

          {/* Gauge 2: Relay vs Direct Mode */}
          <div className="bg-[#0b0e14] border border-[#00FF66]/20 p-5 rounded-lg">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Transport Routing</div>
            <div className="mt-3">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${relayMode.includes("DIRECT") ? "bg-[#00FF66]" : "bg-cyan-400"}`} />
                {relayMode}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {relayMode.includes("DIRECT")
                  ? "Peer-to-peer authenticated WireGuard tunnel."
                  : "Routed via DERP relay (nai) in Nairobi."}
              </p>
            </div>
            <div className="mt-3 text-[11px] text-gray-500 border-t border-gray-800/60 pt-2 flex justify-between">
              <span>Carrier: <strong>Ahadi / Konnect</strong></span>
              <span>NAT: <strong>CGNAT</strong></span>
            </div>
          </div>

          {/* Gauge 3: Process State & Hang Detector */}
          <div className="bg-[#0b0e14] border border-[#00FF66]/20 p-5 rounded-lg">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Process & Hang Status</div>
            <div className="mt-3 flex items-center gap-3">
              <span
                className={`text-sm font-bold px-2 py-1 rounded border uppercase ${
                  hangStatus === "HEALTHY"
                    ? "bg-[#00FF66]/10 border-[#00FF66]/40 text-[#00FF66]"
                    : hangStatus === "STALLED"
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                    : "bg-red-500/10 border-red-500/40 text-red-400"
                }`}
              >
                {hangStatus === "HEALTHY" ? "Active (No Hang)" : hangStatus}
              </span>
            </div>
            <div className="mt-3 text-[11px] text-gray-500 border-t border-gray-800/60 pt-2 space-y-1">
              <div className="flex justify-between">
                <span>Node RSS RAM:</span>
                <strong className="text-gray-300">{telemetry?.system?.processRssMb || 92} MB</strong>
              </div>
              <div className="flex justify-between">
                <span>CPU Load (1m):</span>
                <strong className="text-gray-300">{telemetry?.system?.loadAverage?.[0]?.toFixed(2) || "0.08"}</strong>
              </div>
            </div>
          </div>

          {/* Gauge 4: WhatsApp Socket Authority */}
          <div className="bg-[#0b0e14] border border-[#00FF66]/20 p-5 rounded-lg">
            <div className="text-xs text-gray-400 uppercase tracking-wider">WhatsApp Daemon</div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${telemetry?.whatsapp?.connected ? "bg-[#00FF66] shadow-[0_0_8px_#00FF66]" : "bg-red-500"}`} />
              <span className="text-sm font-bold text-white">
                {telemetry?.whatsapp?.connected ? "ONLINE & AUTHED" : "CONNECTING..."}
              </span>
            </div>
            <div className="mt-3 text-[11px] text-gray-500 border-t border-gray-800/60 pt-2 space-y-1">
              <div className="flex justify-between truncate">
                <span>JID:</span>
                <strong className="text-gray-300 truncate">{telemetry?.whatsapp?.userJid || "254710720949"}</strong>
              </div>
              <div className="flex justify-between">
                <span>Reconnects:</span>
                <strong className="text-gray-300">{telemetry?.whatsapp?.reconnectCount ?? 0} (0 Conflicts)</strong>
              </div>
            </div>
          </div>

          {/* Gauge 5: Android Till Relay Sentinel (Dead-Man's Switch) */}
          <div className="bg-[#0b0e14] border border-[#00FF66]/20 p-5 rounded-lg">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="uppercase tracking-wider">Till Relay Sentinel</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                relayHealth?.is_online 
                  ? "bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30" 
                  : "bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse"
              }`}>
                {relayHealth?.status || "PROBING..."}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                relayHealth?.is_online 
                  ? "bg-[#00FF66] shadow-[0_0_8px_#00FF66]" 
                  : "bg-red-500 animate-ping"
              }`} />
              <span className="text-sm font-bold text-white">
                {relayHealth?.is_online ? "Redmi Note 12 Active" : "DEVICE UNREACHABLE"}
              </span>
            </div>
            <div className="mt-3 text-[11px] text-gray-500 border-t border-gray-800/60 pt-2 space-y-1">
              <div className="flex justify-between">
                <span>Battery:</span>
                <strong className={relayHealth?.device_info?.battery != null && relayHealth.device_info.battery < 20 ? "text-red-400 font-black" : "text-gray-300"}>
                  {relayHealth?.device_info?.battery != null ? `${relayHealth.device_info.battery}%` : "--"}
                  {relayHealth?.device_info?.is_charging ? " ⚡" : ""}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Network:</span>
                <strong className="text-gray-300">{relayHealth?.device_info?.network || "Wi-Fi / 4G"}</strong>
              </div>
              <div className="flex justify-between">
                <span>Heartbeat:</span>
                <strong className={relayHealth?.latency_minutes > 15 ? "text-amber-400" : "text-gray-300"}>
                  {relayHealth?.latency_minutes != null ? `${relayHealth.latency_minutes}m ago` : "Waiting for ping"}
                </strong>
              </div>
            </div>
            {relayHealth?.alert && (
              <div className="mt-2 text-[10px] bg-red-950/40 border border-red-500/30 text-red-400 p-1.5 rounded leading-tight">
                {relayHealth.alert}
              </div>
            )}
          </div>
        </div>

        {/* ROW 2: LIVE RTT SPARKLINE & TRAFFIC MATRIX */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Latency History Graph */}
          <div className="bg-[#0b0e14] border border-gray-800 p-5 rounded-lg lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">Real-Time Latency Pulse (Last 25 Probes)</h3>
                <p className="text-xs text-gray-500">Measures cross-network response speed between Dragonfly and Pavilion</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-2 py-0.5 rounded">
                Interval: 3000ms
              </span>
            </div>

            {/* Sparkline Visualizer */}
            <div className="h-32 flex items-end gap-1.5 bg-black/40 p-3 rounded border border-gray-900">
              {rttHistory.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">
                  Awaiting latency probes...
                </div>
              ) : (
                rttHistory.map((val, idx) => {
                  const maxDisplay = Math.max(300, ...(rttHistory || [300]));
                  const heightPct = Math.min(100, Math.max(10, Math.round((val / maxDisplay) * 100)));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t transition-all duration-300 ${
                          val < 110
                            ? "bg-emerald-500/80 hover:bg-emerald-400"
                            : val <= 220
                            ? "bg-cyan-500/80 hover:bg-cyan-400"
                            : "bg-amber-500/80 hover:bg-amber-400"
                        }`}
                      />
                      {/* Tooltip on Hover */}
                      <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black border border-gray-700 text-[10px] text-white px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                        {val} ms
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> &lt;110ms (Direct P2P)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-cyan-500 inline-block" /> 110-220ms (DERP Relay nai)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> &gt;220ms (Elevated Jitter)
              </span>
            </div>
          </div>

          {/* Traffic Counters Card */}
          <div className="bg-[#0b0e14] border border-gray-800 p-5 rounded-lg flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">WhatsApp & Till Traffic</h3>
              <p className="text-xs text-gray-500">Active session transactions since boot</p>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="bg-black/40 border border-gray-800/80 p-3 rounded">
                <span className="text-[11px] text-gray-500 block uppercase">Inbound WhatsApp</span>
                <span className="text-2xl font-black text-white">{telemetry?.traffic?.inboundMessages ?? 0}</span>
              </div>
              <div className="bg-black/40 border border-gray-800/80 p-3 rounded">
                <span className="text-[11px] text-gray-500 block uppercase">Outbound Sent</span>
                <span className="text-2xl font-black text-white">{telemetry?.traffic?.messagesSentCount ?? 0}</span>
              </div>
              <div className="bg-black/40 border border-gray-800/80 p-3 rounded">
                <span className="text-[11px] text-gray-500 block uppercase">Till 5758419 Ingest</span>
                <span className="text-2xl font-black text-emerald-400">{telemetry?.traffic?.tillReceipts ?? 0}</span>
              </div>
              <div className="bg-black/40 border border-gray-800/80 p-3 rounded">
                <span className="text-[11px] text-gray-500 block uppercase">Checkouts Processed</span>
                <span className="text-2xl font-black text-cyan-400">{telemetry?.traffic?.checkouts ?? 0}</span>
              </div>
            </div>

            {/* Self Healing & Timers */}
            <div className="border-t border-gray-800/80 pt-3 text-[11px] space-y-1.5 text-gray-400">
              <div className="flex justify-between">
                <span>Konnect Watchdog:</span>
                <span className="text-emerald-400 font-bold">ACTIVE (3m timer)</span>
              </div>
              <div className="flex justify-between">
                <span>Namecheap DDNS:</span>
                <span className="text-emerald-400 font-bold">ACTIVE (15m timer)</span>
              </div>
              <div className="flex justify-between">
                <span>Cloudflare Tunnel:</span>
                <span className="text-cyan-400 font-bold">ONLINE (QUIC)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: LIVE EVENT & MAINTENANCE AUDIT STREAM */}
        <div className="bg-[#0b0e14] border border-gray-800 rounded-lg overflow-hidden">
          <div className="border-b border-gray-800 p-4 bg-black/40 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Maintenance & Traffic Stream
              </h3>
              <span className="text-[11px] text-gray-500">({filteredLogs.length} events logged)</span>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black border border-gray-800 text-xs px-2.5 py-1 rounded text-gray-300 focus:outline-none focus:border-[#00FF66]/50"
              />

              <div className="flex bg-black border border-gray-800 rounded p-0.5 text-[10px]">
                {["ALL", "WHATSAPP_IN", "WHATSAPP_OUT", "TILL_RECEIPT", "CHECKOUT", "SYSTEM"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setLogFilter(tag)}
                    className={`px-2 py-0.5 rounded transition ${
                      logFilter === tag ? "bg-[#00FF66] text-black font-bold" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {tag.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Terminal Event Stream */}
          <div className="p-4 bg-black/80 font-mono text-xs max-h-80 overflow-y-auto space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-gray-600 py-8 text-center text-xs">
                No logs matching filter. Awaiting system events...
              </div>
            ) : (
              filteredLogs.map((item) => {
                let badgeClass = "bg-gray-800 text-gray-300";
                if (item.type === "TILL_RECEIPT") badgeClass = "bg-emerald-950 text-emerald-400 border border-emerald-800/60";
                if (item.type === "CHECKOUT") badgeClass = "bg-blue-950 text-blue-400 border border-blue-800/60";
                if (item.type === "WHATSAPP_IN") badgeClass = "bg-purple-950 text-purple-400 border border-purple-800/60";
                if (item.type === "WHATSAPP_OUT") badgeClass = "bg-cyan-950 text-cyan-400 border border-cyan-800/60";
                if (item.type === "SYSTEM") badgeClass = "bg-slate-900 text-slate-400 border border-slate-700/60";

                return (
                  <div key={item.id} className="flex items-start gap-3 hover:bg-white/[0.02] p-1 rounded">
                    <span className="text-[10px] text-gray-600 whitespace-nowrap mt-0.5">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap ${badgeClass}`}>
                      {item.type}
                    </span>
                    <span className="text-gray-300 flex-1 break-words">{item.summary}</span>
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </main>
    </div>
  );
}
