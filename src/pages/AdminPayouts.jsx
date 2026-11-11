import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase-client";
import { getCurrentUser } from "../services/auth-service";

export default function AdminPayouts() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [activeTab, setActiveTab] = useState("till_ledger");
  const [tillLedger, setTillLedger] = useState({ summary: null, receipts: [] });
  const [tillFilter, setTillFilter] = useState("ALL");
  const [gatewayOnline, setGatewayOnline] = useState(false);
  const [manualSms, setManualSms] = useState("");
  const [submittingSms, setSubmittingSms] = useState(false);

  // Smart multi-endpoint resolver so the Ops PWA works seamlessly on Laptop, Phone over Wi-Fi (192.168.100.32), Tailscale, or 4G Cloud (wa.missperpetual.cloud)
  const getGatewayCandidates = () => {
    const host = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
    const isLocalhost = host === "localhost" || host === "127.0.0.1";
    const isHttpsPage = typeof window !== "undefined" && window.location.protocol === "https:";
    const envUrl = (import.meta.env.VITE_WHATSAPP_SERVICE_URL || "").replace(/\/$/, "");
    const cloudUrl = (import.meta.env.VITE_SAVANNAH_BACKEND_URL || "https://wa.missperpetual.cloud").replace(/\/$/, "");

    if (isHttpsPage) {
      // On an HTTPS-hosted PWA, browser Mixed Content rules require HTTPS first
      return Array.from(new Set([cloudUrl, `http://${host}:5174`, "http://192.168.100.32:5174"]));
    }
    if (!isLocalhost) {
      // Opened on Phone over Wi-Fi (e.g. 192.168.100.32:5180) or Tailscale (100.x.x.x:5180)
      return Array.from(new Set([`http://${host}:5174`, cloudUrl, "http://192.168.100.32:5174", "http://100.73.175.118:5174"]));
    }
    return Array.from(new Set([envUrl || "http://127.0.0.1:5174", "http://192.168.100.32:5174", cloudUrl]));
  };

  const fetchGatewayWithFailover = async (pathAndQuery, options = {}) => {
    const candidates = getGatewayCandidates();
    let lastErr = null;
    for (const base of candidates) {
      try {
        const res = await fetch(`${base}${pathAndQuery}`, options);
        if (res.ok) return res;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("All gateway endpoints unreachable");
  };

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") { navigate("/login?redirect=/admin/payouts"); return; }
    fetchPayoutData();
    fetchTillLedger();
    const timer = setInterval(fetchTillLedger, 4000);
    return () => clearInterval(timer);
  }, []);

  const fetchTillLedger = async () => {
    try {
      const res = await fetchGatewayWithFailover("/api/till/pool");
      const data = await res.json();
      setTillLedger({
        summary: data.summary || null,
        receipts: Array.isArray(data.receipts) ? data.receipts : []
      });
      setGatewayOnline(true);
    } catch (_) {
      setGatewayOnline(false);
    }
  };

  const handleLogTillSms = async (customText) => {
    const textToSend = (customText ?? manualSms).trim();
    if (!textToSend) return;
    setSubmittingSms(true);
    try {
      await fetchGatewayWithFailover("/api/till/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "MPESA",
          sim: "REDMI_TILL_SIM",
          text: textToSend
        })
      });
      setManualSms("");
      await fetchTillLedger();
      await fetchPayoutData();
    } catch (err) {
      alert("Could not reach local Till Gateway on port 5174: " + err.message);
    } finally {
      setSubmittingSms(false);
    }
  };

  const fetchPayoutData = async () => {
    setLoading(true);
    try {
      // Fetch all unsettled paid orders, grouped by shop
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          id, shop_id, total_price, goods_subtotal,
          platform_commission, delivery_fee_retained,
          shop_amount_due, settlement_status, created_at,
          shops ( name, phone, platform_commission_rate )
        `)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(99999);

      if (error) throw error;

      // Group by shop
      const shopMap = new Map();
      (orders || []).forEach(o => {
        const key = o.shop_id;
        if (!shopMap.has(key)) {
          shopMap.set(key, {
            shop_id: key,
            shop_name: o.shops?.name || "Unknown Shop",
            shop_phone: o.shops?.phone || "—",
            commission_rate: o.shops?.platform_commission_rate || 5,
            orders: [],
            unsettled_orders: [],
            total_shop_owed: 0,
            total_platform_earned: 0,
            total_delivery_retained: 0,
            total_gmv: 0
          });
        }
        const entry = shopMap.get(key);
        entry.orders.push(o);
        entry.total_gmv += o.total_price || 0;
        entry.total_platform_earned += o.platform_commission || 0;
        entry.total_delivery_retained += o.delivery_fee_retained || 0;
        if (o.settlement_status !== 'settled') {
          entry.unsettled_orders.push(o);
          entry.total_shop_owed += o.shop_amount_due || 0;
        }
      });

      setShops(Array.from(shopMap.values()));

      // Fetch completed settlements log
      const { data: settledData } = await supabase
        .from("payout_settlements")
        .select("*")
        .order("settled_at", { ascending: false })
        .limit(30);

      setSettlements(settledData || []);

    } catch (err) {
      console.error("Payout fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSettled = async (shopEntry) => {
    if (!window.confirm(`Mark all unsettled orders for "${shopEntry.shop_name}" as settled?\n\nShop payout: KSh ${shopEntry.total_shop_owed.toFixed(2)}`)) return;
    setSettling(shopEntry.shop_id);
    try {
      const orderIds = shopEntry.unsettled_orders.map(o => o.id);
      // Mark orders as settled
      await supabase
        .from("orders")
        .update({ settlement_status: "settled", settled_at: new Date().toISOString() })
        .in("id", orderIds);

      // Log the settlement event
      await supabase.from("payout_settlements").insert([{
        shop_id: shopEntry.shop_id,
        period_start: shopEntry.unsettled_orders[shopEntry.unsettled_orders.length - 1]?.created_at?.split("T")[0],
        period_end: new Date().toISOString().split("T")[0],
        total_orders: orderIds.length,
        gross_gmv: shopEntry.total_gmv,
        platform_cut: shopEntry.total_platform_earned + shopEntry.total_delivery_retained,
        shop_payout: shopEntry.total_shop_owed,
        delivery_fees: shopEntry.total_delivery_retained,
        settled_by: user?.email || "system_admin"
      }]);

      await fetchPayoutData();
    } catch (err) {
      console.error("Settlement error:", err);
      alert("Failed to settle. Check logs.");
    } finally {
      setSettling(null);
    }
  };

  const totalPlatformEarnings = shops.reduce((acc, s) => acc + s.total_platform_earned + s.total_delivery_retained, 0);
  const totalOwedToShops = shops.reduce((acc, s) => acc + s.total_shop_owed, 0);

  const summary = tillLedger.summary || {
    total_transactions: 0,
    inflow_count: 0,
    outflow_count: 0,
    total_inflow_amount: 0,
    total_outflow_amount: 0,
    total_fees_amount: 0,
    net_till_flow: 0,
    claimed_orders_amount: 0,
    unclaimed_pool_amount: 0,
    order_reconciliation_variance: 0,
    latest_till_balance: null,
    cumulative_balance_variance: 0
  };

  const filteredReceipts = tillLedger.receipts.filter(tx => {
    if (tillFilter === "INFLOW") return tx.direction !== "OUTFLOW";
    if (tillFilter === "OUTFLOW") return tx.direction === "OUTFLOW";
    if (tillFilter === "UNCLAIMED") return tx.status === "UNCLAIMED_POOL" || tx.status === "AMBIGUOUS";
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-wrap items-center gap-3">
          <Link to="/admin/ops" className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex-1 min-w-[200px]">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base md:text-xl font-bold text-gray-800">💰 Live Till Ledger & Variance</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${gatewayOnline ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {gatewayOnline ? "● TILL 5758419 LIVE" : "○ GATEWAY OFFLINE"}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">Real-time M-Pesa Till 5758419 inflows, withdrawals/outflows, balance variance & settlements</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (window.__deferredPwaPrompt) {
                  window.__deferredPwaPrompt.prompt();
                  await window.__deferredPwaPrompt.userChoice;
                  window.__deferredPwaPrompt = null;
                } else {
                  alert(
                    "📲 Install TMS Ops PWA on your phone:\n\n" +
                    "• Android Chrome: Tap ⋮ (top right) → 'Install app' or 'Add to Home screen'\n" +
                    "• iPhone Safari: Tap Share (⬆) → 'Add to Home Screen'"
                  );
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition cursor-pointer"
            >
              📲 Install App
            </button>
            <button
              onClick={() => { fetchPayoutData(); fetchTillLedger(); }}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition cursor-pointer"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Platform Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Platform Earned (All Time)</p>
            <p className="text-2xl font-black text-green-700">KSh {totalPlatformEarnings.toFixed(2)}</p>
            <p className="text-[10px] text-gray-400 mt-1">Commissions + Delivery Fees</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Outstanding Payable to Shops</p>
            <p className="text-2xl font-black text-orange-600">KSh {totalOwedToShops.toFixed(2)}</p>
            <p className="text-[10px] text-gray-400 mt-1">Across all unsettled orders</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Total Shop Accounts</p>
            <p className="text-2xl font-black text-indigo-700">{shops.length}</p>
            <p className="text-[10px] text-gray-400 mt-1">With recorded paid orders</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-6 gap-1 w-fit flex-wrap">
          {[
            { id: "till_ledger", label: "📲 Live Till Ledger & Variance" },
            { id: "outstanding", label: "📤 Outstanding Payouts" },
            { id: "history", label: "📜 Settlement History" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === tab.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: LIVE TILL LEDGER, OUTFLOWS & VARIANCE */}
        {activeTab === "till_ledger" && (
          <div className="space-y-6">
            {/* 6 Real-Time Till & Variance KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Live Till Balance</p>
                <p className="text-xl font-black text-emerald-400 mt-1">
                  {summary.latest_till_balance !== null ? `KSh ${Number(summary.latest_till_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Safaricom Reported (5758419)</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Total Till Inflows ({summary.inflow_count})</p>
                <p className="text-xl font-black text-emerald-700 mt-1">
                  +KSh {Number(summary.total_inflow_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Customer payments received</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Till Outflows ({summary.outflow_count})</p>
                <p className="text-xl font-black text-rose-600 mt-1">
                  -KSh {Number(summary.total_outflow_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Sent out / withdrawn (+KSh {Number(summary.total_fees_amount).toFixed(2)} fees)</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Matched to Orders</p>
                <p className="text-xl font-black text-indigo-700 mt-1">
                  KSh {Number(summary.claimed_orders_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Auto-settled in Supabase</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Order Match Variance</p>
                <p className={`text-xl font-black mt-1 ${summary.order_reconciliation_variance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  KSh {Number(summary.order_reconciliation_variance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Unclaimed pool sitting in Till</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Balance Variance Audit</p>
                <p className={`text-xl font-black mt-1 ${summary.cumulative_balance_variance === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {summary.cumulative_balance_variance > 0 ? "+" : ""}KSh {Number(summary.cumulative_balance_variance).toFixed(2)}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {summary.cumulative_balance_variance === 0 ? "✅ 100% SMS-to-Balance Match" : "⚠️ Check missing/extra SMS"}
                </p>
              </div>
            </div>

            {/* Manual / Test Till Inflow or Outflow Logger */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">⚡ Log or Simulate a Till Inflow / Till Outflow SMS</h3>
                  <p className="text-xs text-gray-400">
                    Your Redmi Note 12 (`94b0fd4c`) streams real Till inflows and outflows automatically. You can also paste any M-Pesa Till SMS below:
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const code = "UK" + Math.random().toString(36).substring(2, 10).toUpperCase();
                      const nextBal = ((summary.latest_till_balance ?? 26.56) - 10).toFixed(2);
                      handleLogTillSms(
                        `${code} Confirmed. Ksh10.00 sent to MERCY TRYPHEN EMURUGAT 254710720949 on 7/11/26 at 7:05 PM. New Account balance is KSH${nextBal}. Transaction cost, KSH0.00.`
                      );
                    }}
                    className="text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg transition"
                  >
                    📤 Test Till Outflow (-KSh 10)
                  </button>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="text"
                  value={manualSms}
                  onChange={e => setManualSms(e.target.value)}
                  placeholder="Paste M-Pesa Till Inflow or Outflow SMS (e.g. UK6DC1DCIM Confirmed...)"
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleLogTillSms()}
                  disabled={submittingSms || !manualSms.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {submittingSms ? "Recording..." : "Ingest SMS"}
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1.5">
                {[
                  { id: "ALL", label: `All (${tillLedger.receipts.length})` },
                  { id: "INFLOW", label: `📥 Inflows (${summary.inflow_count})` },
                  { id: "OUTFLOW", label: `📤 Outflows / Sent (${summary.outflow_count})` },
                  { id: "UNCLAIMED", label: "⏳ Unclaimed Pool" }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setTillFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${tillFilter === f.id ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400 font-mono">Auto-syncing every 4s from :5174/api/till/pool</span>
            </div>

            {/* Live Transactions Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] text-gray-400 uppercase font-bold bg-gray-50/60">
                    <th className="py-3 px-4">M-Pesa Ref</th>
                    <th className="py-3 px-4">Direction</th>
                    <th className="py-3 px-4">Counterparty & Phone</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Fee</th>
                    <th className="py-3 px-4 text-right">Till Balance After</th>
                    <th className="py-3 px-4 text-right">Variance</th>
                    <th className="py-3 px-4">Status / Order</th>
                    <th className="py-3 px-4">Received At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-10 text-center text-gray-400">
                        No Till transactions matching filter.
                      </td>
                    </tr>
                  ) : filteredReceipts.map((tx, idx) => {
                    const isOut = tx.direction === "OUTFLOW";
                    const variance = typeof tx.balance_variance === "number" ? tx.balance_variance : 0;
                    return (
                      <tr key={tx.code || idx} className="hover:bg-gray-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-gray-800">{tx.code}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isOut ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {isOut ? "📤 OUTFLOW" : "📥 INFLOW"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-800">{tx.payer_name || "—"}</div>
                          {tx.payer_phone && <div className="text-[10px] text-gray-400 font-mono">{tx.payer_phone}</div>}
                        </td>
                        <td className={`py-3 px-4 text-right font-black ${isOut ? "text-rose-600" : "text-emerald-700"}`}>
                          {isOut ? "-" : "+"}KSh {Number(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-500">
                          KSh {Number(tx.fee || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-800">
                          {typeof tx.reported_balance === "number"
                            ? `KSh ${tx.reported_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {typeof tx.reported_balance === "number" ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${variance === 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                              {variance > 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.status === "CLAIMED" || tx.status === "PAID"
                              ? "bg-indigo-100 text-indigo-700"
                              : tx.status === "TILL_OUTFLOW"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {tx.status}
                          </span>
                          {tx.order_id && (
                            <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                              #{tx.order_id.slice(0, 8).toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">
                          {tx.received_at ? new Date(tx.received_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "outstanding" && (
          <div className="space-y-4">
            {loading ? (
              <p className="text-gray-400 text-center py-12">Loading shop accounts...</p>
            ) : shops.filter(s => s.total_shop_owed > 0).length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <span className="text-4xl">✅</span>
                <p className="text-gray-500 font-medium mt-4">All shops are fully settled!</p>
              </div>
            ) : shops.filter(s => s.total_shop_owed > 0).map(shopEntry => (
              <div key={shopEntry.shop_id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-800 text-base">{shopEntry.shop_name}</h3>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono">{shopEntry.commission_rate}% commission</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Unsettled Orders</p>
                        <p className="text-sm font-bold text-gray-700">{shopEntry.unsettled_orders.length}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Total GMV</p>
                        <p className="text-sm font-bold text-gray-700">KSh {shopEntry.total_gmv.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Platform Earned</p>
                        <p className="text-sm font-bold text-green-600">KSh {(shopEntry.total_platform_earned + shopEntry.total_delivery_retained).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-orange-500 uppercase font-bold">Shop Is Owed</p>
                        <p className="text-lg font-black text-orange-600">KSh {shopEntry.total_shop_owed.toFixed(2)}</p>
                      </div>
                    </div>
                    {shopEntry.shop_phone !== "—" && (
                      <p className="text-xs text-gray-400 mt-2">📞 Pay via M-Pesa Send Money to: <span className="font-mono font-bold text-gray-600">{shopEntry.shop_phone}</span></p>
                    )}
                  </div>
                  <button
                    onClick={() => handleMarkSettled(shopEntry)}
                    disabled={settling === shopEntry.shop_id}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-5 rounded-lg transition text-sm shadow-sm disabled:opacity-60 whitespace-nowrap"
                  >
                    {settling === shopEntry.shop_id ? "Processing..." : "✅ Mark as Settled"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3">
            {settlements.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <span className="text-4xl">📭</span>
                <p className="text-gray-500 font-medium mt-4">No settlements recorded yet.</p>
              </div>
            ) : settlements.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-700 text-sm">{s.shop_id}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.period_start} → {s.period_end} | {s.total_orders} orders | By: {s.settled_by}</p>
                </div>
                <div className="flex gap-6">
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Shop Paid Out</p>
                    <p className="font-black text-green-700">KSh {Number(s.shop_payout).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Platform Kept</p>
                    <p className="font-black text-indigo-700">KSh {Number(s.platform_cut).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
