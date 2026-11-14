import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGE_PIPELINE_MAP,
  fetchOrderLifecycleTelemetry,
  triggerOrderLifecycleProbe,
} from "./order-lifecycle-service.js";

test("STAGE_PIPELINE_MAP defines all 8 stages from landing to payment & tracking with TTL and backoff metadata", () => {
  assert.equal(STAGE_PIPELINE_MAP.length, 8);
  assert.equal(STAGE_PIPELINE_MAP[0].id, "LANDING_ROUTING");
  assert.equal(STAGE_PIPELINE_MAP[4].id, "ORDER_GUARD_INSPECT");
  assert.equal(STAGE_PIPELINE_MAP[6].id, "MPESA_PAYMENT_RADAR");
  assert.equal(STAGE_PIPELINE_MAP[7].id, "COMMIT_AND_TRACK");

  for (const stage of STAGE_PIPELINE_MAP) {
    assert.ok(stage.provider.length > 0);
    assert.ok(Array.isArray(stage.validStates) && stage.validStates.length > 0);
    assert.ok(Array.isArray(stage.failureStates) && stage.failureStates.length > 0);
    assert.ok(stage.remedyProtocol.length > 0);
    assert.ok(stage.retryBackoff.length > 0);
    assert.ok(stage.ttl.length > 0);
  }
});

test("fetchOrderLifecycleTelemetry falls back gracefully when explicit endpoint fails", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Connection refused");
  };
  try {
    const res = await fetchOrderLifecycleTelemetry("http://127.0.0.1:59999");
    assert.equal(res.ok, false);
    assert.equal(res.sourceMode, "offline-fallback");
    assert.equal(res.config.holdTtlMs, 600000);
    assert.equal(res.config.graceTtlMs, 180000);
    assert.equal(res.stages.length, 8);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchOrderLifecycleTelemetry & triggerOrderLifecycleProbe parse live telemetry when gateway responds", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/api/order-guard/live-telemetry")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          timestamp: "2026-11-14T12:00:00.000Z",
          bridge: { whatsappConnection: "open", uptimeSec: 42 },
          config: { holdTtlMs: 600000, graceTtlMs: 180000, backoff: { maxRetries: 2, baseDelayMs: 60, maxDelayMs: 800 } },
          summary: { policiesCount: 2, poolsCount: 2, totalHoldsTracked: 1, statusCounts: { HELD: 1 } },
          pools: [{ shop_id: "s1", item_id: "bag", daily_cap: 10, held: 1, sold: 2, available: 7 }],
          policies: [],
          activeHolds: [{ order_id: "ORD-1", status: "HELD", remaining_hold_ms: 500000, remaining_grace_ms: 680000 }],
          lastProbeReport: { ok: true, totalRequests: 7000, zeroOversells: true, samples: [{ sample: "S1_HAPPY_PATH_FULL_LIFECYCLE", requests: 1000 }] },
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        report: { ok: true, totalRequests: 7000, zeroOversells: true, samples: [] },
      }),
    };
  };

  try {
    const live = await fetchOrderLifecycleTelemetry("http://127.0.0.1:5174");
    assert.equal(live.ok, true);
    assert.equal(live.sourceMode, "live");
    assert.equal(live.summary.statusCounts.HELD, 1);
    assert.equal(live.lastProbeReport.totalRequests, 7000);

    const probe = await triggerOrderLifecycleProbe("http://127.0.0.1:5174", { sample: "ALL" });
    assert.equal(probe.ok, true);
    assert.equal(probe.report.totalRequests, 7000);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
