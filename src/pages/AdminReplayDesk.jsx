import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminHeader from "../components/AdminHeader";
import { supabase } from "../services/supabase-client";
import { 
  ArrowPathIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon, 
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  DevicePhoneMobileIcon,
  FunnelIcon,
  CommandLineIcon,
  BoltIcon,
  ScaleIcon,
  XMarkIcon,
  ClipboardDocumentCheckIcon
} from "@heroicons/react/24/outline";

export default function AdminReplayDesk() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const yesterday = new Date(Date.now() - 86400000);
    return yesterday.toISOString().split("T")[0];
  });
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [relayHealth, setRelayHealth] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Autonomous Governance Action State
  const [actionLoading, setActionLoading] = useState(null);
  const [actionResult, setActionResult] = useState(null);
  const [showEndpointsModal, setShowEndpointsModal] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(null);

  useEffect(() => {
    loadReplayData();
    fetchRelayHealth();
  }, [selectedDate]);

  async function fetchRelayHealth() {
    try {
      const res = await fetch("https://shop.tmsavannah.com/api/till/receipt?action=health");
      const data = await res.json();
      setRelayHealth(data);
    } catch (e) {
      console.warn("Relay health probe failed:", e);
    }
  }

  async function loadReplayData() {
    setLoading(true);
    try {
      const startIso = `${selectedDate}T00:00:00.000Z`;
      const endIso = `${selectedDate}T23:59:59.999Z`;

      // 1. Fetch Orders for Selected Date
      const { data: oData } = await supabase
        .from("orders")
        .select("id, shop_id, client_name, client_phone, total_price, status, mpesa_code, created_at, fulfillment_type, items")
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: true });

      // 2. Fetch Payments for Selected Date
      const { data: pData } = await supabase
        .from("payments")
        .select("id, order_id, amount, status, transaction_id, created_at, raw_payload")
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: true });

      // 3. Fetch Payment Audit Log
      const { data: aData } = await supabase
        .from("payment_audit_log")
        .select("id, amount, status, checkout_request_id, target_id, timestamp, raw_payload")
        .gte("timestamp", startIso)
        .lte("timestamp", endIso)
        .order("timestamp", { ascending: true });

      setOrders(oData || []);
      setPayments(pData || []);
      setAuditLogs(aData || []);
    } catch (err) {
      console.error("Forensic replay load failed:", err);
    } finally {
      setLoading(false);
    }
  }

  // --- GOVERNANCE ACTIONS ---
  async function handleExpireStale() {
    setActionLoading("expiring");
    try {
      const res = await fetch("https://shop.tmsavannah.com/api/till/receipt?action=expire_stale&minutes=30");
      const data = await res.json();
      setActionResult({
        type: data.success ? "success" : "error",
        message: data.message || `Processed order auto-expiry.`,
        details: data
      });
      await loadReplayData();
    } catch (e) {
      setActionResult({
        type: "error",
        message: `Auto-expiry request failed: ${e.message}`
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReconcileVariances() {
    setActionLoading("reconciling");
    try {
      const res = await fetch("https://shop.tmsavannah.com/api/till/receipt?action=reconcile_variances");
      const data = await res.json();
      setActionResult({
        type: "info",
        message: `Reconciliation categorized ${data.tariff_excise_count || 0} carrier excise deductions and ${data.customer_discrepancy_count || 0} customer discrepancies.`,
        details: data
      });
    } catch (e) {
      setActionResult({
        type: "error",
        message: `Variance classification failed: ${e.message}`
      });
    } finally {
      setActionLoading(null);
    }
  }

  function copyToClipboard(text, id) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedEndpoint(id);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  }

  // Summary Metrics
  const totalOrders = orders.length;
  const paidOrders = orders.filter(o => o.status === "paid" || o.status === "completed").length;
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const expiredOrders = orders.filter(o => o.status === "expired").length;
  const totalGmv = orders
    .filter(o => o.status === "paid" || o.status === "completed")
    .reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const totalReceipts = payments.length;
  const latestTillBalance = payments[payments.length - 1]?.raw_payload?.balance || "N/A";

  // Calculate Stale Pending Orders (>30m)
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
  const stalePendingList = orders.filter(o => o.status === "pending" && new Date(o.created_at).getTime() < thirtyMinutesAgo);

  // Build Unified Timeline Stream
  const timelineEvents = [];

  orders.forEach(o => {
    timelineEvents.push({
      type: "order",
      timestamp: new Date(o.created_at).getTime(),
      timeFormatted: new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      id: o.id,
      title: `Order #${o.id.slice(0, 8)}`,
      amount: o.total_price,
      customer: o.client_name || "Guest Customer",
      phone: o.client_phone || "N/A",
      status: o.status,
      mpesaCode: o.mpesa_code,
      fulfillment: o.fulfillment_type,
      raw: o
    });
  });

  payments.forEach(p => {
    timelineEvents.push({
      type: "payment",
      timestamp: new Date(p.created_at).getTime(),
      timeFormatted: new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      id: p.id,
      title: `Receipt ${p.transaction_id}`,
      amount: p.amount,
      customer: p.raw_payload?.name || "Anonymous M-Pesa",
      phone: p.raw_payload?.phone || "N/A",
      status: p.status,
      matchedOrderId: p.order_id,
      balance: p.raw_payload?.balance,
      variance: p.raw_payload?.balance_variance,
      rawSms: p.raw_payload?.sms,
      raw: p
    });
  });

  timelineEvents.sort((a, b) => a.timestamp - b.timestamp);

  const filteredTimeline = timelineEvents.filter(ev => {
    const matchesSearch = 
      ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.phone.includes(searchTerm) ||
      (ev.mpesaCode && ev.mpesaCode.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "orders") return matchesSearch && ev.type === "order";
    if (statusFilter === "payments") return matchesSearch && ev.type === "payment";
    if (statusFilter === "unmatched") return matchesSearch && ((ev.type === "order" && ev.status === "pending") || (ev.type === "payment" && !ev.matchedOrderId));
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      <AdminHeader title="Forensic Replay Desk" backLink="/admin" />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <ClockIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Order & Payment Forensic Replay</h1>
                <p className="text-xs text-slate-400 font-mono">Autonomous Settlement & Non-Linear Sequence Inspector</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Date Presets */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-mono">
              <button
                onClick={() => setSelectedDate(new Date(Date.now() - 86400000).toISOString().split("T")[0])}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedDate === new Date(Date.now() - 86400000).toISOString().split("T")[0]
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedDate === new Date().toISOString().split("T")[0]
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Today
              </button>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-mono px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500"
            />

            <button
              onClick={loadReplayData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white rounded-xl transition"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Autonomous Governance Action Center */}
        <div className="mb-6 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <BoltIcon className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300 font-mono">
                Autonomous Governance Center
              </span>
              <p className="text-[11px] text-slate-400 font-sans">
                Trigger autonomous settlement daemons or inspect exposed API contracts
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Auto-Expire Trigger */}
            <button
              onClick={handleExpireStale}
              disabled={actionLoading !== null}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-xl transition font-mono disabled:opacity-50"
            >
              <BoltIcon className={`w-4 h-4 ${actionLoading === "expiring" ? "animate-spin" : ""}`} />
              <span>Expire Stale Orders</span>
              {stalePendingList.length > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[10px] rounded-full font-black">
                  {stalePendingList.length}
                </span>
              )}
            </button>

            {/* Reconcile Variances Trigger */}
            <button
              onClick={handleReconcileVariances}
              disabled={actionLoading !== null}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl transition font-mono disabled:opacity-50"
            >
              <ScaleIcon className={`w-4 h-4 ${actionLoading === "reconciling" ? "animate-spin" : ""}`} />
              <span>Auto-Categorize Variances</span>
            </button>

            {/* Endpoints Directory Drawer Trigger */}
            <button
              onClick={() => setShowEndpointsModal(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-xl transition font-mono"
            >
              <CommandLineIcon className="w-4 h-4" />
              <span>Expose API Endpoints</span>
            </button>
          </div>
        </div>

        {/* Action Result Feedback Banner */}
        {actionResult && (
          <div className={`mb-6 p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs font-mono animate-fade-in ${
            actionResult.type === "success" 
              ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
              : actionResult.type === "info"
              ? "bg-indigo-950/30 border-indigo-500/40 text-indigo-300"
              : "bg-rose-950/30 border-rose-500/40 text-rose-300"
          }`}>
            <div className="flex items-start gap-2.5">
              {actionResult.type === "success" ? (
                <CheckCircleIcon className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
              ) : actionResult.type === "info" ? (
                <ShieldCheckIcon className="w-4 h-4 flex-shrink-0 text-indigo-400 mt-0.5" />
              ) : (
                <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              )}
              <div>
                <p className="font-bold">{actionResult.message}</p>
                {actionResult.details && actionResult.details.variances && (
                  <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                    {actionResult.details.variances.slice(0, 3).map((v, i) => (
                      <div key={i}>
                        • Receipt <strong>{v.transaction_id}</strong>: {v.category} ({v.rationale})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setActionResult(null)}
              className="text-slate-400 hover:text-white"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Relay Phone Heartbeat Bar */}
        {relayHealth && (
          <div className={`mb-6 p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            relayHealth.is_online 
              ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300" 
              : "bg-amber-950/20 border-amber-500/30 text-amber-300"
          }`}>
            <div className="flex items-center gap-3">
              <DevicePhoneMobileIcon className="w-5 h-5 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold uppercase tracking-wider font-mono mr-2">
                  Relay Hardware: {relayHealth.device_id || "redmi_note_12"}
                </span>
                <span className="text-slate-400">
                  Status: <strong className={relayHealth.is_online ? "text-emerald-400" : "text-amber-400"}>{relayHealth.status}</strong> • Battery: {relayHealth.device_info?.battery}% • Latency: {relayHealth.latency_minutes}m
                </span>
              </div>
            </div>
            {!relayHealth.is_online && (
              <span className="text-[11px] font-mono bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-amber-300">
                {relayHealth.alert || "Check phone Wi-Fi or battery"}
              </span>
            )}
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-8">
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">Total Orders</span>
            <div className="text-2xl font-black text-white mt-1">{totalOrders}</div>
            <span className="text-[11px] text-slate-500 font-mono">
              {paidOrders} Paid • {pendingOrders} Pending {expiredOrders > 0 && `• ${expiredOrders} Expired`}
            </span>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
            <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-bold">Total GMV</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">KES {totalGmv.toLocaleString()}</div>
            <span className="text-[11px] text-slate-500 font-mono">Settled Revenue</span>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">M-Pesa Receipts</span>
            <div className="text-2xl font-black text-white mt-1">{totalReceipts}</div>
            <span className="text-[11px] text-slate-500 font-mono">Ingested from Till</span>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">Settlement Rate</span>
            <div className="text-2xl font-black text-white mt-1">
              {totalOrders > 0 ? ((paidOrders / totalOrders) * 100).toFixed(0) : 0}%
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Auto-Reconciled</span>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">Latest Balance</span>
            <div className="text-2xl font-black text-white mt-1">
              {typeof latestTillBalance === "number" ? `KES ${latestTillBalance.toFixed(2)}` : latestTillBalance}
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Till 5758419</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Order #, M-Pesa Code, Phone, or Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 pl-9 pr-4 py-2.5 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs font-mono">
            {[
              { id: "all", label: "All Events" },
              { id: "orders", label: "Orders Only" },
              { id: "payments", label: "Receipts Only" },
              { id: "unmatched", label: "Attention Items" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition ${
                  statusFilter === tab.id
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Feed */}
        {loading ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800">
            <ArrowPathIcon className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-mono text-slate-400">Loading forensic events for {selectedDate}...</p>
          </div>
        ) : filteredTimeline.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800">
            <ShieldCheckIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-mono text-slate-400">No events found matching your criteria for {selectedDate}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTimeline.map((item) => {
              const isOrder = item.type === "order";
              const isPaid = isOrder && (item.status === "paid" || item.status === "completed");
              const isExpired = isOrder && item.status === "expired";
              const isUnmatchedPayment = !isOrder && !item.matchedOrderId;

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`p-4 rounded-2xl border transition hover:border-slate-700 ${
                    isOrder 
                      ? isPaid 
                        ? "bg-slate-900/80 border-slate-800" 
                        : isExpired
                        ? "bg-slate-950/60 border-slate-800/80 opacity-70"
                        : "bg-amber-950/10 border-amber-500/20"
                      : isUnmatchedPayment
                      ? "bg-rose-950/10 border-rose-500/30"
                      : "bg-emerald-950/10 border-emerald-500/20"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className={`p-2.5 rounded-xl border flex-shrink-0 mt-0.5 ${
                        isOrder 
                          ? isPaid
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : isExpired
                            ? "bg-slate-800 border-slate-700 text-slate-400"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : isUnmatchedPayment
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      }`}>
                        {isOrder ? (
                          <span className="font-bold text-xs font-mono">ORD</span>
                        ) : (
                          <span className="font-bold text-xs font-mono">PAY</span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-slate-400">{item.timeFormatted}</span>
                          <span className="font-bold text-sm text-white">{item.title}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                            isOrder
                              ? isPaid 
                                ? "bg-emerald-500/20 text-emerald-400" 
                                : isExpired
                                ? "bg-slate-800 text-slate-400 border border-slate-700"
                                : "bg-amber-500/20 text-amber-400"
                              : isUnmatchedPayment ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                          }`}>
                            {isOrder ? item.status : (isUnmatchedPayment ? "UNCLAIMED POOLED" : "MATCHED")}
                          </span>
                          {item.mpesaCode && (
                            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              M-Pesa: {item.mpesaCode}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>👤 {item.customer}</span>
                          <span>📞 {item.phone}</span>
                          {item.fulfillment && <span>📦 {item.fulfillment}</span>}
                          {item.balance && <span>🏦 Till Balance: KES {item.balance}</span>}
                          {item.variance !== undefined && item.variance !== null && (
                            <span className={`font-mono px-1.5 py-0.2 rounded ${
                              item.variance === 0 
                                ? "text-emerald-400 bg-emerald-500/10" 
                                : Math.abs(item.variance) <= 35
                                ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20"
                                : "text-amber-400 bg-amber-500/10"
                            }`}>
                              Variance: {item.variance > 0 ? `+${item.variance}` : item.variance}
                              {Math.abs(item.variance) <= 35 && item.variance !== 0 ? " [Tariff Excise]" : ""}
                            </span>
                          )}
                        </div>

                        {item.rawSms && (
                          <p className="text-[11px] font-mono text-slate-500 mt-2 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60 leading-relaxed">
                            {item.rawSms}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right sm:self-center self-end">
                      <div className="text-base font-black text-white font-mono">
                        KES {Number(item.amount).toFixed(2)}
                      </div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                        {isOrder ? "Order Value" : "Amount Ingested"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Exposed API Endpoints Modal */}
        {showEndpointsModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <CommandLineIcon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Live API Endpoints Directory</h2>
                    <p className="text-xs text-slate-400 font-mono">Production Integration & Autonomous Daemon Contracts</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEndpointsModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* 1. Edge Serverless Gateway Endpoints */}
                <div>
                  <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-emerald-400 mb-3">
                    1. Edge Serverless Router (Vercel Ingress — shop.tmsavannah.com)
                  </h3>

                  <div className="space-y-3 font-mono text-xs">
                    {/* Expire Stale Orders */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 font-bold rounded text-[10px]">GET / POST</span>
                          <span className="text-white font-bold">/api/till/receipt?action=expire_stale</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard("curl -X POST 'https://shop.tmsavannah.com/api/till/receipt?action=expire_stale&minutes=30'", "exp_edge")}
                          className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                        >
                          {copiedEndpoint === "exp_edge" ? <ClipboardDocumentCheckIcon className="w-4 h-4 text-emerald-400" /> : "Copy cURL"}
                        </button>
                      </div>
                      <p className="text-slate-400 text-[11px] font-sans">
                        Cancels pending orders older than 30 minutes, frees reservations, and logs event audit trail.
                      </p>
                    </div>

                    {/* Reconcile Variances */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 font-bold rounded text-[10px]">GET / POST</span>
                          <span className="text-white font-bold">/api/till/receipt?action=reconcile_variances</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard("curl 'https://shop.tmsavannah.com/api/till/receipt?action=reconcile_variances'", "rec_edge")}
                          className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                        >
                          {copiedEndpoint === "rec_edge" ? <ClipboardDocumentCheckIcon className="w-4 h-4 text-emerald-400" /> : "Copy cURL"}
                        </button>
                      </div>
                      <p className="text-slate-400 text-[11px] font-sans">
                        Auto-categorizes variances into Safaricom carrier excise tariffs (&lt;= KES 35) vs customer underpayments.
                      </p>
                    </div>

                    {/* Till Relay Health */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold rounded text-[10px]">GET</span>
                          <span className="text-white font-bold">/api/till/receipt?action=health</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard("curl 'https://shop.tmsavannah.com/api/till/receipt?action=health'", "health_edge")}
                          className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                        >
                          {copiedEndpoint === "health_edge" ? <ClipboardDocumentCheckIcon className="w-4 h-4 text-emerald-400" /> : "Copy cURL"}
                        </button>
                      </div>
                      <p className="text-slate-400 text-[11px] font-sans">
                        Dead-man's switch heartbeat probe for the physical till relay phone (battery, network, ping latency).
                      </p>
                    </div>

                    {/* Forensic Analytics */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 font-bold rounded text-[10px]">GET</span>
                          <span className="text-white font-bold">/api/till/receipt?action=analytics</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard("curl 'https://shop.tmsavannah.com/api/till/receipt?action=analytics'", "an_edge")}
                          className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                        >
                          {copiedEndpoint === "an_edge" ? <ClipboardDocumentCheckIcon className="w-4 h-4 text-emerald-400" /> : "Copy cURL"}
                        </button>
                      </div>
                      <p className="text-slate-400 text-[11px] font-sans">
                        Full daily order and payment sequence stream for cross-system ledger auditing.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Cloud Microservice Backend Endpoints */}
                <div>
                  <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-purple-400 mb-3">
                    2. Cloud Microservice Backend (FastAPI — api.tmsavannah.com)
                  </h3>

                  <div className="space-y-3 font-mono text-xs">
                    {/* Backend Expire Stale */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 font-bold rounded text-[10px]">POST</span>
                          <span className="text-white font-bold">/api/v1/orders/expire-stale?threshold_minutes=30</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard("curl -X POST 'https://api.tmsavannah.com/api/v1/orders/expire-stale?threshold_minutes=30'", "exp_back")}
                          className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                        >
                          {copiedEndpoint === "exp_back" ? <ClipboardDocumentCheckIcon className="w-4 h-4 text-emerald-400" /> : "Copy cURL"}
                        </button>
                      </div>
                      <p className="text-slate-400 text-[11px] font-sans">
                        Python FastAPI background engine to auto-cancel stale orders in PostgreSQL.
                      </p>
                    </div>

                    {/* Backend Reconcile Variances */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 font-bold rounded text-[10px]">POST</span>
                          <span className="text-white font-bold">/api/v1/finances/reconcile-variances?tolerance_kes=35.0</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard("curl -X POST 'https://api.tmsavannah.com/api/v1/finances/reconcile-variances?tolerance_kes=35.0'", "rec_back")}
                          className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                        >
                          {copiedEndpoint === "rec_back" ? <ClipboardDocumentCheckIcon className="w-4 h-4 text-emerald-400" /> : "Copy cURL"}
                        </button>
                      </div>
                      <p className="text-slate-400 text-[11px] font-sans">
                        Reconciles ledger discrepancies against Safaricom tariff bands.
                      </p>
                    </div>

                    {/* Backend Health */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold rounded text-[10px]">GET</span>
                          <span className="text-white font-bold">/health</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard("curl 'https://api.tmsavannah.com/health'", "h_back")}
                          className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                        >
                          {copiedEndpoint === "h_back" ? <ClipboardDocumentCheckIcon className="w-4 h-4 text-emerald-400" /> : "Copy cURL"}
                        </button>
                      </div>
                      <p className="text-slate-400 text-[11px] font-sans">
                        Backend container liveness, DB connection pool, and Prometheus metrics.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowEndpointsModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl transition"
                >
                  Close Directory
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}