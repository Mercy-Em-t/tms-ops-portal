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
  FunnelIcon
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

  // Summary Metrics
  const totalOrders = orders.length;
  const paidOrders = orders.filter(o => o.status === "paid" || o.status === "completed").length;
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const totalGmv = orders
    .filter(o => o.status === "paid" || o.status === "completed")
    .reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const totalReceipts = payments.length;
  const latestTillBalance = payments[payments.length - 1]?.raw_payload?.balance || "N/A";

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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
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
            <span className="text-[11px] text-slate-500 font-mono">{paidOrders} Paid • {pendingOrders} Pending</span>
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
              placeholder="Search code, customer name, phone, or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {[
              { id: "all", label: "All Events" },
              { id: "orders", label: "Orders Only" },
              { id: "payments", label: "Receipts Only" },
              { id: "unmatched", label: "Unmatched / Pending" }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  statusFilter === f.id
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Forensic Timeline Stream */}
        {loading ? (
          <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
            <span className="text-xs text-slate-400 font-mono">Compiling Forensic Event Stream...</span>
          </div>
        ) : filteredTimeline.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <ShieldCheckIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No transactions recorded for {selectedDate}</h3>
            <p className="text-xs text-slate-500 font-mono">Try selecting another date or clear your search term.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTimeline.map((item, idx) => {
              const isOrder = item.type === "order";
              const isPaid = isOrder && (item.status === "paid" || item.status === "completed");
              const isUnmatchedPayment = !isOrder && !item.matchedOrderId;

              return (
                <div 
                  key={item.id + idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    isOrder 
                      ? isPaid 
                        ? "bg-slate-900/90 border-slate-800 hover:border-emerald-500/40" 
                        : "bg-amber-950/10 border-amber-500/20 hover:border-amber-500/40"
                      : isUnmatchedPayment
                        ? "bg-rose-950/10 border-rose-500/30 hover:border-rose-500/50"
                        : "bg-emerald-950/10 border-emerald-500/20 hover:border-emerald-500/40"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs mt-0.5 ${
                        isOrder 
                          ? isPaid ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      }`}>
                        {isOrder ? "🛍️" : "🧾"}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-slate-400">{item.timeFormatted}</span>
                          <span className="font-bold text-sm text-white">{item.title}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                            isOrder
                              ? isPaid ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
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
      </main>
    </div>
  );
}
