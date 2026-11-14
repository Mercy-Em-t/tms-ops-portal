/**
 * Perpetual <-> Ops DIKW Intelligence & Bridge Engine
 *
 * Processes raw signals received across the Perpetual bridge into:
 *   1. Data        -> Validated, timestamped records
 *   2. Information -> Contextualized executive summaries, notes & active requests
 *   3. Knowledge   -> Corroborated multi-sample patterns & operational trends
 *   4. Wisdom      -> Epistemically gated strategic decisions (NO premature conclusion)
 */

export const BRIDGE_ENDPOINTS = [
  { id: "same-origin", label: "Same-Origin Proxy (/api)", url: "" },
  { id: "local", label: "Local Perpetual (:5174)", url: "http://127.0.0.1:5174" },
  { id: "cloud-wa", label: "Perpetual Cloud (wa.missperpetual.cloud)", url: "https://wa.missperpetual.cloud" },
  { id: "cloud-api", label: "Savannah API (api.tmsavannah.com)", url: "https://api.tmsavannah.com" },
];

export const WISDOM_MIN_SAMPLES_OPS = 3;
export const WISDOM_MIN_SAMPLES_INFRA = 5;

export async function fetchExecutiveBridgeFeed(endpointBase = "") {
  const candidates = endpointBase
    ? [endpointBase.replace(/\/+$/, "")]
    : ["", "http://127.0.0.1:5174", "https://wa.missperpetual.cloud"];

  let lastError = null;
  for (const base of candidates) {
    const url = `${base}/api/bridge/executive-feed`;
    const started = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} from ${url}`);
        continue;
      }
      const payload = await res.json();
      return {
        ok: true,
        endpointUsed: base || "same-origin",
        roundTripMs: Date.now() - started,
        receivedAt: new Date().toISOString(),
        payload,
      };
    } catch (err) {
      lastError = err;
    }
  }

  return {
    ok: false,
    endpointUsed: endpointBase || "auto",
    roundTripMs: null,
    receivedAt: new Date().toISOString(),
    error: lastError?.message || "Bridge unreachable",
    payload: null,
  };
}

export async function triggerBridgeSentinelCheck(endpointBase = "") {
  const base = endpointBase.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/sentinel/check-now`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Sentinel check failed (${res.status})`);
  return res.json();
}

export async function dispatchBridgeExecutiveNote(endpointBase = "", note = {}) {
  const base = endpointBase.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/support/ticket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: note.title || "Executive Bridge Note",
      description: note.description,
      source: note.source || "Ops / DIKW Bridge",
      severity: note.severity || "MEDIUM",
      reportedBy: note.reportedBy || "Ops Executive Console",
    }),
    signal: AbortSignal.timeout(6000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Dispatch failed (${res.status})`);
  return data;
}

/**
 * Pure DIKW transformation over a chronological array of bridge snapshots.
 * Enforces strict epistemic gating so single spikes never prematurely conclude Wisdom.
 */
export function processDikwPipeline(snapshots = [], ratifiedIds = []) {
  const validSnapshots = snapshots.filter((s) => s && s.ok && s.payload);
  const totalAttempts = snapshots.length;
  const latest = validSnapshots[validSnapshots.length - 1] || null;

  // 1. DATA: Raw, validated, timestamped facts from latest snapshot
  const latestBridge = latest?.payload?.bridge || null;
  const latestSentinel = latest?.payload?.sentinel || null;
  const latestTickets = latest?.payload?.tickets || null;
  const latestGuard = latest?.payload?.orderGuard || null;
  const latestGroups = latest?.payload?.groups || {};

  const data = {
    snapshotCount: validSnapshots.length,
    totalAttempts,
    lastReceivedAt: latest?.receivedAt || null,
    roundTripMs: latest?.roundTripMs ?? null,
    whatsappConnection: latestBridge?.whatsappConnection || "unknown",
    uptimeSec: latestBridge?.uptimeSec ?? 0,
    activeShops: latestSentinel?.metrics?.activeShops ?? null,
    ordersLastHour: latestSentinel?.metrics?.ordersLastHour ?? null,
    probeLatencyMs: latestSentinel?.metrics?.probeLatencyMs ?? null,
    sentinelLevel: latestSentinel?.level || "UNKNOWN",
    openTicketsCount: latestTickets?.activeCount ?? 0,
    resolvedTicketsCount: latestTickets?.resolvedCount ?? 0,
    orderGuardPolicies: latestGuard?.policiesCount ?? 0,
    orderGuardActiveHolds: latestGuard?.activeHoldsCount ?? 0,
  };

  // 2. INFORMATION: Contextualized executive overview, updates, notes & requests
  const activeRequests = (latestTickets?.active || []).map((t) => ({
    id: t.id,
    title: t.title || t.id,
    description: t.description || "",
    severity: t.severity || "MEDIUM",
    source: t.source || "API",
    createdAt: t.createdAt,
  }));

  const recentUpdates = (latestTickets?.recentResolved || []).map((t) => ({
    id: t.id,
    title: t.title || t.id,
    resolvedBy: t.resolvedBy || "Operator",
    resolvedAt: t.resolvedAt,
  }));

  const information = {
    executiveSummary: latest
      ? `Bridge UP (${data.roundTripMs}ms RTT). WhatsApp socket: ${data.whatsappConnection}. ${data.activeShops ?? "?"} active shops, ${data.openTicketsCount} open requests, ${data.orderGuardActiveHolds} active Order Guard holds.`
      : "No valid bridge snapshots received yet. Bridge connection requires attention.",
    sentinelTriggers: latestSentinel?.triggers || [],
    activeRequests,
    recentUpdates,
    departments: Object.entries(latestGroups).map(([key, g]) => ({
      key,
      name: g?.name || key,
      jid: g?.jid || "",
    })),
  };

  // 3. KNOWLEDGE: Corroborated multi-sample patterns across the rolling window
  const latencySamples = validSnapshots
    .map((s) => s.payload?.sentinel?.metrics?.probeLatencyMs)
    .filter((v) => typeof v === "number");
  const highLatencyCount = latencySamples.filter((ms) => ms >= 600).length;
  const normalLatencyCount = latencySamples.filter((ms) => ms < 600).length;
  const hasLatencyContradiction = highLatencyCount > 0 && normalLatencyCount > 0;

  const uptimeRate = totalAttempts > 0
    ? Math.round((validSnapshots.length / totalAttempts) * 100)
    : 0;

  const knowledgePatterns = [
    {
      id: "bridge-availability",
      title: "Ops ↔ Perpetual Bridge Reliability",
      observation: `${validSnapshots.length}/${totalAttempts} heartbeats succeeded (${uptimeRate}% availability).`,
      sampleCount: totalAttempts,
      minRequiredSamples: WISDOM_MIN_SAMPLES_OPS,
      corroborated: totalAttempts >= WISDOM_MIN_SAMPLES_OPS && uptimeRate >= 80,
      contradiction: totalAttempts >= WISDOM_MIN_SAMPLES_OPS && uptimeRate < 80
        ? `Bridge dropped ${totalAttempts - validSnapshots.length} of ${totalAttempts} probes.`
        : null,
    },
    {
      id: "db-latency-upgrade-signal",
      title: "Supabase Latency vs Dedicated Backend Upgrade",
      observation:
        latencySamples.length === 0
          ? "No Supabase latency probes recorded yet."
          : `${highLatencyCount}/${latencySamples.length} probes >= 600ms critical threshold (latest: ${latencySamples[latencySamples.length - 1]}ms).`,
      sampleCount: latencySamples.length,
      minRequiredSamples: WISDOM_MIN_SAMPLES_INFRA,
      corroborated:
        latencySamples.length >= WISDOM_MIN_SAMPLES_INFRA &&
        highLatencyCount >= Math.ceil(latencySamples.length * 0.8),
      contradiction: hasLatencyContradiction
        ? `Mixed signals: ${normalLatencyCount} probe(s) < 600ms vs ${highLatencyCount} spike(s) >= 600ms.`
        : null,
    },
    {
      id: "support-queue-pressure",
      title: "IT Helpdesk Request Queue Pressure",
      observation: `${data.openTicketsCount} active incident(s), ${data.resolvedTicketsCount} resolved.`,
      sampleCount: validSnapshots.length,
      minRequiredSamples: WISDOM_MIN_SAMPLES_OPS,
      corroborated: validSnapshots.length >= WISDOM_MIN_SAMPLES_OPS,
      contradiction: null,
    },
  ];

  // 4. WISDOM: Epistemically gated strategic decisions (NO premature conclusion)
  const wisdomCandidates = knowledgePatterns.map((pattern) => {
    const isRatified = ratifiedIds.includes(pattern.id);
    if (pattern.sampleCount < pattern.minRequiredSamples) {
      return {
        id: pattern.id,
        title: pattern.title,
        gateStatus: "GATED",
        reason: `Insufficient evidence: ${pattern.sampleCount}/${pattern.minRequiredSamples} samples collected. Holding to prevent premature wisdom.`,
        recommendation: null,
        ratified: false,
      };
    }
    if (pattern.contradiction) {
      return {
        id: pattern.id,
        title: pattern.title,
        gateStatus: "CONFLICTING_SIGNALS",
        reason: pattern.contradiction,
        recommendation: "Continue observing before committing structural changes.",
        ratified: false,
      };
    }
    if (!pattern.corroborated) {
      return {
        id: pattern.id,
        title: pattern.title,
        gateStatus: "GATED",
        reason: "Threshold not sustained across observation window.",
        recommendation: null,
        ratified: false,
      };
    }

    const recommendationById = {
      "bridge-availability": "Bridge SLA verified stable for continuous executive telemetry.",
      "db-latency-upgrade-signal": "Sustained >=600ms DB latency corroborated. Ready to schedule upgrade to api.tmsavannah.com + Cloudflare Edge Cache.",
      "support-queue-pressure":
        data.openTicketsCount > 3
          ? "Sustained open ticket backlog detected — allocate dedicated triage rotation."
          : "Support queue capacity is healthy across sustained checks.",
    };

    return {
      id: pattern.id,
      title: pattern.title,
      gateStatus: isRatified ? "RATIFIED" : "READY_FOR_REVIEW",
      reason: `Corroborated across ${pattern.sampleCount} samples with zero contradictions.`,
      recommendation: recommendationById[pattern.id] || pattern.observation,
      ratified: isRatified,
    };
  });

  return {
    data,
    information,
    knowledge: knowledgePatterns,
    wisdom: wisdomCandidates,
  };
}
