import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BRIDGE_ENDPOINTS,
  STAGE_PIPELINE_MAP,
  fetchOrderLifecycleTelemetry,
  triggerOrderLifecycleProbe,
} from "../services/order-lifecycle-service";

const STATUS_COLORS = {
  HELD: "bg-amber-950/60 text-amber-300 border-amber-500/40",
  NEEDS_APPROVAL: "bg-purple-950/60 text-purple-300 border-purple-500/40",
  COMMITTED: "bg-emerald-950/60 text-emerald-300 border-emerald-500/40",
  EXPIRED: "bg-slate-800 text-slate-300 border-slate-600/50",
  RELEASED: "bg-sky-950/60 text-sky-300 border-sky-500/40",
  CANCELLED: "bg-rose-950/60 text-rose-300 border-rose-500/40",
  REFUND_REQUIRED: "bg-red-950/70 text-red-200 border-red-500/60",
};

const SAMPLE_FILTER_OPTIONS = [
  { id: "ALL", label: "All 7 Samples (7,000 Reqs)" },
  { id: "S1", label: "S1 · Happy Path & Resumes (1,000)" },
  { id: "S2", label: "S2 · Premature Term & TTLs (1,000)" },
  { id: "S3", label: "S3 · Restarted Sessions (1,000)" },
  { id: "S4", label: "S4 · OOS & Live Restock (1,000)" },
  { id: "S5", label: "S5 · Invalid Cart & Gates (1,000)" },
  { id: "S6", label: "S6 · Outages & Backoff (1,000)" },
  { id: "S7", label: "S7 · Mixed Chaos Sim (1,000)" },
];

function formatDurationMs(ms) {
  const num = Number(ms || 0);
  if (num <= 0) return "0s";
  const totalSec = Math.ceil(num / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return mins > 0 ? `${mins}m ${String(secs).padStart(2, "0")}s` : `${secs}s`;
}

export default function OrderLifecycleObservatory() {
  const [selectedEndpoint, setSelectedEndpoint] = useState("");
  const [telemetry, setTelemetry] = useState(null);
  const [probeReport, setProbeReport] = useState(null);
  const [sampleFilter, setSampleFilter] = useState("ALL");
  const [selectedStageId, setSelectedStageId] = useState("ORDER_GUARD_INSPECT");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [runningProbe, setRunningProbe] = useState(false);
  const [probeStatusMsg, setProbeStatusMsg] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const loadTelemetry = useCallback(async () => {
    setLoading(true);
    const snap = await fetchOrderLifecycleTelemetry(selectedEndpoint);
    setTelemetry(snap);
    if (snap?.lastProbeReport && (!probeReport || snap.lastProbeReport.samples?.length >= (probeReport.samples?.length || 0))) {
      setProbeReport(snap.lastProbeReport);
    }
    setLoading(false);
  }, [selectedEndpoint, probeReport]);

  useEffect(() => {
    loadTelemetry();
  }, [selectedEndpoint]);

  // 5s live background polling + 1s local countdown tick
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const pollId = setInterval(() => {
      loadTelemetry();
    }, 5000);
    return () => clearInterval(pollId);
  }, [autoRefresh, loadTelemetry]);

  useEffect(() => {
    const tickId = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(tickId);
  }, []);

  async function handleRunProbe() {
    try {
      setRunningProbe(true);
      setProbeStatusMsg(`Executing ${sampleFilter === "ALL" ? "7 x 1,000 = 7,000" : sampleFilter + " (1,000)"} requests on Order Guard...`);
      const res = await triggerOrderLifecycleProbe(selectedEndpoint, { sample: sampleFilter });
      if (res?.report) {
        if (sampleFilter === "ALL") {
          setProbeReport(res.report);
        } else if (res.report.samples?.length === 1) {
          const updatedSample = res.report.samples[0];
          setProbeReport((prev) => {
            if (!prev?.samples?.length) return res.report;
            const merged = prev.samples.map((s) => (s.sample === updatedSample.sample ? updatedSample : s));
            return {
              ...prev,
              executedAt: res.report.executedAt,
              samples: merged,
            };
          });
        }
        setProbeStatusMsg(
          `Completed ${res.report.totalRequests.toLocaleString()} requests in ${res.report.totalWallMs}ms (${res.report.overallRps.toLocaleString()} req/s) · Zero Oversells: ${String(res.report.zeroOversells)} · Zero Leaked Holds: ${String(res.report.zeroLeakedHolds)}`
        );
      }
      await loadTelemetry();
    } catch (err) {
      setProbeStatusMsg(`Probe error: ${err.message}`);
    } finally {
      setRunningProbe(false);
    }
  }

  const stages = telemetry?.stages || STAGE_PIPELINE_MAP;
  const activeStage = useMemo(
    () => stages.find((s) => s.id === selectedStageId) || stages[0],
    [stages, selectedStageId]
  );

  const visibleSamples = useMemo(() => {
    const all = probeReport?.samples || [];
    if (sampleFilter === "ALL") return all;
    return all.filter((s) => s.sample === sampleFilter || s.sample.startsWith(`${sampleFilter}_`));
  }, [probeReport, sampleFilter]);

  const isLive = telemetry?.ok && telemetry?.sourceMode === "live";
  const cfg = telemetry?.config || {};
  const counts = telemetry?.summary?.statusCounts || {};
  const activeHolds = telemetry?.activeHolds || [];
  const pools = telemetry?.pools || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Control Header */}
        <header className="border border-slate-800 bg-slate-900/75 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/admin"
                className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                &larr; /admin
              </Link>
              <Link
                to="/bridge"
                className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30"
              >
                Perpetual Bridge
              </Link>
              <span
                className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
                  isLive
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
                    : "bg-amber-950/60 text-amber-300 border-amber-500/40"
                }`}
              >
                {isLive
                  ? `LIVE ORDER GUARD (${telemetry.endpointUsed} · ${telemetry.roundTripMs}ms)`
                  : `OFFLINE FALLBACK VIEW`}
              </span>
              {telemetry?.bridge?.whatsappConnection && (
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  WA Socket: {telemetry.bridge.whatsappConnection}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold mt-2.5 tracking-tight">
              Storefront &rarr; Order Guard &rarr; Payment Live Observatory
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time monitor for checkout holds, EAT buyable inventory pools, exponential backoff retries, TTL expiry sweeps &amp; live 7 &times; 1,000 request stress probes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedEndpoint}
              onChange={(e) => setSelectedEndpoint(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
            >
              {BRIDGE_ENDPOINTS.map((ep) => (
                <option key={ep.id} value={ep.url}>
                  {ep.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={`px-3 py-2 rounded-lg text-xs font-mono border cursor-pointer ${
                autoRefresh
                  ? "bg-emerald-950/50 border-emerald-600/50 text-emerald-300"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              Auto-Poll: {autoRefresh ? "ON (5s)" : "PAUSED"}
            </button>

            <button
              onClick={loadTelemetry}
              disabled={loading}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Refreshing..." : "Refresh Live State"}
            </button>

            <button
              onClick={handleRunProbe}
              disabled={runningProbe}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {runningProbe ? "Running 7x1,000 Probe..." : "Run 7x1,000 Probe Now"}
            </button>
          </div>
        </header>

        {probeStatusMsg && (
          <div className="border border-cyan-500/40 bg-cyan-950/40 text-cyan-200 rounded-xl px-4 py-2.5 text-xs font-mono flex items-center justify-between">
            <span>{probeStatusMsg}</span>
            <button onClick={() => setProbeStatusMsg(null)} className="text-cyan-400 hover:text-white ml-4">
              dismiss
            </button>
          </div>
        )}

        {/* Section 1: Authoritative TTL, Backoff & Live Hold Status KPIs */}
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {["HELD", "NEEDS_APPROVAL", "COMMITTED", "EXPIRED", "RELEASED", "CANCELLED", "REFUND_REQUIRED"].map((st) => (
            <div key={st} className={`rounded-xl border p-3 ${STATUS_COLORS[st] || "bg-slate-900 border-slate-800"}`}>
              <div className="text-[10px] font-mono uppercase opacity-80">{st}</div>
              <div className="text-2xl font-bold mt-1">{Number(counts[st] || 0)}</div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
            <div className="text-slate-400 font-mono text-[10px] uppercase">Hold &amp; Grace TTL</div>
            <div className="font-bold text-slate-100 mt-1">
              {Math.round((cfg.holdTtlMs || 600000) / 60000)}m Hold + {Math.round((cfg.graceTtlMs || 180000) / 60000)}m Grace (13m)
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Approval hold: {Math.round((cfg.approvalHoldTtlMs || 1800000) / 60000)}m</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
            <div className="text-slate-400 font-mono text-[10px] uppercase">Client Backoff Retry</div>
            <div className="font-bold text-cyan-300 mt-1">
              maxRetries={cfg.backoff?.maxRetries ?? 2} · {cfg.backoff?.baseDelayMs ?? 60}ms&middot;2^n (cap {cfg.backoff?.maxDelayMs ?? 800}ms)
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Retries on {(cfg.backoff?.retryableStatuses || [502, 503, 504]).join(", ")} + net drops</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
            <div className="text-slate-400 font-mono text-[10px] uppercase">Payment Radar &amp; Lookback</div>
            <div className="font-bold text-emerald-300 mt-1">
              {cfg.radarMaxPollSec ?? 60}s Max Poll · {Math.round((cfg.tillLookbackMs || 600000) / 60000)}m Till Lookback
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Prompt cashier at 20s + Realtime WS</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
            <div className="text-slate-400 font-mono text-[10px] uppercase">Cache &amp; Dup Guards</div>
            <div className="font-bold text-slate-100 mt-1">
              {cfg.menuCacheTtlHours ?? 1}h Menu Cache · {cfg.duplicateGuardWindowSec ?? 30}s Dup Block
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Retail auto-clear cap: KES {Number(cfg.maxOrderValue ?? 20000).toLocaleString()}</div>
          </div>
        </section>

        {/* Section 2: Interactive 8-Stage Pipeline Architecture Map */}
        <section className="border border-slate-800 bg-slate-900/60 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold tracking-tight">8-Stage Subsystem Map (Landing &rarr; Payment &rarr; Tracking)</h2>
              <p className="text-xs text-slate-400">Click any stage to inspect subsystem ownership, failure states, remedy protocol, backoff &amp; TTL.</p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Pools: {telemetry?.summary?.poolsCount ?? 0} · Policies: {telemetry?.summary?.policiesCount ?? 0} · Tracked Holds: {telemetry?.summary?.totalHoldsTracked ?? 0}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {stages.map((st) => {
              const selected = activeStage?.id === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setSelectedStageId(st.id)}
                  className={`text-left p-3.5 rounded-xl border transition cursor-pointer ${
                    selected
                      ? "bg-cyan-950/50 border-cyan-400 shadow-sm"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400">
                    <span>STEP {st.step}</span>
                    <span>{st.id}</span>
                  </div>
                  <div className="font-semibold text-sm text-slate-100 mt-1">{st.name}</div>
                  <div className="text-[11px] text-slate-400 mt-1 truncate">{st.provider}</div>
                </button>
              );
            })}
          </div>

          {activeStage && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 grid md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2.5">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400">Subsystem &amp; Owner</span>
                  <div className="font-semibold text-slate-100 mt-0.5">{activeStage.subsystem} — {activeStage.provider}</div>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400">Processing</span>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">{activeStage.processing}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400">Source Modules</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {activeStage.files.map((f) => (
                      <span key={f} className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px]">{f}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <span className="text-[10px] font-mono uppercase text-emerald-400">Valid / Accepted States</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {activeStage.validStates.map((v) => (
                      <span key={v} className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]">{v}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-rose-400">Failure / Invalid States</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {activeStage.failureStates.map((f) => (
                      <span key={f} className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30 text-rose-300 font-mono text-[11px]">{f}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-amber-300">Remedy Protocol &amp; Backoff / TTL</span>
                  <p className="text-slate-300 mt-0.5">{activeStage.remedyProtocol}</p>
                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    Retry/Backoff: <span className="text-slate-200">{activeStage.retryBackoff}</span> · TTL: <span className="text-slate-200">{activeStage.ttl}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 3: Live Daily Inventory Pools & Active Checkout Holds */}
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="border border-slate-800 bg-slate-900/60 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold">Live Order Guard Daily Pools (EAT)</h2>
              <span className="text-xs font-mono text-slate-400">{pools.length} pools</span>
            </div>
            {pools.length === 0 ? (
              <div className="text-xs text-slate-400 font-mono py-8 text-center border border-dashed border-slate-800 rounded-xl">
                No capped daily pools active on this gateway instance yet. Checkouts with item caps appear here in real time.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 pr-3">Shop / Item</th>
                      <th className="py-2 px-2 text-right">Cap</th>
                      <th className="py-2 px-2 text-right">Held</th>
                      <th className="py-2 px-2 text-right">Sold</th>
                      <th className="py-2 pl-2 text-right">Avail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-mono">
                    {pools.map((p) => (
                      <tr key={`${p.shop_id}-${p.item_id}-${p.sale_date}`}>
                        <td className="py-2 pr-3">
                          <div className="font-semibold text-slate-200">{p.name || p.item_id}</div>
                          <div className="text-[10px] text-slate-500">{p.shop_id} · {p.sale_date}</div>
                        </td>
                        <td className="py-2 px-2 text-right">{p.daily_cap ?? "UNCAP"}</td>
                        <td className="py-2 px-2 text-right text-amber-300">{p.held || 0}</td>
                        <td className="py-2 px-2 text-right text-emerald-300">{p.sold || 0}</td>
                        <td className="py-2 pl-2 text-right text-cyan-300">{p.available ?? "INF"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border border-slate-800 bg-slate-900/60 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold">Recent Order Holds &amp; Live TTL Countdowns</h2>
              <span className="text-xs font-mono text-slate-400">{activeHolds.length} shown</span>
            </div>
            {activeHolds.length === 0 ? (
              <div className="text-xs text-slate-400 font-mono py-8 text-center border border-dashed border-slate-800 rounded-xl">
                No recent checkout holds recorded yet. Every live checkout hold &amp; its remaining TTL countdown appears here.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 pr-3">Order</th>
                      <th className="py-2 px-2">Status</th>
                      <th className="py-2 px-2 text-right">Value (KES)</th>
                      <th className="py-2 pl-2 text-right">TTL / Grace Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-mono">
                    {activeHolds.map((h) => {
                      const drift = Math.max(0, nowTick - (Date.parse(telemetry?.timestamp || "") || nowTick));
                      const holdLeft = Math.max(0, Number(h.remaining_hold_ms || 0) - drift);
                      const graceLeft = Math.max(0, Number(h.remaining_grace_ms || 0) - drift);
                      const isActive = h.status === "HELD" || h.status === "NEEDS_APPROVAL";
                      return (
                        <tr key={h.order_id}>
                          <td className="py-2 pr-3">
                            <div className="font-semibold text-slate-200">{h.order_id}</div>
                            <div className="text-[10px] text-slate-500">{h.shop_id} · {h.items?.length || 0} item(s)</div>
                          </td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-0.5 rounded border text-[10px] ${STATUS_COLORS[h.status] || "bg-slate-800 border-slate-700 text-slate-300"}`}>
                              {h.status}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right">{Number(h.total_value || 0).toLocaleString()}</td>
                          <td className="py-2 pl-2 text-right">
                            {isActive
                              ? `${formatDurationMs(holdLeft)} (${formatDurationMs(graceLeft)} hard)`
                              : "Settled / Closed"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Section 4: 7 x 1,000 Lifecycle Stress & Chaos Probe Matrix */}
        <section className="border border-slate-800 bg-slate-900/60 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight">7 Samples &times; 1,000 Requests Lifecycle Probe Telemetry</h2>
              <p className="text-xs text-slate-400">
                Live cryptographic &amp; concurrency stress verification across real Order Guard locks, remedies, retries &amp; TTL sweeps.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sampleFilter}
                onChange={(e) => setSampleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
              >
                {SAMPLE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {probeReport ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">TOTAL PROBED</span>
                  <span className="text-lg font-bold text-slate-100">{Number(probeReport.totalRequests || 0).toLocaleString()} reqs</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">WALL DURATION</span>
                  <span className="text-lg font-bold text-cyan-300">{probeReport.totalWallMs} ms</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">THROUGHPUT</span>
                  <span className="text-lg font-bold text-emerald-300">{Number(probeReport.overallRps || 0).toLocaleString()} req/s</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">OVERSELL GUARD</span>
                  <span className={`text-lg font-bold ${probeReport.zeroOversells ? "text-emerald-400" : "text-rose-400"}`}>
                    {probeReport.zeroOversells ? "0 OVERSELLS" : "ALERT"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">HOLD SWEEP LEAK</span>
                  <span className={`text-lg font-bold ${probeReport.zeroLeakedHolds ? "text-emerald-400" : "text-rose-400"}`}>
                    {probeReport.zeroLeakedHolds ? "0 LEAKED HOLDS" : "ALERT"}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {visibleSamples.map((s) => (
                  <div key={s.sample} className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <div>
                        <div className="text-[10px] font-mono text-cyan-400">{s.sample}</div>
                        <div className="text-sm font-bold text-slate-100 mt-0.5">{s.title || s.sample}</div>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <div className="text-emerald-300 font-bold">{s.requests} reqs · {s.latency_ms?.wall_ms}ms</div>
                        <div className="text-slate-400">p50 {s.latency_ms?.p50_ms}ms · p99 {s.latency_ms?.p99_ms}ms · {s.latency_ms?.rps} rps</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono uppercase text-slate-400 mb-1.5">Outcomes Reported</div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
                        {Object.entries(s.outcomes || {}).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between bg-slate-900/70 rounded px-2 py-1">
                            <span className="text-slate-400 truncate pr-2">{k}</span>
                            <span className="font-bold text-slate-100">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {(s.remedies_applied || s.retries || s.ttl) && (
                      <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                        {s.remedies_applied &&
                          Object.entries(s.remedies_applied).map(([rk, rv]) => (
                            <span key={rk} className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
                              Remedy {rk}: {rv}
                            </span>
                          ))}
                        {s.retries && (
                          <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300">
                            Retries: {s.retries.retries_used} · Backoff Sum: {s.retries.simulated_backoff_ms_total}ms
                          </span>
                        )}
                        {s.ttl && (
                          <span className="px-2 py-0.5 rounded bg-teal-950/60 border border-teal-500/30 text-teal-300">
                            Expired: {s.ttl.abandoned_expired_and_reclaimed} · Late OK: {s.ttl.late_payments_recovered} · Refund Guard: {s.ttl.refund_required_prevented_oversell}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="pt-1 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex flex-wrap gap-3">
                      {"sold" in (s.inventory_check || {}) ? (
                        <span>
                          Pool: sold <strong className="text-emerald-300">{s.inventory_check.sold}</strong> / cap {s.inventory_check.daily_cap} · held{" "}
                          <strong className="text-slate-100">{s.inventory_check.held}</strong> · oversold{" "}
                          <strong className="text-emerald-400">{String(s.inventory_check.oversold)}</strong>
                        </span>
                      ) : (
                        Object.entries(s.inventory_check || {}).map(([skuKey, poolInfo]) => (
                          <span key={skuKey}>
                            {skuKey}: <strong className="text-emerald-300">{poolInfo.sold}</strong>/{poolInfo.cap ?? poolInfo.restocked_cap ?? poolInfo.daily_cap} (held {poolInfo.held}, oversold {String(poolInfo.oversold)})
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs font-mono text-slate-400 py-8 text-center border border-dashed border-slate-800 rounded-xl">
              {isLive
                ? "Click 'Run 7x1,000 Probe Now' above to execute all 7 samples against Order Guard."
                : "Connect to Perpetual Gateway (:5174 or wa.missperpetual.cloud) and click 'Run 7x1,000 Probe Now'."}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
