import test from "node:test";
import assert from "node:assert/strict";
import { processDikwPipeline, WISDOM_MIN_SAMPLES_INFRA, WISDOM_MIN_SAMPLES_OPS } from "./dikw-bridge-engine.js";

function makeSnapshot({ ok = true, latency = 120, openTickets = 1, activeShops = 13 } = {}) {
  if (!ok) {
    return { ok: false, receivedAt: new Date().toISOString(), error: "ECONNREFUSED" };
  }
  return {
    ok: true,
    roundTripMs: 18,
    receivedAt: new Date().toISOString(),
    payload: {
      bridge: { status: "UP", uptimeSec: 300, whatsappConnection: "open", groupsCount: 3 },
      sentinel: {
        level: latency >= 600 ? "CRITICAL" : "OK",
        metrics: { activeShops, ordersLastHour: 4, probeLatencyMs: latency },
        triggers: latency >= 600 ? [`Supabase latency ${latency}ms >= 600ms`] : [],
      },
      tickets: {
        total: openTickets + 2,
        activeCount: openTickets,
        resolvedCount: 2,
        active: openTickets > 0 ? [{ id: "INC-100", title: "Test", description: "Check", severity: "LOW" }] : [],
        recentResolved: [],
      },
      orderGuard: { policiesCount: 12, activeHoldsCount: 1 },
      groups: { itHelpdesk: { name: "Perpetua - IT Helpdesk", jid: "123@g.us" } },
    },
  };
}

test("1. Keeps Wisdom GATED on a single high-latency spike (prevents premature conclusion)", () => {
  const result = processDikwPipeline([makeSnapshot({ latency: 3912 })]);

  assert.equal(result.data.probeLatencyMs, 3912);
  assert.equal(result.information.activeRequests.length, 1);

  const infraWisdom = result.wisdom.find((w) => w.id === "db-latency-upgrade-signal");
  assert.equal(infraWisdom.gateStatus, "GATED");
  assert.ok(infraWisdom.reason.includes(`1/${WISDOM_MIN_SAMPLES_INFRA}`));
  assert.equal(infraWisdom.recommendation, null);
});

test("2. Flags CONFLICTING_SIGNALS when latency spikes alternate with healthy probes", () => {
  const snapshots = [
    makeSnapshot({ latency: 900 }),
    makeSnapshot({ latency: 110 }),
    makeSnapshot({ latency: 850 }),
    makeSnapshot({ latency: 120 }),
    makeSnapshot({ latency: 950 }),
  ];
  const result = processDikwPipeline(snapshots);

  const infraWisdom = result.wisdom.find((w) => w.id === "db-latency-upgrade-signal");
  assert.equal(infraWisdom.gateStatus, "CONFLICTING_SIGNALS");
  assert.ok(infraWisdom.reason.includes("Mixed signals"));
});

test("3. Promotes Wisdom to READY_FOR_REVIEW and RATIFIED only after sustained corroborated samples", () => {
  const snapshots = Array.from({ length: WISDOM_MIN_SAMPLES_INFRA }, () => makeSnapshot({ latency: 780 }));
  const unratified = processDikwPipeline(snapshots);

  const bridgeWisdom = unratified.wisdom.find((w) => w.id === "bridge-availability");
  const infraWisdom = unratified.wisdom.find((w) => w.id === "db-latency-upgrade-signal");
  assert.equal(bridgeWisdom.gateStatus, "READY_FOR_REVIEW");
  assert.equal(infraWisdom.gateStatus, "READY_FOR_REVIEW");
  assert.ok(infraWisdom.recommendation.includes("api.tmsavannah.com"));

  const ratified = processDikwPipeline(snapshots, ["db-latency-upgrade-signal"]);
  assert.equal(ratified.wisdom.find((w) => w.id === "db-latency-upgrade-signal").gateStatus, "RATIFIED");
  assert.equal(WISDOM_MIN_SAMPLES_OPS, 3);
});
