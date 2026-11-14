/**
 * Order Lifecycle & Order Guard Live Telemetry Service (Ops <-> Perpetual)
 *
 * Powers the `/lifecycle` Ops page:
 * - Maps all 8 subsystems from Storefront Landing -> Catalog -> Cart -> Checkout -> Order Guard -> Supabase RPC -> M-Pesa -> Tracking
 * - Streams live holds, daily EAT pools, TTL countdowns & backoff config from Perpetual Gateway
 * - Triggers on-demand 7 x 1,000 request stress & resilience probes
 */

import { BRIDGE_ENDPOINTS } from "./dikw-bridge-engine.js";

export { BRIDGE_ENDPOINTS };

export const STAGE_PIPELINE_MAP = [
  {
    step: 1,
    id: "LANDING_ROUTING",
    name: "Landing & Tenant Routing",
    provider: "Storefront SPA (Vercel / Vite) + Supabase",
    subsystem: "Router & Access Guards",
    files: ["src/App.jsx", "src/pages/PublicQrLanding.jsx"],
    processing: "Resolves /q/:slug, /qr/:qrId, /s/:shopId/*, or custom subdomain; loads shop branding & campaigns; redirects /admin externally to ops.tmsavannah.com.",
    validStates: ["SESSION_ACTIVE", "QR_NODE_ACTIVE", "CANONICAL_SLUG_RESOLVED"],
    failureStates: ["QR_UNAVAILABLE", "MAINTENANCE_MODE", "COMING_SOON_GATE"],
    remedyProtocol: "Canonical /qr/:slug redirect; renders fallback Safe Home route without crashing hooks.",
    retryBackoff: "None (client route resolution)",
    ttl: "Session lifetime"
  },
  {
    step: 2,
    id: "CATALOG_LOAD",
    name: "Catalog & Live Stock Load",
    provider: "Supabase (menu_items) / Perpetual API + Local Cache",
    subsystem: "Catalog Service & Cache",
    files: ["src/services/menu-service.js", "src/utils/menu-cache.js", "routes/storefront.mjs"],
    processing: "Fetches active items + product images from Supabase, or serves Perpetual /api/v1/storefront/:slug/catalog overlaid with live OrderGuard available_today.",
    validStates: ["CATALOG_LIVE_SUPABASE", "CATALOG_CACHED_LOCAL", "CATALOG_GATEWAY_ENRICHED"],
    failureStates: ["SUPABASE_TIMEOUT_1500MS", "NETWORK_OFFLINE", "SHOP_NOT_FOUND_404"],
    remedyProtocol: "3-tier cascade: image-joined query (1.5s) -> flat query fallback -> localStorage cache / TENANT_REGISTRY bundled catalog.",
    retryBackoff: "1200ms shop lookup + 1500ms menu timeout; 4000ms gateway timeout",
    ttl: "localStorage cache: 1h · Edge CDN: s-maxage=10s, SWR=50s"
  },
  {
    step: 3,
    id: "CART_SESSION",
    name: "Cart & Multi-Tab Session Sync",
    provider: "Browser Client (useCart)",
    subsystem: "Client State & Stock Addition Guard",
    files: ["src/hooks/useCart.ts", "src/utils/cart-math.ts"],
    processing: "Persists shop-scoped cart (qr_cart_<shopId>), coupons & parent order ID in localStorage; broadcasts tms:cart-change & listens to storage events.",
    validStates: ["CART_SYNCED", "COUPON_APPLIED", "QUANTITY_CAPPED_TO_STOCK"],
    failureStates: ["UNABLE_TO_ADD_SOLD_OUT", "STOCK_LIMIT_EXCEEDED"],
    remedyProtocol: "Blocks addItem when stock <= 0; clamps quantity via resolveStockAddition so cart never exceeds known daily stock.",
    retryBackoff: "Synchronous localStorage + DOM event sync",
    ttl: "Persistent localStorage (cleared on payment settlement)"
  },
  {
    step: 4,
    id: "PRE_CHECKOUT_GATES",
    name: "Pre-Checkout Identity, Geofence & Offline Queue",
    provider: "Storefront Checkout Hooks",
    subsystem: "useOrderCheckout + useOrderSubmission",
    files: ["src/hooks/useOrderCheckout.js", "src/hooks/checkout/useOrderSubmission.js", "src/utils/order-queue.js"],
    processing: "Tracks navigator.onLine, computes delivery quote, validates 15,000m geofence, persists mutation ID in sessionStorage, and blocks 30s duplicate submits.",
    validStates: ["WITHIN_GEOFENCE", "ONLINE_READY", "SESSION_MUTATION_RESUMED"],
    failureStates: ["NO_INTERNET_OFFLINE", "OUT_OF_DELIVERY_BOUNDS", "DUPLICATE_SUBMIT_30S"],
    remedyProtocol: "Offline submits queue into qr_queued_order and register one-time window online listener for automatic WhatsApp/order replay.",
    retryBackoff: "Event-driven auto-sync on window 'online' event",
    ttl: "Duplicate hash window: 30s · Session keys active until settlement"
  },
  {
    step: 5,
    id: "ORDER_GUARD_INSPECT",
    name: "Blind Order Guard Inspection & Atomic Hold",
    provider: "Order Guard Client -> Perpetual OrderGuard",
    subsystem: "Split-Key Crypto + Mutex Inventory Pool",
    files: ["src/services/order-guard-client.js", "src/pages/Order.jsx", "blind_checkout_crypto.mjs", "order_guard.mjs"],
    processing: "Refreshes authoritative unit prices, seals PII & items separately (AES-256-GCM + HMAC), deduplicates active holds, enforces limits, and locks HELD pool.",
    validStates: ["APPROVED (STOCK_RESERVED)", "HOLD_ALREADY_ACTIVE", "TRIMMED_SUREBET", "NEEDS_APPROVAL"],
    failureStates: ["EMPTY_ORDER", "INVALID_QUANTITY", "INVALID_PRICE", "BELOW_MIN_QTY", "INVALID_STEP_QTY", "MAX_PER_ORDER_EXCEEDED", "DAILY_CUSTOMER_LIMIT_EXCEEDED", "INSUFFICIENT_STOCK", "SOLD_OUT", "ORDER_ID_CONFLICT", "GATEWAY_UNREACHABLE"],
    remedyProtocol: "See -> Act -> Remedy buttons & applyOrderGuardRemedy(): auto-adjusts available stock, caps max_per_order, syncs surebet trims, or strips OOS items; fail-closed in prod.",
    retryBackoff: "maxRetries=2, base=60ms, exp=60*2^n+jitter, cap=800ms on 502/503/504/network drops; fast-fail on 4xx",
    ttl: "Hold TTL: 10m (600s) + Grace: 3m (180s) = 13m hard · Approval Hold: 30m · Daily reset midnight EAT"
  },
  {
    step: 6,
    id: "SUPABASE_RPC_CREATE",
    name: "Transactional DB Order Creation",
    provider: "Supabase PostgreSQL RPC (checkout_cart)",
    subsystem: "Order Persistence Service",
    files: ["src/services/order-service.ts"],
    processing: "Strips client prices, invokes supabase.rpc('checkout_cart') with client_mutation_id idempotency, logs order_checkout_completed, pings System B gateway.",
    validStates: ["RPC_ORDER_CREATED"],
    failureStates: ["RPC_INSUFFICIENT_OR_INVALID", "RPC_NETWORK_ERROR"],
    remedyProtocol: "Clears qr_last_order_hash & qr_last_order_time on catch so legitimate buyer retries are never blocked for 30s.",
    retryBackoff: "Idempotent client_mutation_id safe retry",
    ttl: "Durable PostgreSQL row"
  },
  {
    step: 7,
    id: "MPESA_PAYMENT_RADAR",
    name: "M-Pesa Till Presentation & Dual-Channel Radar",
    provider: "Payment Modal + Till Relay + Supabase Realtime",
    subsystem: "Payment Verification Engine",
    files: ["src/components/payment/PaymentModal.jsx", "src/components/payment/usePaymentRadar.js", "src/components/payment/payment-helpers.js", "routes/orders.mjs"],
    processing: "Resolves Till 5758419 (SAVANNAH ATELIER), checks 10m pre-paid till_receipt_pool.json lookback, extracts 10-char M-Pesa SMS codes, polls + listens via WebSocket.",
    validStates: ["PREPAID_RECEIPT_MATCHED", "PAID_CONFIRMED", "REALTIME_UPDATE_PAID"],
    failureStates: ["POLL_CEILING_60S", "AMBIGUOUS_RECEIPT", "CANCELLED_OR_EXPIRED_EARLY_STOP"],
    remedyProtocol: "Early cashier/code prompt at 20s; smart early-stop when canAutoClear===false; SMS full-text paste parser extracts 10-char code.",
    retryBackoff: "2.5s interval polling up to 60s ceiling + continuous Supabase Realtime WebSocket",
    ttl: "Pre-paid Till lookback: 10m · Radar polling ceiling: 60s"
  },
  {
    step: 8,
    id: "COMMIT_AND_TRACK",
    name: "Permanent Stock Commit & Live Order Tracking",
    provider: "Perpetual OrderGuard + Storefront Router",
    subsystem: "Commit & Settlement Finalizer",
    files: ["order_guard.mjs", "src/hooks/checkout/useMpesaPayment.js"],
    processing: "Commits HELD -> sold (COMMITTED); recovers late EXPIRED payments if stock remains or returns REFUND_REQUIRED; clears sessionStorage & cart; opens /track/:id.",
    validStates: ["COMMITTED", "ALREADY_COMMITTED", "LATE_PAYMENT_RECOVERED"],
    failureStates: ["APPROVAL_REQUIRED", "HOLD_NOT_RECOVERABLE", "REFUND_REQUIRED"],
    remedyProtocol: "Zero-oversell guarantee: EXPIRED payments when stock=0 trigger REFUND_REQUIRED flag instead of double-selling; explicitly aborted holds never recover.",
    retryBackoff: "Idempotent commitOrder() returns ALREADY_COMMITTED safely",
    ttl: "Permanent ledger record; clears browser checkout session immediately"
  }
];

const FALLBACK_CONFIG = {
  holdTtlMs: 600000,
  graceTtlMs: 180000,
  approvalHoldTtlMs: 1800000,
  maxOrderValue: 20000,
  tillLookbackMs: 600000,
  radarMaxPollSec: 60,
  menuCacheTtlHours: 1,
  duplicateGuardWindowSec: 30,
  backoff: {
    maxRetries: 2,
    baseDelayMs: 60,
    maxDelayMs: 800,
    retryableStatuses: [502, 503, 504],
  },
};

function getCandidateBases(endpointBase = "") {
  if (endpointBase) return [endpointBase.replace(/\/+$/, "")];
  return ["", "http://127.0.0.1:5174", "https://wa.missperpetual.cloud", "https://api.tmsavannah.com"];
}

export async function fetchOrderLifecycleTelemetry(endpointBase = "") {
  const candidates = getCandidateBases(endpointBase);
  let lastError = null;

  for (const base of candidates) {
    const url = `${base}/api/order-guard/live-telemetry`;
    const started = performance.now ? performance.now() : Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} from ${url}`);
        continue;
      }
      const data = await res.json();
      const end = performance.now ? performance.now() : Date.now();
      return {
        ...data,
        sourceMode: "live",
        endpointUsed: base || "same-origin",
        roundTripMs: Math.round(end - started),
        stages: STAGE_PIPELINE_MAP,
      };
    } catch (err) {
      lastError = err;
    }
  }

  return {
    ok: false,
    sourceMode: "offline-fallback",
    endpointUsed: endpointBase || "unreachable",
    roundTripMs: null,
    error: lastError?.message || "Perpetual Order Guard telemetry unreachable",
    timestamp: new Date().toISOString(),
    bridge: { whatsappConnection: "unknown", uptimeSec: 0 },
    config: FALLBACK_CONFIG,
    summary: {
      policiesCount: 0,
      poolsCount: 0,
      totalHoldsTracked: 0,
      statusCounts: {
        HELD: 0,
        NEEDS_APPROVAL: 0,
        COMMITTED: 0,
        EXPIRED: 0,
        RELEASED: 0,
        CANCELLED: 0,
        REFUND_REQUIRED: 0,
      },
    },
    pools: [],
    policies: [],
    activeHolds: [],
    lastProbeReport: null,
    stages: STAGE_PIPELINE_MAP,
  };
}

export async function triggerOrderLifecycleProbe(endpointBase = "", { sample = "ALL" } = {}) {
  const candidates = getCandidateBases(endpointBase);
  let lastError = null;

  for (const base of candidates) {
    const url = `${base}/api/order-guard/run-probe`;
    const started = performance.now ? performance.now() : Date.now();
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} from ${url}`);
        continue;
      }
      const data = await res.json();
      const end = performance.now ? performance.now() : Date.now();
      return {
        ...data,
        endpointUsed: base || "same-origin",
        roundTripMs: Math.round(end - started),
      };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Could not reach /api/order-guard/run-probe");
}
