import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase-client";
import { getCurrentUser } from "../services/auth-service";
import AdminHeader from "../components/AdminHeader";
import {
  ShieldExclamationIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  DocumentMagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  BugAntIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";

export default function AdminSecurity() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") {
      navigate("/login");
      return;
    }
    fetchSecurityData();

    // ── Setup Supabase Realtime listener for live security events ───
    let channel = null;
    try {
      if (supabase && typeof supabase.channel === "function") {
        channel = supabase
          .channel("admin-security-threats")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "events" },
            (payload) => {
              if (payload?.new?.event_type?.startsWith("security_alert_")) {
                const newRow = normalizeCloudEvent(payload.new);
                setAlerts((prev) => [newRow, ...prev]);
                showNotice(`🚨 Live Intercept: ${newRow.fileName || newRow.reason || "Suspicious Payload"}`);
              }
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") setRealtimeActive(true);
          });
      }
    } catch (err) {
      console.warn("Realtime subscription fallback", err);
    }

    return () => {
      if (channel && supabase && typeof supabase.removeChannel === "function") {
        supabase.removeChannel(channel);
      }
    };
  }, [navigate]);

  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // ── Normalizers ──────────────────────────────────────────────────
  const normalizeLocalLog = (log, index) => {
    const meta = log.metadata || {};
    return {
      id: `local-${index}-${log.timestamp}`,
      source: "local_storage",
      sourceLabel: "Local Audit Ledger",
      eventType: log.event_type || "security_alert_file_validation_failed",
      timestamp: log.timestamp || new Date().toISOString(),
      user: log.user || meta.attemptedByEmail || "anonymous",
      userId: log.user_id || null,
      shopId: log.shop_id || null,
      url: log.url || meta.url || "N/A",
      userAgent: meta.userAgent || "N/A",
      fileName: meta.fileName || "unnamed_file",
      fileSize: meta.fileSize || 0,
      claimedType: meta.claimedType || "unknown",
      reason: meta.reason || "file_validation_failed",
      metadata: meta
    };
  };

  const normalizeCloudEvent = (row) => {
    const meta = row.metadata || {};
    return {
      id: row.id || row.event_id || `cloud-${row.timestamp}`,
      source: "cloud_events",
      sourceLabel: "PostgreSQL Telemetry",
      eventType: row.event_type || "security_alert_file_validation_failed",
      timestamp: row.timestamp || row.created_at || new Date().toISOString(),
      user: meta.attemptedByEmail || row.user || "anonymous",
      userId: row.user_id || null,
      shopId: row.shop_id || null,
      url: meta.url || row.url || "N/A",
      userAgent: meta.userAgent || "N/A",
      fileName: meta.fileName || meta.filename || "unnamed_file",
      fileSize: meta.fileSize || meta.file_size || 0,
      claimedType: meta.claimedType || meta.claimed_type || "unknown",
      reason: meta.reason || row.event_type?.replace("security_alert_", "") || "unknown",
      metadata: meta
    };
  };

  // ── Multi-Tier Fetcher ───────────────────────────────────────────
  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Local Audit Ledger (savannah_security_file_logs)
      let localLogs = [];
      try {
        const raw = localStorage.getItem("savannah_security_file_logs");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            localLogs = parsed.map(normalizeLocalLog);
          }
        }
      } catch (err) {
        console.warn("Failed reading local audit logs", err);
      }

      // 2. Fetch Remote Database Telemetry (events table)
      let cloudLogs = [];
      try {
        if (supabase) {
          // Attempt with timestamp column first, fall back to created_at
          let res = await supabase
            .from("events")
            .select("*")
            .like("event_type", "security_alert_%")
            .order("timestamp", { ascending: false })
            .limit(100);

          if (res.error && res.error.message?.includes("timestamp")) {
            res = await supabase
              .from("events")
              .select("*")
              .like("event_type", "security_alert_%")
              .order("created_at", { ascending: false })
              .limit(100);
          }

          if (res.data) {
            cloudLogs = res.data.map(normalizeCloudEvent);
          }
        }
      } catch (err) {
        console.warn("Cloud telemetry query failed", err);
      }

      // 3. Deduplicate across local and cloud sources
      const combined = [...localLogs];
      cloudLogs.forEach((cl) => {
        const duplicate = combined.some(
          (item) =>
            item.fileName === cl.fileName &&
            Math.abs(new Date(item.timestamp).getTime() - new Date(cl.timestamp).getTime()) < 3000
        );
        if (!duplicate) {
          combined.push(cl);
        }
      });

      // Sort newest first
      combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAlerts(combined);
    } catch (err) {
      console.error("Critical error during security fetch", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Metrics Computation ──────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = alerts.length;
    const magicByteMismatches = alerts.filter(
      (a) => a.reason === "magic_bytes_mismatch" || a.eventType?.includes("file_validation")
    ).length;
    const binaryCsvs = alerts.filter(
      (a) => a.reason === "binary_in_csv" || a.reason?.includes("binary")
    ).length;
    const sizeViolations = alerts.filter(
      (a) => a.reason === "size_limit_exceeded"
    ).length;
    const uniqueActors = new Set(alerts.map((a) => a.user)).size;

    return {
      total,
      magicByteMismatches,
      binaryCsvs,
      sizeViolations,
      uniqueActors
    };
  }, [alerts]);

  // ── Filtering Logic ──────────────────────────────────────────────
  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      // Reason filter
      if (reasonFilter !== "all") {
        if (reasonFilter === "magic_bytes_mismatch" && item.reason !== "magic_bytes_mismatch") return false;
        if (reasonFilter === "binary_in_csv" && item.reason !== "binary_in_csv") return false;
        if (reasonFilter === "size_limit_exceeded" && item.reason !== "size_limit_exceeded") return false;
      }

      // Origin filter
      if (originFilter !== "all") {
        const urlLower = (item.url || "").toLowerCase();
        if (originFilter === "settings" && !urlLower.includes("settings")) return false;
        if (originFilter === "product" && !urlLower.includes("product")) return false;
        if (originFilter === "menu" && !urlLower.includes("menu")) return false;
        if (originFilter === "bulk" && !urlLower.includes("bulk")) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesFile = (item.fileName || "").toLowerCase().includes(term);
        const matchesUser = (item.user || "").toLowerCase().includes(term);
        const matchesReason = (item.reason || "").toLowerCase().includes(term);
        const matchesType = (item.claimedType || "").toLowerCase().includes(term);
        const matchesUrl = (item.url || "").toLowerCase().includes(term);
        if (!matchesFile && !matchesUser && !matchesReason && !matchesType && !matchesUrl) return false;
      }

      return true;
    });
  }, [alerts, reasonFilter, originFilter, searchTerm]);

  // ── Actions ──────────────────────────────────────────────────────
  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getReasonBadge = (reason) => {
    switch (reason) {
      case "magic_bytes_mismatch":
        return {
          label: "DISGUISED EXECUTABLE",
          desc: "Header bytes mismatched declared image MIME",
          bg: "bg-red-500/10 text-red-400 border-red-500/30"
        };
      case "binary_in_csv":
        return {
          label: "BINARY SHELLCODE IN CSV",
          desc: "Executable bytecode detected in spreadsheet text",
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/30"
        };
      case "size_limit_exceeded":
        return {
          label: "OVERSIZE PAYLOAD",
          desc: "File exceeded memory limit (5MB / 10MB)",
          bg: "bg-orange-500/10 text-orange-400 border-orange-500/30"
        };
      default:
        return {
          label: reason.replace(/_/g, " ").toUpperCase(),
          desc: "Blocked by validation policy",
          bg: "bg-slate-500/10 text-slate-400 border-slate-500/30"
        };
    }
  };

  const simulateTestThreat = async () => {
    const fakeLog = {
      event_type: "security_alert_file_validation_failed",
      user: user?.email || "security-auditor@ops.internal",
      user_id: user?.id || null,
      shop_id: user?.shop_id || null,
      metadata: {
        fileName: `simulated_malware_${Date.now().toString().slice(-4)}.php.jpg`,
        fileSize: 42,
        claimedType: "image/jpeg",
        reason: "magic_bytes_mismatch",
        attemptedByEmail: user?.email || "security-auditor@ops.internal",
        url: window.location.href,
        userAgent: navigator.userAgent
      },
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // Save to local storage
    try {
      const existing = localStorage.getItem("savannah_security_file_logs");
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(fakeLog);
      localStorage.setItem("savannah_security_file_logs", JSON.stringify(list.slice(0, 100)));
    } catch (e) {
      console.warn("Local storage simulation failed", e);
    }

    // Attempt cloud insertion if supabase available
    try {
      if (supabase) {
        await supabase.from("events").insert({
          event_type: fakeLog.event_type,
          user_id: fakeLog.user_id,
          shop_id: fakeLog.shop_id,
          metadata: fakeLog.metadata,
          timestamp: fakeLog.timestamp
        });
      }
    } catch (e) {
      // Non-blocking
    }

    showNotice("✅ Synthetic Disguised File Intercept generated and dispatched to audit trail.");
    fetchSecurityData();
  };

  const purgeLocalAuditTrail = () => {
    if (window.confirm("Purge the local browser security audit ledger? (Cloud events in PostgreSQL will remain intact)")) {
      localStorage.removeItem("savannah_security_file_logs");
      showNotice("🗑️ Local audit trail purged.");
      fetchSecurityData();
    }
  };

  const exportAuditReport = () => {
    if (alerts.length === 0) {
      alert("No security alerts available to export.");
      return;
    }
    const headers = ["Timestamp", "Source", "Event Type", "File Name", "File Size (Bytes)", "Claimed Type", "Reason", "User", "Origin URL"];
    const rows = alerts.map((a) => [
      a.timestamp,
      a.sourceLabel,
      a.eventType,
      `"${a.fileName || ""}"`,
      a.fileSize || 0,
      `"${a.claimedType || ""}"`,
      `"${a.reason || ""}"`,
      `"${a.user || ""}"`,
      `"${a.url || ""}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `security_intercept_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice("📥 Security audit ledger downloaded as CSV.");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-500/30 selection:text-red-200">
      <AdminHeader title="Security & Trust Center" user={user} backLink="/admin" />

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/30 px-6 py-2.5 text-xs text-emerald-300 font-mono flex items-center justify-between sticky top-16 z-40 backdrop-blur">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-500 hover:text-emerald-300">✕</button>
        </div>
      )}

      <main className="max-w-7xl w-full mx-auto p-6 flex-1 space-y-6">

        {/* ── Top Bar: Title & Primary Controls ────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-red-950/60 border border-red-800/50 text-red-400">
                <ShieldExclamationIcon className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Security & Threat Intercept Console
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-700/50">
                    AIR-GAP OBSERVABILITY
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspection of disguised polyglot uploads, bytecode tampered spreadsheets, and client payload gates.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={simulateTestThreat}
              className="text-xs font-mono font-semibold px-3 py-2 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 transition flex items-center gap-1.5 shadow-sm"
              title="Inject a synthetic disguised file event to test logging pipeline"
            >
              <BugAntIcon className="w-4 h-4 text-red-400" />
              Simulate Intercept
            </button>
            <button
              onClick={exportAuditReport}
              className="text-xs font-mono font-semibold px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
            >
              <ArrowDownTrayIcon className="w-4 h-4 text-slate-400" />
              Export Audit
            </button>
            <button
              onClick={purgeLocalAuditTrail}
              className="text-xs font-mono font-semibold px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-700 transition flex items-center gap-1.5"
              title="Clear browser local storage logs"
            >
              <TrashIcon className="w-4 h-4" />
              Clear Local
            </button>
            <button
              onClick={fetchSecurityData}
              className="text-xs font-mono font-semibold px-3 py-2 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/60 transition flex items-center gap-1.5"
            >
              <ArrowPathIcon className={`w-4 h-4 text-indigo-400 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              to="/admin/monitoring"
              className="text-xs font-mono font-semibold px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-900/50 transition flex items-center gap-1.5"
            >
              Live Telemetry →
            </Link>
          </div>
        </div>

        {/* ── Pulse Intel Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
            <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">Total Intercepts</div>
            <div className="text-2xl font-black text-white mt-1 font-mono">{metrics.total}</div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Multi-tier coverage
            </div>
          </div>

          <div className="bg-slate-900/70 border border-red-900/40 rounded-xl p-4 relative overflow-hidden">
            <div className="text-[10px] uppercase font-mono tracking-widest text-red-400 font-bold">Disguised Files</div>
            <div className="text-2xl font-black text-red-400 mt-1 font-mono">{metrics.magicByteMismatches}</div>
            <div className="text-[11px] text-slate-500 mt-1">Magic byte mismatch</div>
          </div>

          <div className="bg-slate-900/70 border border-amber-900/40 rounded-xl p-4 relative overflow-hidden">
            <div className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold">CSV Byte Injections</div>
            <div className="text-2xl font-black text-amber-400 mt-1 font-mono">{metrics.binaryCsvs}</div>
            <div className="text-[11px] text-slate-500 mt-1">Binary in spreadsheet</div>
          </div>

          <div className="bg-slate-900/70 border border-orange-900/40 rounded-xl p-4 relative overflow-hidden">
            <div className="text-[10px] uppercase font-mono tracking-widest text-orange-400 font-bold">Payload Overflows</div>
            <div className="text-2xl font-black text-orange-400 mt-1 font-mono">{metrics.sizeViolations}</div>
            <div className="text-[11px] text-slate-500 mt-1">&gt; 5MB / 10MB bounds</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 relative overflow-hidden col-span-2 md:col-span-1">
            <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">Telemetry Stream</div>
            <div className="text-sm font-bold text-white mt-1 font-mono flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${realtimeActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
              {realtimeActive ? "REALTIME ACTIVE" : "SYNCED ON DEMAND"}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{metrics.uniqueActors} unique callers</div>
          </div>
        </div>

        {/* ── Filters & Search ─────────────────────────────────────────── */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by file name, reason, claimed MIME, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition font-mono"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <FunnelIcon className="w-3.5 h-3.5" />
              <span>Reason:</span>
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-red-500 font-mono"
              >
                <option value="all">All Threats</option>
                <option value="magic_bytes_mismatch">Magic Bytes Mismatch</option>
                <option value="binary_in_csv">Binary in CSV</option>
                <option value="size_limit_exceeded">Size Limit Exceeded</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <span>Target:</span>
              <select
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-red-500 font-mono"
              >
                <option value="all">All Entry Points</option>
                <option value="settings">Settings (Logo & KYC)</option>
                <option value="product">Product Manager</option>
                <option value="menu">Menu Manager</option>
                <option value="bulk">Bulk Image Mapper</option>
              </select>
            </div>

            {(searchTerm || reasonFilter !== "all" || originFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setReasonFilter("all");
                  setOriginFilter("all");
                }}
                className="text-[11px] text-red-400 hover:text-red-300 font-mono uppercase underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── Security Intercept Ledger Table ───────────────────────────── */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-5 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/80 font-mono text-xs">
            <div className="text-slate-300 font-bold flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
              Intercepted Files & Payloads ({filteredAlerts.length})
            </div>
            <div className="text-slate-500 text-[11px]">
              Silent Ingestion (Zero Attacker Hint)
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 font-mono text-xs">
              <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
              Reading cloud & local audit ledgers...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-mono text-xs">
              <ShieldCheckIcon className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              Zero security violations matching filter criteria. File upload perimeter is clean.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">File Name & Claimed Type</th>
                    <th className="py-3 px-4">Violation Diagnosis</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Origin Entry Point</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4 text-right">Forensics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAlerts.map((alert) => {
                    const badge = getReasonBadge(alert.reason);
                    const isCritical = alert.reason === "magic_bytes_mismatch" || alert.reason === "binary_in_csv";

                    return (
                      <tr key={alert.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isCritical ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">
                              🛑 CRITICAL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                              ⚠️ WARNING
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="text-red-400">📄</span>
                            <span className="break-all">{alert.fileName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Claimed: <span className="text-slate-300">{alert.claimedType}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                            {badge.label}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5 max-w-xs truncate">
                            {badge.desc}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                          {formatBytes(alert.fileSize)}
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          <div className="text-slate-300 truncate" title={alert.url}>
                            {alert.url?.replace(/^https?:\/\/[^/]+/, "") || "N/A"}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px]">
                            {alert.user || "anonymous"}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              alert.source === "cloud_events"
                                ? "bg-indigo-950 text-indigo-300 border border-indigo-800"
                                : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            }`}
                          >
                            {alert.sourceLabel}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-[11px]" title={alert.timestamp}>
                          {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString("en-GB") : "N/A"}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedAlert(alert)}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-700 transition flex items-center gap-1 ml-auto"
                          >
                            <DocumentMagnifyingGlassIcon className="w-3.5 h-3.5 text-indigo-400" />
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* ── Forensics Inspection Modal ──────────────────────────────────── */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl font-mono text-xs">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-950 text-red-400 border border-red-800">
                  <ShieldExclamationIcon className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm">Forensic Threat Inspection</h3>
                  <p className="text-[10px] text-slate-400">ID: {selectedAlert.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase">File Name:</span>
                  <div className="text-white font-bold break-all">{selectedAlert.fileName}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase">Payload Size:</span>
                  <div className="text-white font-bold">{formatBytes(selectedAlert.fileSize)} ({selectedAlert.fileSize} bytes)</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase">Claimed MIME:</span>
                  <div className="text-indigo-400 font-bold">{selectedAlert.claimedType}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase">Diagnosis:</span>
                  <div className="text-red-400 font-bold">{selectedAlert.reason}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase">Attempted By:</span>
                  <div className="text-slate-200">{selectedAlert.user}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase">Recorded At:</span>
                  <div className="text-slate-200">{new Date(selectedAlert.timestamp).toUTCString()}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 text-[10px] uppercase">Origin URL:</span>
                  <div className="text-slate-300 break-all">{selectedAlert.url}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 text-[10px] uppercase">User Agent:</span>
                  <div className="text-slate-400 text-[10px] break-all">{selectedAlert.userAgent}</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Raw Event Metadata (JSON)</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedAlert, null, 2));
                      showNotice("📋 Copied forensic JSON to clipboard.");
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Copy JSON
                  </button>
                </div>
                <pre className="bg-black/90 p-4 rounded-xl border border-slate-800 text-[11px] text-emerald-400 overflow-x-auto max-h-60 leading-relaxed">
                  {JSON.stringify(selectedAlert, null, 2)}
                </pre>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
