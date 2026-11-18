import React, { useEffect, useState, useRef, useMemo } from "react";
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
  const [refreshInterval, setRefreshInterval] = useState(3000);

  // RTT & Ping Metrics
  const [rttHistory, setRttHistory] = useState([]);
  const [currentRtt, setCurrentRtt] = useState(null);
  const [minRtt, setMinRtt] = useState(null);
  const [maxRtt, setMaxRtt] = useState(null);
  const [avgRtt, setAvgRtt] = useState(null);
  const [relayMode, setRelayMode] = useState("Probing...");
  const [hangStatus, setHangStatus] = useState("HEALTHY"); // HEALTHY, STALLED, HANG_DETECTED
  const [lastProbeTime, setLastProbeTime] = useState(null);
  const [probeCount, setProbeCount] = useState(0);
  const [connectionError, setConnectionError] = useState(null);

  // Filters & Search
  const [logFilter, setLogFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);

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
      }, refreshInterval);
    }
    return () => clearInterval(timer);
  }, [user, navigate, autoRefresh, activeEndpoint, refreshInterval]);

  const handleEndpointChange = (url) => {
    setActiveEndpoint(url);
    localStorage.setItem("tms_obs_endpoint", url);
    setRttHistory([]);
    setProbeCount(0);
    setConnectionError(null);
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
      setConnectionError(null);
      setLastProbeTime(new Date());

      // Update RTT history & stats
      setRttHistory((prev) => {
        const next = [...prev.slice(-20), rttMs];
        const min = Math.min(...next);
        const max = Math.max(...next);
        const avg = Math.round(next.reduce((a, b) => a + b, 0) / next.length);
        setMinRtt(min);
        setMaxRtt(max);
        setAvgRtt(avg);
        return next;
      });

      // Classify transport path
      if (rttMs < 110) {
        setRelayMode("DIRECT P2P WIREGUARD");
      } else if (rttMs <= 240) {
        setRelayMode("DIRECTED RELAY (DERP nai)");
      } else {
        setRelayMode("HIGH-LATENCY / CGNAT");
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
    } catch (err) {
      setCurrentRtt(null);
      setHangStatus(err.name === "TimeoutError" ? "HANG_DETECTED" : "OFFLINE");
      setRelayMode("UNREACHABLE");
      setConnectionError(err.message || "Failed to reach edge endpoint");
    } finally {
      setLoading(false);
    }
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    const list = telemetry?.logs || [];
    return list.filter((log) => {
      const matchesFilter = logFilter === "ALL" || log.type === logFilter;
      const matchesSearch =
        !searchQuery ||
        log.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [telemetry, logFilter, searchQuery]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportAuditLog = () => {
    const blob = new Blob([JSON.stringify(telemetry || {}, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tms-observatory-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Memory calculation
  const totalMem = telemetry?.system?.totalMemMb || 7671;
  const usedMem = telemetry?.system?.usedMemMb || 1700;
  const memPct = Math.round((usedMem / totalMem) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-black pb-16">
      {/* Top Application Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Breadcrumb & Title */}
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Master Admin
            </Link>
            <span className="text-slate-700">/</span>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    hangStatus === "HEALTHY"
                      ? "bg-emerald-400"
                      : hangStatus === "STALLED"
                      ? "bg-amber-400"
                      : "bg-rose-500"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    hangStatus === "HEALTHY"
                      ? "bg-emerald-500"
                      : hangStatus === "STALLED"
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                />
              </span>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Edge Observatory
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Pavilion Node
                </span>
              </h1>
            </div>
          </div>

          {/* Right Controls: Target Switcher & Live Polling */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Segmented Target Switcher */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-xs font-medium">
              <button
                onClick={() => handleEndpointChange("http://100.73.175.118:8085")}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeEndpoint.includes("100.73.175.118")
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Tailscale Direct
              </button>
              <button
                onClick={() => handleEndpointChange("https://wa.missperpetual.cloud")}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeEndpoint.includes("missperpetual.cloud")
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Public Cloudflare Ingress
              </button>
            </div>

            {/* Refresh Interval Selector */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition flex items-center gap-1.5 ${
                autoRefresh
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
              {autoRefresh ? "Live: 3s" : "Paused"}
            </button>

            {/* Manual Probe Button */}
            <button
              onClick={runProbe}
              title="Trigger instant probe"
              disabled={loading}
              className="p-2 border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg transition hover:border-slate-700 disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Banner Alert (If connection is degraded or pending ICANN) */}
        {connectionError && (
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 flex items-start gap-3 text-amber-200 text-xs">
            <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1 space-y-1">
              <div className="font-semibold text-amber-300">Endpoint Diagnostic Notice</div>
              <p className="text-amber-300/80 leading-relaxed">
                Unable to reach target: <span className="font-mono text-amber-200">{activeEndpoint}</span>. If using Public Cloudflare Ingress, verify ICANN email confirmation in Namecheap. To monitor via local direct link, switch to <strong>Tailscale Direct</strong>.
              </p>
            </div>
          </div>
        )}

        {/* 4 PRIMARY EXECUTIVE KPI TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* TILE 1: Round-Trip Latency */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium uppercase tracking-wider">Round-Trip Time</span>
                <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                  {probeCount} probes
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-3xl font-black font-mono tracking-tight ${
                  currentRtt !== null
                    ? currentRtt < 120
                      ? "text-emerald-400"
                      : currentRtt < 220
                      ? "text-cyan-400"
                      : "text-amber-400"
                    : "text-rose-400"
                }`}>
                  {currentRtt !== null ? currentRtt : "--"}
                </span>
                <span className="text-xs text-slate-400 font-medium">ms latency</span>
              </div>
            </div>

            {/* Sparkline & Range */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Min: <strong className="text-slate-200">{minRtt || "--"}ms</strong></span>
                <span>Avg: <strong className="text-slate-200">{avgRtt || "--"}ms</strong></span>
                <span>Max: <strong className="text-slate-200">{maxRtt || "--"}ms</strong></span>
              </div>
              <div className="mt-2 flex items-end gap-1 h-4">
                {rttHistory.slice(-16).map((val, idx) => (
                  <div
                    key={idx}
                    style={{ height: `${Math.min(100, Math.max(20, (val / (maxRtt || 200)) * 100))}%` }}
                    className={`w-full rounded-xs transition-all ${
                      val < 120 ? "bg-emerald-500/60" : val < 220 ? "bg-cyan-500/60" : "bg-amber-500/60"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* TILE 2: Transport & Routing Mode */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Transport Routing</div>
              <div className="mt-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-200">
                  <span className={`w-2 h-2 rounded-full ${relayMode.includes("DIRECT") ? "bg-emerald-400" : "bg-cyan-400"}`} />
                  {relayMode}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  {relayMode.includes("DIRECT")
                    ? "Direct peer-to-peer WireGuard authenticated path."
                    : "Secure low-overhead relay via Nairobi DERP node."}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
              <span>Node: <strong className="text-slate-200">localhost-0</strong></span>
              <span>Wi-Fi: <strong className="text-slate-200">Raeith / Konnect</strong></span>
            </div>
          </div>

          {/* TILE 3: Memory & Hardware Sentinel */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium uppercase tracking-wider">Server Memory</span>
                <span className="font-mono text-[11px] text-emerald-400 font-bold">{memPct}%</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold font-mono text-white">{(usedMem / 1024).toFixed(1)} GB</span>
                  <span className="text-xs text-slate-400">of {(totalMem / 1024).toFixed(1)} GB</span>
                </div>
                {/* Clean Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      memPct < 60 ? "bg-emerald-500" : memPct < 85 ? "bg-amber-500" : "bg-rose-500"
                    }`}
                    style={{ width: `${memPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
              <span>Node Process: <strong className="text-slate-200">{telemetry?.system?.processRssMb || 92} MB</strong></span>
              <span>CPU Load: <strong className="text-slate-200 font-mono">{(telemetry?.system?.loadAverage || [0.08])[0]}</strong></span>
            </div>
          </div>

          {/* TILE 4: WhatsApp Gateway Sentinel */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium uppercase tracking-wider">WhatsApp Gateway</span>
                <span className="font-mono text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  Port 8085
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-base font-bold text-white">ONLINE</span>
                </div>
                <div className="text-[11px] font-mono text-slate-300 mt-1 truncate">
                  {telemetry?.whatsapp?.userJid || "+254 710 720 949"}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
              <span>Inbound: <strong className="text-slate-200">{telemetry?.traffic?.inboundMessages || 0}</strong></span>
              <span>Outbound: <strong className="text-slate-200">{telemetry?.traffic?.outboundMessages || 0}</strong></span>
              <span>Till Receipts: <strong className="text-slate-200">{telemetry?.traffic?.tillReceipts || 0}</strong></span>
            </div>
          </div>
        </div>

        {/* ROW 2: DETAILED SYSTEM TELEMETRY & EVENT STREAM */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Diagnostics & Specs (1/3) */}
          <div className="space-y-6">
            {/* Host Identity Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Node Architecture</h2>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Host Hardware</span>
                  <span className="font-medium text-slate-200">HP Pavilion Edge Node</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Tailscale IP</span>
                  <span className="font-mono text-emerald-400 font-semibold">100.73.175.118</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Public Domain</span>
                  <span className="font-mono text-slate-200 truncate max-w-[180px]">wa.missperpetual.cloud</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Public Gateway</span>
                  <span className="font-mono text-slate-200">c413f311 (Cloudflare)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Uptime</span>
                  <span className="font-mono text-slate-200">
                    {telemetry?.system?.systemUptime ? `${Math.floor(telemetry.system.systemUptime / 3600)}h ${Math.floor((telemetry.system.systemUptime % 3600) / 60)}m` : "Active"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Health Sentinel</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Autonomous (3m Watchdog)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Tools */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Observatory Tools</h2>
              <div className="space-y-2">
                <button
                  onClick={exportAuditLog}
                  className="w-full text-xs font-semibold py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center justify-center gap-2 border border-slate-700/60"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Audit Log (JSON)
                </button>
                <a
                  href={`${activeEndpoint}/api/status`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full text-xs font-semibold py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center justify-center gap-2 border border-slate-700/60"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open Raw Status Endpoint
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Live Event Audit Stream (2/3) */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm flex flex-col overflow-hidden">
            {/* Header & Filter Controls */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Live Event & Traffic Stream</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {filteredLogs.length} events
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Real-time incoming webhook, till receipt, and daemon events</p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-medium">
                {["ALL", "WHATSAPP", "TILL", "SYSTEM"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setLogFilter(f)}
                    className={`px-2.5 py-1 rounded-md transition ${
                      logFilter === f
                        ? "bg-slate-800 text-white font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="px-5 py-2.5 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search transactions, customer numbers, till codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-xs text-slate-400 hover:text-white">
                  Clear
                </button>
              )}
            </div>

            {/* Event List */}
            <div className="flex-1 overflow-y-auto max-h-[480px] divide-y divide-slate-800/60 p-2 sm:p-3">
              {filteredLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                  <svg className="w-8 h-8 mx-auto text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Observatory online. Waiting for incoming till receipts or messages.</p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl hover:bg-slate-800/50 transition flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold ${
                            log.type === "TILL_RECEIPT"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : log.type === "WHATSAPP_IN" || log.type === "WHATSAPP_OUT"
                              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {log.type}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 font-medium">{log.summary}</p>
                    </div>

                    <button
                      onClick={() => copyToClipboard(log.id, log.id)}
                      className="text-[11px] font-mono text-slate-400 hover:text-slate-200 transition py-1 px-2 rounded bg-slate-800/80 shrink-0"
                    >
                      {copiedId === log.id ? "Copied" : "Copy ID"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
