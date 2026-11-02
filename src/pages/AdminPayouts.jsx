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
  const [activeTab, setActiveTab] = useState("outstanding");

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") { navigate("/login"); return; }
    fetchPayoutData();
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/admin" className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">💰 Shop Payouts & Settlement</h1>
            <p className="text-xs text-gray-500 mt-0.5">Track what each shop is owed and mark payments as cleared</p>
          </div>
          <button onClick={fetchPayoutData} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition">
            ↻ Refresh
          </button>
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
        <div className="flex bg-gray-100 p-1 rounded-xl mb-6 gap-1 w-fit">
          {["outstanding", "history"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition ${activeTab === tab ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab === "outstanding" ? "📤 Outstanding Payouts" : "📜 Settlement History"}
            </button>
          ))}
        </div>

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
