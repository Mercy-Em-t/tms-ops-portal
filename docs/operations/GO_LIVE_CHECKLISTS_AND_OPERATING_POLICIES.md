# The Modern Savannah (TMS) — Platform & Merchant Go-Live Master Manual
**Document Reference:** `TMS-OPS-GL-2026-V1`  
**Governing Domain:** `ops.tmsavannah.com` | `shop.tmsavannah.com`  
**Effective Date:** November 2026  
**Security Classification:** Operational Restrictive / Executive Audit

---

## 1. Platform Go-Live Master Checklist (Engineering & Ops)

Before opening traffic to public customers, the platform engineering lead and operations director must verify every gate below.

| Category | Verification Item | Passing Criteria | Sign-off / Verification Method |
| :--- | :--- | :--- | :--- |
| **DNS & SSL** | Apex `tmsavannah.com` | Points to Anycast IP `76.76.21.21` with valid SSL cert | `curl -I https://tmsavannah.com` $\rightarrow$ `200/308` |
| **DNS & SSL** | Storefront `shop.tmsavannah.com` | CNAME `cname.vercel-dns.com.` with automatic HTTPS renewal | `curl -I https://shop.tmsavannah.com` $\rightarrow$ `200 OK` |
| **DNS & SSL** | Ops Console `ops.tmsavannah.com` | CNAME `cname.vercel-dns.com.` with RBAC auth boundary | `curl -I https://ops.tmsavannah.com` $\rightarrow$ `200 OK` |
| **Till Relay Phone** | Android Daemon Version | `SavannahTillRelay.apk` $\ge$ v2.7.0 running foreground service | Probe `/api/till/receipt?action=health` $\rightarrow$ `is_online: true` |
| **Till Relay Phone** | Battery & Network Keep-Alive | Constant USB/AC charging, Battery Optimization disabled | Device battery $\ge 20\%$, Latency $\le 10\text{ min}$ |
| **Till Relay SIM** | SIM2 M-Pesa Reception | Lipa na M-Pesa Till `5758419` SMS incoming without delays | Test Ping KES 1.00 $\rightarrow$ HTTP 200 within 5 seconds |
| **Settlement FSM** | 3-Tier Cascading Engine | Tier 1 (Phone), Tier 2 (Surname), Tier 3 (15m window) verified | Passed autonomous edge-case suite (P-01 to P-17) |
| **Rate Limiter** | Postgres Order Rate Limit | Enforces max 5 orders per 10 mins per IP to block spam | Trigger `tr_order_ratelimit` on Supabase `orders` |
| **Idempotency** | Double-Click & Hash Lockout | Transient lockouts cleared on error, active order cached | Verified in `useOrderSubmission.js` |
| **Database** | Menu Item UUID Integrity | 100% of orderable products in Supabase have valid UUIDs | Audited: Zero non-UUID products in live stores |
| **WhatsApp Ops** | Gateway Bridge Health | Baileys multi-device daemon online on port 5174 | Verified QR session state = CONNECTED |
| **PWA Cache** | Service Worker Freshness | PWA precache bumps on new commits, auto-updates on client | Cache versioning verified on production build |

---

## 2. Merchant Go-Live Checklist (Per-Tenant Certification)

Every merchant joining the TMS Pavilion must pass this operational certification before receiving an active storefront slug.

### Step 1: Technical & Identity Provisioning
- [ ] **Tenant Record Created:** Unique UUID assigned in `public.shops` with slug (e.g. `/s/brunchbox`).
- [ ] **Industry Classification Configured:** `food` (kitchen pipeline), `retail` (dispatch pipeline), or `services`.
- [ ] **Ops WhatsApp Group JID Assigned:** Operations JID configured for instant dispatch notifications.
- [ ] **Admin Escalation Phone:** Direct manager mobile line registered for critical escalation alerts.
- [ ] **Physical Table / Counter QR Plates:** High-contrast QR codes generated, tested with standard camera app, and physically installed on tables/counters.

### Step 2: Catalog & Pricing Validation
- [ ] **Menu / Product Database Sync:** All active products inserted into `public.menu_items` with authoritative prices, descriptions, and dietary tags.
- [ ] **Price Tamper Immunity:** Zero client-side price overrides; backend RPC `checkout_cart` resolves item prices strictly from `menu_items`.
- [ ] **Inventory / Out-of-Stock Toggles:** Merchant trained on toggling unavailable dishes via Ops Console or WhatsApp quick-reply commands.

### Step 3: End-to-End Financial Trial Run
- [ ] **1 Shilling Live Test:** Merchant executes 1 KES purchase (`M-Pesa Test Ping`) on their live storefront.
- [ ] **Instant Till Clearance:** Android relay captures SMS, clears checkout screen in $< 3$ seconds.
- [ ] **WhatsApp Order Ticket Delivery:** Kitchen/counter phone receives structured order summary ticket.
- [ ] **Ledger Entry Verification:** Transaction recorded in `payments` and verified on `/admin/replay`.

---

## 3. Platform Operating Policies & Service Level Agreements (SLAs)

### 3.1 Order Acceptance Window
1. **Automated Order Dispatch:** Incoming customer orders are acknowledged instantaneously by the platform.
2. **Merchant Order Acceptance SLA:**
   - **Peak Hours (12:00 PM – 2:30 PM & 6:00 PM – 9:00 PM EAT):** Merchant must accept or reject incoming dine-in / pickup orders within **3 minutes**.
   - **Standard Hours:** Maximum allowed acceptance time is **5 minutes**.
3. **Breach / Timeout Escalation:** If an order is not accepted within 5 minutes, an automated voice/SMS escalation is triggered to the store manager. If unanswered after 8 minutes, the order is cancelled, customer alerted, and payment held for instant refund.

### 3.2 Kitchen Prep & Fulfillment Accuracy
- **Fulfillment Accuracy Benchmark:** Merchants must maintain a minimum **98.5% order accuracy rate** (correct items, accurate quantity, modifier fidelity).
- **Prep Time Standards:** Orders must be marked "Ready for Pickup" or "Out for Delivery" within the estimated prep window communicated on the digital order tracking screen.

---

## 4. Penalties Matrix

| Infraction | First Offense | Second Offense (within 30 days) | Repeated / Critical Offense |
| :--- | :--- | :--- | :--- |
| **Unacknowledged Order Drop (Timeout)** | Written Warning via Ops WhatsApp | KES 250 fee deduction from daily payout | Temporary store suspension (24 hours) |
| **Missing Item in Order** | Instant customer refund + KES 100 voucher funded by merchant | Full item refund + KES 250 merchant penalty | Trust score demotion on Pavilion Directory |
| **Defective / Spoiled Food or Goods** | 100% Order Refund funded by merchant | 100% Refund + KES 1,000 health audit fee | Mandatory health inspection re-audit |
| **Unannounced Kitchen Closure with Active Orders** | KES 500 emergency cancellation penalty | KES 1,500 penalty + 3-day storefront suspension | Merchant termination & deposit forfeiture |
| **Manual Price Tampering / Off-Platform Demands** | Formal breach notice | KES 2,500 penalty | Immediate account termination |

---

## 5. Refund & Cancellation Policies

### 5.1 Customer-Initiated Cancellations
- **Before Order Acceptance:** Customer may cancel within **60 seconds** of payment for a 100% instant refund (funds credited to customer wallet or reversed to M-Pesa within 2 hours).
- **After Kitchen Prep Commenced:** Cancellations are non-refundable once the kitchen has accepted and marked prep started, unless approved by store management.

### 5.2 Merchant-Initiated Cancellations
- If a merchant cancels due to stock exhaustion, the platform executes an **instant 100% reversal** of the customer's funds.
- The merchant receives an automated strike unless the stock status was marked unavailable prior to order placement.

### 5.3 Defective Goods & Cold Food Redress
- Customers submit photographic proof within **20 minutes** of delivery/pickup via WhatsApp support or web dispute button.
- Customer support reviews photo against kitchen timestamp. If substantiated, customer receives full or partial refund credited directly.

---

## 6. Dispute Resolution & Arbitration Framework

### 6.1 The 3-Way Audit Trail (Indisputable Proof Chain)
Every transaction dispute is resolved using the immutable triple-evidence chain:
1. **WhatsApp & System Logs:** Exact millisecond timestamps of order placement, kitchen acknowledgement, and status transitions.
2. **Till SIM Receipt:** Raw Lipa na M-Pesa SMS from Safaricom with receipt number, sender name, phone number, and exact till balance.
3. **Rider / Table Telemetry:** GPS location coordinates and timestamp at time of handoff.

### 6.2 Escalation Hierarchy
1. **Tier 1 (Automated Bot Triage):** Instant verification of payment code, receipt status, and order state.
2. **Tier 2 (Ops Desk Arbitrator):** Human review on `ops.tmsavannah.com/admin/replay` within 15 minutes.
3. **Tier 3 (Executive Arbitration):** Final binding ruling by TMS Platform Operations Director.

### 6.3 Liability Limits & Fraud Protection
- **Platform Liability Ceiling:** TMS platform liability is strictly capped at the total transaction value of the disputed order.
- **Chargeback Protection:** Because Lipa na M-Pesa transactions settle in real time via Safaricom, chargeback fraud is mitigated by authoritative cryptographic SMS matching. In the event of Safaricom system reversals, funds are frozen pending verification.
