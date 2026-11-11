import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AdminHeader from "../components/AdminHeader";
import { supabase } from "../services/supabase-client";
import { getCurrentUser } from "../services/auth-service";
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
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  BuildingStorefrontIcon,
  ShoppingBagIcon,
  FireIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  NoSymbolIcon
} from "@heroicons/react/24/outline";

export default function AdminReplayDesk() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = getCurrentUser();

  // Mode: "radar" (In-Checkout & Leads Radar) or "replay" (Forensic Replay & Till)
  const initialMode = searchParams.get("mode") || (window.location.pathname.includes("leads") ? "radar" : "radar");
  const [deskMode, setDeskMode] = useState(initialMode);

  // Common Replay State
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

  // --- IN-CHECKOUT & LEADS RADAR STATE ---
  const [radarLoading, setRadarLoading] = useState(true);
  const [liveLeads, setLiveLeads] = useState([]);
  const [expiredLeadsToday, setExpiredLeadsToday] = useState([]);
  const [shopsMap, setShopsMap] = useState({});
  const [shopsList, setShopsList] = useState([]);
  const [radarFilter, setRadarFilter] = useState("active"); // "active", "expiring", "expired", "all"
  const [selectedShopFilter, setSelectedShopFilter] = useState("all");
  const [now, setNow] = useState(Date.now());
  const [manualConfirmingId, setManualConfirmingId] = useState(null);
  const [manualExpiringId, setManualExpiringId] = useState(null);

  const RELAY_SECRET = "savannah_relay_sec_7f9b2c81e3a4d650";

  // Dynamic live clock for countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Strictly restrict access to authenticated platform admins
    if (!user || (user.system_role !== "system_admin" && user.role !== "admin")) {
      navigate("/login");
      return;
    }
    loadReplayData();
    fetchRelayHealth();
    fetchShops();
    fetchRadarLeads();

    // Subscribe to real-time changes on orders
    const channel = supabase
      .channel("ops-radar-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchRadarLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, navigate]);

  // Sync mode with query param
  const switchDeskMode = (mode) => {
    setDeskMode(mode);
    setSearchParams({ mode });
  };

  async function fetchShops() {
    try {
      const { data } = await supabase.from("shops").select("id, shop_id, name, subdomain, logo_url").eq("is_active", true);
      if (data) {
        const map = {};
        data.forEach(s => {
          if (s.shop_id) map[s.shop_id] = s;
          if (s.id) map[s.id] = s;
        });
        setShopsMap(map);
        setShopsList(data);
      }
    } catch (e) {
      console.warn("Failed to load shops:", e);
    }
  }

  async function fetchRadarLeads() {
    setRadarLoading(true);
    try {
      // 1. Fetch all active pending orders across all shops
      const { data: pendingData, error: pendingErr } = await supabase
        .from("orders")
        .select(`*, order_items (id, menu_item_id, quantity, price, menu_items (name))`)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (pendingErr) console.warn("Pending query error:", pendingErr);

      // 2. Fetch today's expired orders for lead retrieval
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: expiredData, error: expErr } = await supabase
        .from("orders")
        .select(`*, order_items (id, menu_item_id, quantity, price, menu_items (name))`)
        .eq("status", "expired")
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: false });

      if (expErr) console.warn("Expired query error:", expErr);

      setLiveLeads(pendingData || []);
      setExpiredLeadsToday(expiredData || []);
    } catch (err) {
      console.error("Failed to load radar leads:", err);
    } finally {
      setRadarLoading(false);
    }
  }

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

  // --- MANUAL RADAR ACTIONS ---
  async function handleForceConfirmPaid(orderId) {
    if (!window.confirm("Confirm this order as PAID manually? This will instantly ring the merchant kitchen chime and push it into food prep.")) return;
    setManualConfirmingId(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;
      setActionResult({
        type: "success",
        message: `Order #${orderId.slice(0, 8)} manually marked as PAID. Kitchen alerted!`
      });
      await fetchRadarLeads();
      await loadReplayData();
    } catch (e) {
      alert(`Failed to update order status: ${e.message}`);
    } finally {
      setManualConfirmingId(null);
    }
  }

  async function handleForceExpireOrder(orderId) {
    if (!window.confirm("Expire and cancel this checkout? Inventory reservations will be returned.")) return;
    setManualExpiringId(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;
      setActionResult({
        type: "info",
        message: `Order #${orderId.slice(0, 8)} expired and inventory de-allocated.`
      });
      await fetchRadarLeads();
      await loadReplayData();
    } catch (e) {
      alert(`Failed to expire order: ${e.message}`);
    } finally {
      setManualExpiringId(null);
    }
  }

  // --- GOVERNANCE ACTIONS (Cryptographically Authenticated) ---
  async function handleExpireStale() {
    setActionLoading("expiring");
    try {
      const res = await fetch("https://shop.tmsavannah.com/api/till/receipt?action=expire_stale&minutes=30", {
        method: "POST",
        headers: {
          "x-till-relay-secret": RELAY_SECRET
        }
      });
      const data = await res.json();
      setActionResult({
        type: data.success ? "success" : "error",
        message: data.message || `Processed order auto-expiry.`,
        details: data
      });
      await fetchRadarLeads();
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
      const res = await fetch("https://shop.tmsavannah.com/api/till/receipt?action=reconcile_variances", {
        headers: {
          "x-till-relay-secret": RELAY_SECRET
        }
      });
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

  // --- REPLAY METRICS ---
  const totalOrders = orders.length;
  const paidOrders = orders.filter(o => o.status === "paid" || o.status === "completed").length;
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const expiredOrders = orders.filter(o => o.status === "expired").length;
  const totalGmv = orders
    .filter(o => o.status === "paid" || o.status === "completed")
    .reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const totalReceipts = payments.length;
  const latestTillBalance = payments[payments.length - 1]?.raw_payload?.balance || "N/A";

  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
  const stalePendingList = orders.filter(o => o.status === "pending" && new Date(o.created_at).getTime() < thirtyMinutesAgo);

  // --- RADAR METRICS ---
  const activeCheckouts = liveLeads.filter(o => (now - new Date(o.created_at).getTime()) <= 30 * 60 * 1000);
  const expiringSoonCheckouts = liveLeads.filter(o => {
    const elapsed = now - new Date(o.created_at).getTime();
    return elapsed >= 20 * 60 * 1000 && elapsed <= 30 * 60 * 1000;
  });
  const stalePendingRadar = liveLeads.filter(o => (now - new Date(o.created_at).getTime()) > 30 * 60 * 1000);
  const totalRadarValueAtRisk = activeCheckouts.reduce((sum, o) => sum + Number(o.total_price || 0), 0);

  // Filtered Leads for Radar Feed
  const filteredRadarLeads = useMemo(() => {
    let pool = [];
    if (radarFilter === "active") {
      pool = activeCheckouts;
    } else if (radarFilter === "expiring") {
      pool = expiringSoonCheckouts;
    } else if (radarFilter === "expired") {
      pool = expiredLeadsToday;
    } else {
      pool = [...liveLeads, ...expiredLeadsToday];
    }

    if (selectedShopFilter !== "all") {
      pool = pool.filter(l => l.shop_id === selectedShopFilter);
    }

    if (!searchTerm) return pool;

    const term = searchTerm.toLowerCase();
    return pool.filter(l => {
      const shopName = shopsMap[l.shop_id]?.name?.toLowerCase() || "";
      const cust = l.client_name?.toLowerCase() || "";
      const phone = l.client_phone || "";
      const id = l.id.toLowerCase();
      return shopName.includes(term) || cust.includes(term) || phone.includes(term) || id.includes(term);
    });
  }, [radarFilter, activeCheckouts, expiringSoonCheckouts, expiredLeadsToday, liveLeads, selectedShopFilter, searchTerm, shopsMap]);

  // Build Unified Timeline Stream for Replay
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
      <AdminHeader title="Platform Command Center" backLink="/admin" />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        {/* Top Operational Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                {deskMode === "radar" ? (
                  <FireIcon className="w-6 h-6 text-emerald-400" />
                ) : (
                  <ClockIcon className="w-6 h-6 text-emerald-400" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  <span>{deskMode === "radar" ? "In-Checkout & Leads Radar" : "Order & Payment Forensic Replay"}</span>
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-mono">
                  {deskMode === "radar" 
                    ? "Live Pipeline Monitoring • 1-Tap WhatsApp Nudges • Merchant Kitchen Shield" 
                    : "Autonomous Settlement & Non-Linear Sequence Inspector • Master Till 5758419"}
                </p>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-1.5 text-xs font-mono shadow-inner">
            <button
              onClick={() => switchDeskMode("radar")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
                deskMode === "radar"
                  ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FireIcon className="w-4 h-4" />
              <span>In-Checkout Radar</span>
              {activeCheckouts.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  deskMode === "radar" ? "bg-slate-950 text-emerald-400" : "bg-emerald-500/20 text-emerald-300"
                }`}>
                  {activeCheckouts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => switchDeskMode("replay")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
                deskMode === "replay"
                  ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ClockIcon className="w-4 h-4" />
              <span>Forensic Replay</span>
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

        {/* ========================================================================= */}
        {/* DESK MODE A: IN-CHECKOUT & LEADS RADAR */}
        {/* ========================================================================= */}
        {deskMode === "radar" && (
          <div>
            {/* Autonomous Action & Sentinel Header */}
            <div className="mb-6 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <BoltIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono">
                    Autonomous Cart Recovery & Expiry Sentinel
                  </span>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Merchants never see pending or expired orders. Ops monitors the unconfirmed funnel and triggers 1-tap WhatsApp concierge recovery.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                <button
                  onClick={handleExpireStale}
                  disabled={actionLoading !== null}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-xl transition font-mono disabled:opacity-50"
                >
                  <BoltIcon className={`w-4 h-4 ${actionLoading === "expiring" ? "animate-spin" : ""}`} />
                  <span>Expire Stale Carts (&gt;30m)</span>
                  {stalePendingRadar.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[10px] rounded-full font-black">
                      {stalePendingRadar.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={fetchRadarLeads}
                  disabled={radarLoading}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white rounded-xl transition font-mono"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${radarLoading ? "animate-spin text-emerald-400" : ""}`} />
                  <span>Sync Radar</span>
                </button>
              </div>
            </div>

            {/* Radar Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-8">
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">Active In-Checkout</span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <div className="text-2xl font-black text-white mt-1">{activeCheckouts.length}</div>
                <span className="text-[11px] text-emerald-400 font-mono">Live customer checkouts</span>
              </div>

              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
                <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold">Pipeline At Risk</span>
                <div className="text-2xl font-black text-amber-400 mt-1">KES {totalRadarValueAtRisk.toLocaleString()}</div>
                <span className="text-[11px] text-slate-500 font-mono">Unpaid basket value</span>
              </div>

              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
                <span className="text-[10px] uppercase font-mono tracking-widest text-rose-400 font-bold">Expiring Soon (&lt;10m)</span>
                <div className="text-2xl font-black text-rose-400 mt-1">{expiringSoonCheckouts.length}</div>
                <span className="text-[11px] text-slate-500 font-mono">Urgent nudge candidates</span>
              </div>

              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
                <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 font-bold">Recoverable Leads Today</span>
                <div className="text-2xl font-black text-indigo-400 mt-1">{expiredLeadsToday.length}</div>
                <span className="text-[11px] text-slate-500 font-mono">Expired orders today</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Customer, Phone, Order #, or Shop..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 pl-9 pr-4 py-2.5 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                {/* Shop filter dropdown */}
                <select
                  value={selectedShopFilter}
                  onChange={(e) => setSelectedShopFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Pilot Shops ({shopsList.length})</option>
                  {shopsList.map(s => (
                    <option key={s.id || s.shop_id} value={s.shop_id || s.id}>
                      {s.name} ({s.subdomain})
                    </option>
                  ))}
                </select>

                {/* Status tabs */}
                {[
                  { id: "active", label: `Active In-Checkout (${activeCheckouts.length})` },
                  { id: "expiring", label: `Urgent (<10m) (${expiringSoonCheckouts.length})` },
                  { id: "expired", label: `Expired Leads Today (${expiredLeadsToday.length})` },
                  { id: "all", label: `All In Radar (${liveLeads.length + expiredLeadsToday.length})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setRadarFilter(tab.id)}
                    className={`px-3 py-2 rounded-xl border whitespace-nowrap transition ${
                      radarFilter === tab.id
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Radar Feed Cards */}
            {radarLoading ? (
              <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800">
                <ArrowPathIcon className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
                <p className="text-sm font-mono text-slate-400">Scanning real-time checkout stream...</p>
              </div>
            ) : filteredRadarLeads.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800">
                <ShieldCheckIcon className="w-10 h-10 text-emerald-500/40 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white font-mono">Radar Clear</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  No unconfirmed carts in this filter. Merchant kitchens are 100% shielded from noise.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRadarLeads.map(lead => {
                  const shop = shopsMap[lead.shop_id] || { name: "Merchant", subdomain: lead.shop_id };
                  const createdMs = new Date(lead.created_at).getTime();
                  const elapsedMs = now - createdMs;
                  const remainingMs = Math.max(0, 30 * 60 * 1000 - elapsedMs);
                  const remainingMinutes = Math.floor(remainingMs / 60000);
                  const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
                  const isExpired = lead.status === "expired" || remainingMs === 0;
                  const isExpiringSoon = !isExpired && remainingMinutes < 10;
                  const pct = Math.min(100, Math.max(0, (elapsedMs / (30 * 60 * 1000)) * 100));

                  // Clean customer phone number for WhatsApp wa.me link
                  const cleanPhone = (lead.client_phone || "").replace(/[^0-9]/g, "");
                  const phoneWithCountry = cleanPhone.startsWith("0") 
                    ? "254" + cleanPhone.slice(1) 
                    : (cleanPhone.startsWith("254") ? cleanPhone : "254" + cleanPhone);
                  
                  const nudgeMessage = `Hi ${lead.client_name || "there"}! 👋 We noticed you started an order of KES ${Number(lead.total_price || 0).toLocaleString()} at ${shop.name}. Do you need any assistance completing your M-Pesa payment to Till 5758419?`;
                  const waUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(nudgeMessage)}`;

                  return (
                    <div
                      key={lead.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isExpiringSoon
                          ? "bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/30"
                          : isExpired
                          ? "bg-slate-900/40 border-slate-800/80 opacity-75"
                          : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        {/* Left Info: Shop & Customer */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                              {shop.name}
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                              #{lead.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {new Date(lead.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {" • "}
                              {Math.floor(elapsedMs / 60000)}m ago
                            </span>
                            {lead.order_type && (
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-800 rounded-lg text-slate-300">
                                {lead.order_type}
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline gap-3 flex-wrap">
                            <h3 className="text-base font-bold text-white">
                              {lead.client_name || "Guest Customer"}
                            </h3>
                            <a 
                              href={`tel:${lead.client_phone}`}
                              className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
                            >
                              <PhoneIcon className="w-3.5 h-3.5" />
                              {lead.client_phone || "No phone"}
                            </a>
                            <span className="text-sm font-black font-mono text-amber-400">
                              KES {Number(lead.total_price || 0).toLocaleString()}
                            </span>
                          </div>

                          {/* Items summary */}
                          <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-slate-400 font-mono">
                            <span className="text-slate-500">Cart:</span>
                            {lead.order_items && lead.order_items.length > 0 ? (
                              lead.order_items.map((it, idx) => (
                                <span key={idx} className="bg-slate-800/80 px-2 py-0.5 rounded-md text-[11px] text-slate-300">
                                  {it.quantity}x {it.menu_items?.name || "Item"}
                                </span>
                              ))
                            ) : lead.items && typeof lead.items === "object" ? (
                              <span className="italic text-slate-400 text-xs">{JSON.stringify(lead.items).slice(0, 60)}...</span>
                            ) : (
                              <span className="italic text-slate-500">Checkout Cart</span>
                            )}
                          </div>
                        </div>

                        {/* Middle: Expiry Countdown Progress */}
                        <div className="w-full lg:w-64">
                          <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                            <span className={`font-bold ${isExpired ? "text-slate-500" : isExpiringSoon ? "text-rose-400" : "text-amber-400"}`}>
                              {isExpired ? "⚠️ Auto-Expired" : `⏳ ${remainingMinutes}m ${remainingSeconds}s remaining`}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              30m SLA
                            </span>
                          </div>

                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${
                                isExpired 
                                  ? "bg-slate-600" 
                                  : isExpiringSoon 
                                  ? "bg-rose-500 animate-pulse" 
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <p className="text-[10px] text-slate-500 mt-1 font-mono">
                            {isExpired 
                              ? "Inventory returned to shelf." 
                              : "Unconfirmed. Shielded from merchant."}
                          </p>
                        </div>

                        {/* Right: Operational Actions (WhatsApp Nudge, Confirm, Cancel) */}
                        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap justify-end">
                          {/* 1-Tap WhatsApp Nudge */}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-950 font-mono"
                          >
                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                            <span>1-Tap WhatsApp Nudge</span>
                          </a>

                          {/* Direct Call */}
                          {lead.client_phone && (
                            <a
                              href={`tel:${lead.client_phone}`}
                              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
                              title="Call customer"
                            >
                              <PhoneIcon className="w-4 h-4" />
                            </a>
                          )}

                          {/* Force Confirm (Paid) */}
                          <button
                            onClick={() => handleForceConfirmPaid(lead.id)}
                            disabled={manualConfirmingId === lead.id}
                            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 text-xs font-bold rounded-xl transition font-mono disabled:opacity-50"
                            title="Manually confirm if paid cash or direct till"
                          >
                            <CheckIcon className="w-4 h-4 text-emerald-400" />
                            <span>Force Paid</span>
                          </button>

                          {/* Expire / Cancel Now */}
                          {!isExpired && (
                            <button
                              onClick={() => handleForceExpireOrder(lead.id)}
                              disabled={manualExpiringId === lead.id}
                              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 text-xs font-bold rounded-xl transition font-mono disabled:opacity-50"
                              title="Cancel & return inventory immediately"
                            >
                              <NoSymbolIcon className="w-4 h-4 text-rose-400" />
                              <span>Expire</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* DESK MODE B: FORENSIC REPLAY & TILL SETTLEMENT */}
        {/* ========================================================================= */}
        {deskMode === "replay" && (
          <div>
            {/* Top Control Bar for Date Selection */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Audit Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-mono px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
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

                <button
                  onClick={loadReplayData}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white rounded-xl transition font-mono"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
                  <span>Refresh Replay</span>
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

                <button
                  onClick={handleReconcileVariances}
                  disabled={actionLoading !== null}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl transition font-mono disabled:opacity-50"
                >
                  <ScaleIcon className={`w-4 h-4 ${actionLoading === "reconciling" ? "animate-spin" : ""}`} />
                  <span>Auto-Categorize Variances</span>
                </button>

                <button
                  onClick={() => setShowEndpointsModal(true)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-xl transition font-mono"
                >
                  <CommandLineIcon className="w-4 h-4" />
                  <span>Expose API Endpoints</span>
                </button>
              </div>
            </div>

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

            {/* Filter and Search Bar for Timeline */}
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
                                    ? "bg-emerald-500/20 text-emerald-300" 
                                    : isExpired
                                    ? "bg-slate-800 text-slate-400"
                                    : "bg-amber-500/20 text-amber-300"
                                  : isUnmatchedPayment
                                  ? "bg-rose-500/20 text-rose-300"
                                  : "bg-emerald-500/20 text-emerald-300"
                              }`}>
                                {item.status}
                              </span>
                            </div>

                            <div className="text-xs text-slate-300 mt-1 flex items-center gap-3 flex-wrap">
                              <span>Customer: <strong>{item.customer}</strong></span>
                              <span className="text-slate-500">•</span>
                              <span className="font-mono">{item.phone}</span>
                              {item.mpesaCode && (
                                <>
                                  <span className="text-slate-500">•</span>
                                  <span className="font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                    M-Pesa: {item.mpesaCode}
                                  </span>
                                </>
                              )}
                              {item.matchedOrderId && (
                                <>
                                  <span className="text-slate-500">•</span>
                                  <span className="font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                    Linked Order #{item.matchedOrderId.slice(0, 8)}
                                  </span>
                                </>
                              )}
                            </div>

                            {item.rawSms && (
                              <p className="mt-2 text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80">
                                "{item.rawSms}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 self-end sm:self-center font-mono">
                          <div className={`text-base font-black ${
                            isOrder 
                              ? isPaid ? "text-emerald-400" : isExpired ? "text-slate-500 line-through" : "text-amber-400" 
                              : "text-emerald-400"
                          }`}>
                            KES {Number(item.amount || 0).toLocaleString()}
                          </div>
                          {item.balance !== undefined && item.balance !== null && (
                            <div className="text-[10px] text-slate-500">
                              Till Balance: KES {Number(item.balance).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* EXPOSED API CONTRACTS DIRECTORY MODAL */}
        {/* ========================================================================= */}
        {showEndpointsModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <CommandLineIcon className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-bold text-white font-mono">
                    Production Governance API Contracts
                  </h2>
                </div>
                <button
                  onClick={() => setShowEndpointsModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto py-4 space-y-6 flex-1 pr-1">
                {/* 1. Edge Endpoints */}
                <div>
                  <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-emerald-400 mb-3">
                    1. Edge Vercel Serverless Endpoints (shop.tmsavannah.com)
                  </h3>

                  <div className="space-y-3 font-mono text-xs">
                    {/* Health Endpoint */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold rounded text-[10px]">GET</span>
                          <span className="text-white font-bold">/api/till/receipt?action=health</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard("curl 'https://shop.tmsavannah.com/api/till/receipt?action=health'", "h_edge")}
                          className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                        >
                          {copiedEndpoint === "h_edge" ? <ClipboardDocumentCheckIcon className="w-4 h-4 text-emerald-400" /> : "Copy cURL"}
                        </button>
                      </div>
                      <p className="text-slate-400 text-[11px] font-sans">
                        Hardware heartbeat, battery telemetry, and latency health probe for the till relay phone.
                      </p>
                    </div>

                    {/* Auto-Expire Stale Orders */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 font-bold rounded text-[10px]">POST</span>
                          <span className="text-white font-bold">/api/till/receipt?action=expire_stale&minutes=30</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard("curl -X POST 'https://shop.tmsavannah.com/api/till/receipt?action=expire_stale&minutes=30' -H 'x-till-relay-secret: savannah_relay_sec_7f9b2c81e3a4d650'", "exp_edge")}
                          className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                        >
                          {copiedEndpoint === "exp_edge" ? <ClipboardDocumentCheckIcon className="w-4 h-4 text-emerald-400" /> : "Copy cURL"}
                        </button>
                      </div>
                      <p className="text-slate-400 text-[11px] font-sans">
                        State machine sweeper. Transitions unpaid pending orders older than 30 minutes to expired.
                      </p>
                    </div>

                    {/* Reconcile Variances */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 font-bold rounded text-[10px]">GET</span>
                          <span className="text-white font-bold">/api/till/receipt?action=reconcile_variances</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard("curl 'https://shop.tmsavannah.com/api/till/receipt?action=reconcile_variances' -H 'x-till-relay-secret: savannah_relay_sec_7f9b2c81e3a4d650'", "rec_edge")}
                          className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                        >
                          {copiedEndpoint === "rec_edge" ? <ClipboardDocumentCheckIcon className="w-4 h-4 text-emerald-400" /> : "Copy cURL"}
                        </button>
                      </div>
                      <p className="text-slate-400 text-[11px] font-sans">
                        Autonomous heuristic categorizer for till excise fees, tariff bands, and customer overpayments.
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
