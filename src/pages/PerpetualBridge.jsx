import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  BRIDGE_ENDPOINTS,
  fetchExecutiveBridgeFeed,
  triggerBridgeSentinelCheck,
  dispatchBridgeExecutiveNote,
  processDikwPipeline,
} from "../services/dikw-bridge-engine";

const GATE_BADGE = {
  GATED: "bg-slate-800 text-amber-300 border-amber-500/40",
  CONFLICTING_SIGNALS: "bg-rose-950/60 text-rose-300 border-rose-500/50",
  READY_FOR_REVIEW: "bg-emerald-950/60 text-emerald-300 border-emerald-500/50",
  RATIFIED: "bg-indigo-950/60 text-indigo-300 border-indigo-400/60",
};

export default function PerpetualBridge() {
  const [selectedEndpoint, setSelectedEndpoint] = useState("");
  const [snapshots, setSnapshots] = useState([]);
  const [ratifiedIds, setRatifiedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoKeepAlive, setAutoKeepAlive] = useState(true);
  const [activeStage, setActiveStage] = useState("all");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [dispatchStatus, setDispatchStatus] = useState(null);

  const probeBridge = useCallback(async () => {
    setLoading(true);
    const snap = await fetchExecutiveBridgeFeed(selectedEndpoint);
    setSnapshots((prev) => [...prev.slice(-19), snap]);
    setLoading(false);
  }, [selectedEndpoint]);

  useEffect(() => {
    probeBridge();
  }, [probeBridge]);

  useEffect(() => {
    if (!autoKeepAlive) return undefined;
    const timer = setInterval(probeBridge, 15000);
    return () => clearInterval(timer);
  }, [autoKeepAlive, probeBridge]);

  const dikw = useMemo(
    () => processDikwPipeline(snapshots, ratifiedIds),
    [snapshots, ratifiedIds]
  );

  const latestSnap = snapshots[snapshots.length - 1] || null;
  const bridgeUp = Boolean(latestSnap?.ok);

  async function handleRunSentinel() {
    try {
      setDispatchStatus("Running Scaling Sentinel probe...");
      await triggerBridgeSentinelCheck(selectedEndpoint);
      await probeBridge();
      setDispatchStatus("Sentinel probe completed and ingested.");
    } catch (err) {
      setDispatchStatus(`Sentinel error: ${err.message}`);
    }
  }

  async function handleSendNote(e) {
    e.preventDefault();
    if (!noteBody.trim()) return;
    try {
      setDispatchStatus("Sending executive note across Perpetual bridge...");
      const res = await dispatchBridgeExecutiveNote(selectedEndpoint, {
        title: noteTitle.trim() || "Executive Bridge Directive",
        description: noteBody.trim(),
        severity: "MEDIUM",
      });
      setNoteTitle("");
      setNoteBody("");
      await probeBridge();
      setDispatchStatus(`Dispatched via Bridge (${res?.ticket?.id || "OK"}).`);
    } catch (err) {
      setDispatchStatus(`Dispatch failed: ${err.message}`);
    }
  }

  function ratifyWisdom(id) {
    setRatifiedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  const showStage = (stage) => activeStage === "all" || activeStage === stage;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Bar & Bridge Connection Keep-Alive Department */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800 bg-slate-900/70 rounded-2xl p-5">
          <div>
            <div className="flex items-center gap-3">
              <Link
                to="/admin"
                className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                ← /admin
              </Link>
              <span
                className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
                  bridgeUp
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
                    : "bg-rose-950/60 text-rose-300 border-rose-500/40"
                }`}
              >
                {bridgeUp ? `BRIDGE UP (${latestSnap.roundTripMs}ms)` : "BRIDGE DEGRADED / DOWN"}
              </span>
            </div>
            <h1 className="text-2xl font-bold mt-2 tracking-tight">
              Perpetual Bridge &amp; DIKW Intelligence Department
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Keep-alive telemetry bridge from Perpetual (:5174 / api.tmsavannah.com) → Data → Information → Knowledge → Epistemically Gated Wisdom.
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
              onClick={() => setAutoKeepAlive((v) => !v)}
              className={`px-3 py-2 rounded-lg text-xs font-mono border ${
                autoKeepAlive
                  ? "bg-emerald-950/50 border-emerald-600/50 text-emerald-300"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              Keep-Alive: {autoKeepAlive ? "ON (15s)" : "PAUSED"}
            </button>

            <button
              onClick={probeBridge}
              disabled={loading}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
            >
              {loading ? "Probing..." : "Probe Now"}
            </button>

            <button
              onClick={handleRunSentinel}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
            >
              Run Sentinel Check
            </button>
          </div>
        </div>

        {/* Stage Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All DIKW Stages" },
            { id: "data", label: "1. Data" },
            { id: "information", label: "2. Information" },
            { id: "knowledge", label: "3. Knowledge" },
            { id: "wisdom", label: "4. Wisdom (Gated)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveStage(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${
                activeStage === tab.id
                  ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1. DATA */}
        {showStage("data") && (
          <section className="border border-slate-800 bg-slate-900/60 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-mono uppercase tracking-wider text-sky-400">
              Stage 1 · Data (Validated Records · {dikw.data.snapshotCount}/{dikw.data.totalAttempts} Probes)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              {[
                ["WhatsApp Socket", dikw.data.whatsappConnection],
                ["Active Shops", dikw.data.activeShops ?? "—"],
                ["Orders / Hr", dikw.data.ordersLastHour ?? "—"],
                ["DB Latency", dikw.data.probeLatencyMs !== null ? `${dikw.data.probeLatencyMs}ms` : "—"],
                ["Open Requests", dikw.data.openTicketsCount],
                ["Active Guard Holds", dikw.data.orderGuardActiveHolds],
              ].map(([label, val]) => (
                <div key={label} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-slate-400">{label}</div>
                  <div className="text-base font-bold font-mono text-slate-100 mt-1">{String(val)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. INFORMATION */}
        {showStage("information") && (
          <section className="border border-slate-800 bg-slate-900/60 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-mono uppercase tracking-wider text-emerald-400">
              Stage 2 · Information (Executive Overview, Summaries &amp; Active Requests)
            </h2>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200">
              {dikw.information.executiveSummary}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-mono text-slate-400 uppercase mb-2">
                  Active Requests ({dikw.information.activeRequests.length})
                </h3>
                {dikw.information.activeRequests.length === 0 ? (
                  <p className="text-xs text-slate-500">No active support requests in queue.</p>
                ) : (
                  <ul className="space-y-2 max-h-56 overflow-y-auto">
                    {dikw.information.activeRequests.map((req) => (
                      <li key={req.id} className="border border-slate-800 rounded-lg p-2.5 text-xs">
                        <div className="flex justify-between font-mono text-amber-300">
                          <span>{req.id}</span>
                          <span>{req.severity}</span>
                        </div>
                        <div className="font-semibold text-slate-100 mt-0.5">{req.title}</div>
                        <div className="text-slate-400 mt-0.5">{req.description}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <form onSubmit={handleSendNote} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <h3 className="text-xs font-mono text-slate-400 uppercase">
                  Send Executive Note / Request to Perpetual
                </h3>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Directive title (e.g. Review checkout latency)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
                <textarea
                  rows={3}
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Write executive note or operational request..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    Dispatch via Bridge
                  </button>
                  {dispatchStatus && <span className="text-xs text-slate-400 font-mono">{dispatchStatus}</span>}
                </div>
              </form>
            </div>
          </section>
        )}

        {/* 3. KNOWLEDGE */}
        {showStage("knowledge") && (
          <section className="border border-slate-800 bg-slate-900/60 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-mono uppercase tracking-wider text-violet-400">
              Stage 3 · Knowledge (Corroborated Multi-Sample Patterns)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {dikw.knowledge.map((k) => (
                <div key={k.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-100">{k.title}</span>
                    <span className="font-mono text-violet-300">
                      {k.sampleCount}/{k.minRequiredSamples}
                    </span>
                  </div>
                  <p className="text-slate-300">{k.observation}</p>
                  {k.contradiction && <p className="text-rose-400">Contradiction: {k.contradiction}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. WISDOM (GATED) */}
        {showStage("wisdom") && (
          <section className="border border-slate-800 bg-slate-900/60 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-mono uppercase tracking-wider text-amber-300">
              Stage 4 · Wisdom (Epistemically Gated — No Premature Conclusion)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {dikw.wisdom.map((w) => (
                <div key={w.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-100">{w.title}</span>
                    <span className={`font-mono px-2 py-0.5 rounded border ${GATE_BADGE[w.gateStatus] || ""}`}>
                      {w.gateStatus}
                    </span>
                  </div>
                  <p className="text-slate-400">{w.reason}</p>
                  {w.recommendation && <p className="text-emerald-300 font-medium">{w.recommendation}</p>}
                  {w.gateStatus === "READY_FOR_REVIEW" && (
                    <button
                      onClick={() => ratifyWisdom(w.id)}
                      className="mt-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                    >
                      Ratify Executive Decision
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
