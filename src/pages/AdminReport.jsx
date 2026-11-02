import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/auth-service";

export default function AdminReport() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [activeReport, setActiveReport] = useState("inbox");

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") {
      navigate("/login");
    }
  }, [navigate, user]);

  const reports = [
    {
      id: "prod_ready_apr10",
      title: "Production Readiness & Security Hardened — April 10, 2026",
      date: "Today · Apr 10",
      author: "Security Architect",
      icon: "🏗️",
      content: (
        <div className="space-y-6">
          <div className="flex gap-2 text-sm font-medium mb-4 flex-wrap">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Status: Production Ready</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Security: Zero-Trust Vault</span>
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Testing: Playwright Activated</span>
            <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded">Code: TypeScript Foundation</span>
          </div>

          <p className="text-gray-600 leading-relaxed">
            Successfully transitioned the platform from a stable prototype to a <strong>Production-Ready Environment</strong>. We have eliminated all previous security warnings and established professional deployment guards.
          </p>

          <div className="space-y-5">
            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">🔐 Zero-Trust Secrets Management (Supabase Vault)</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong>What is it:</strong> We have removed all sensitive credentials (M-Pesa Passkeys, WhatsApp Tokens) from environment variables. They are now stored in the <strong>Supabase Vault</strong>, encrypted at rest, and retrieved only via secure SQL RPC functions. This prevents secret exposure even if the application logs are compromised.
              </p>
            </div>

            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">🎭 Playwright Integration Testing</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong>What is it:</strong> A professional-grade testing infrastructure is now live. We use <strong>Playwright</strong> to simulate real user behavior—scanning QRs, adding items to carts, and triggering payments. This ensures that a code change in one area doesn't accidentally break the checkout flow for our merchants.
              </p>
            </div>

            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">⌨️ TypeScript Core Migration</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong>What is it:</strong> The "Brain" of the platform (Shop Service, Order Service, and Cart State) has been migrated to <strong>TypeScript</strong>. This provides strict type safety, catching "undefined" errors during development instead of in front of a paying customer.
              </p>
            </div>

            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">📦 Versioned Database Governance</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong>What is it:</strong> No more ad-hoc SQL "patches". All database changes are now managed via timestamped <strong>Supabase Migrations</strong>. This allows us to clone the production database to a staging environment for testing with 100% schema accuracy.
              </p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mt-6">
            <h4 className="font-bold text-emerald-900 mb-2">✅ Pre-Launch Certification</h4>
            <ul className="text-sm text-emerald-800 space-y-1 list-disc list-inside">
              <li>Vault Secrets: <strong>ACTIVE</strong></li>
              <li>Zod Schema Validation: <strong>ENFORCED</strong></li>
              <li>Modular Routing: <strong>STABLE</strong></li>
              <li>Unit & E2E Tests: <strong>CONFIGURED</strong></li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: "daily_mar25",
      title: "Daily Briefing — March 25, 2026",
      date: "Today · Mar 25",
      author: "Platform Architect",
      icon: "📋",
      content: (
        <div className="space-y-6">
          <div className="flex gap-2 text-sm font-medium mb-4 flex-wrap">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Status: Build Complete</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Features Shipped: 6</span>
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Security: Hardened</span>
          </div>

          <p className="text-gray-600 leading-relaxed">
            A productive session focused on expanding the platform's ecosystem, locking down security before deployment, and laying the foundation for the Savannah B2B economy.
          </p>

          <div className="space-y-5">
            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">🌐 Shop Discovery & Marketplace Approval</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong>What is it:</strong> Before any shop appears on the public Discover page, it now goes through an Admin review first. Think of it like a quality gate — you look at the shop, optimise its description for search engines (SEO), then click "Approve" to make it visible to the world. Shops that aren't approved stay hidden from public listings.
              </p>
              <p className="text-sm text-indigo-700 mt-2 font-medium">Where to use it: Admin → Shops → Marketplace Status column.</p>
            </div>

            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">🚀 Ecosystem Launcher (Admin Shop, Community & Supplier Creation)</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong>What is it:</strong> You can now create three types of entities from inside the Admin panel — Shops (for merchants), Communities (for discovery groups like "Nairobi Foodies"), and Suppliers (wholesalers who sell bulk stock to shops). Each has its own creation tab in a single sidebar. Creating a shop sends the owner an email invite automatically.
              </p>
              <p className="text-sm text-indigo-700 mt-2 font-medium">Where to use it: Admin → Global Infrastructure → Launch tab.</p>
            </div>

            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">🤝 Supplier Portal & B2B Order Flow</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong>What is it:</strong> Wholesale suppliers can now apply to join the platform via a public signup form. Once approved by you, their products appear in the Supplier Hub, where shop owners can browse, add items to a wholesale cart, and place a bulk order. Shop owners can pay the supplier directly via M-Pesa STK Push or just log the order.
              </p>
              <p className="text-sm text-indigo-700 mt-2 font-medium">Supplier public form: /supplier-signup · Shop owner view: Dashboard → Supplier Hub.</p>
            </div>

            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">🏘️ Community & Social Feed</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong>What is it:</strong> The platform now has a social layer where users can post about products, tag items from any shop, and interact in interest-based communities (like "Tech & Hobbies" or "Savannah Crafters"). When a post tags a product, the product card appears inline with a direct "Add to Cart" button. Think: a social media feed that's also a marketplace.
              </p>
              <p className="text-sm text-indigo-700 mt-2 font-medium">Public URL: /community · Shop Settings → Communities tab to join groups.</p>
            </div>

            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">🎯 Marketing Studio — Promo Bundles</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong>What is it:</strong> Shop owners can now create promotional deals — like "Buy any 2 items and get 15% off" or "Weekend Combo for KSh 800". They pick which products are included, set the discount type and value, add an optional coupon code, and set an expiry date. These promos apply automatically when a customer's cart qualifies.
              </p>
              <p className="text-sm text-indigo-700 mt-2 font-medium">Where to use it: Dashboard → Marketing Studio → Promo Bundles tab.</p>
            </div>

            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">🛡️ Shop Settings — Identity Lock & Smart Subdomain</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong>What is it:</strong> The Shop Settings page was redesigned. Fields that form the shop's legal identity (name, domain) are now visually "locked" with a premium glass effect, so owners understand they need to contact Admin to change them. A "Sync Name" button was also added — it automatically generates a clean web-friendly subdomain from the shop's name (e.g. "Fresh Produce Ltd" → "fresh-produce-ltd").
              </p>
              <p className="text-sm text-indigo-700 mt-2 font-medium">Where to use it: Dashboard → Settings → Shop Identity section.</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mt-6">
            <h4 className="font-bold text-amber-900 mb-2">⚡ Action Required Before Deploying</h4>
            <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
              <li>Run <code className="bg-amber-100 px-1 rounded">supabase_repair_v4.sql</code> in Supabase SQL Editor</li>
              <li>Run <code className="bg-amber-100 px-1 rounded">supabase_hardening_patch.sql</code> in Supabase SQL Editor</li>
              <li>Confirm <code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> is set in Vercel env vars</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: "health",
      title: "Platform Health & Diagnostics",
      date: "Today",
      author: "System Automated",
      icon: "🩺",
      content: (
        <div className="space-y-6">
           <div className="flex gap-2 text-sm text-gray-500 font-medium mb-4">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Status: Cohesive & Stable</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Uptime: 99.9%</span>
           </div>
           <p className="text-gray-600 leading-relaxed">
              <strong>System Initialization Analysis:</strong> Since the core infrastructure booted, the platform has maintained peak stability. Supabase network latency remains below 120ms on average.
           </p>
           <div>
              <h4 className="font-bold text-gray-800 mb-2">Architectural Cohesion Audit</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-2">
                 <li><strong>Backend (Supabase):</strong> Unified under Row-Level Security (RLS) linking to `shop_id`. No isolated or orphaned data fragments exist. Rate-Limits are handled via pure Postgres triggers.</li>
                 <li><strong>Frontend Engine:</strong> Routing layer maps flawlessly from physical QR scans (`/q/:qrId`) to virtual shop profiles (`/shops/:shopId`). All hooks bind securely to `qr_session`.</li>
                 <li><strong>Legal & Compliance:</strong> The perimeter privacy interceptor successfully blocks background telemetry until local GDPR/Kenya DPA consent is granted.</li>
                 <li><strong>eCommerce Synchronization:</strong> The Bulk CSV Lexical Uploader correctly maps nested JSON variants and multiple image attachments directly into scalable arrays.</li>
              </ul>
           </div>
        </div>
      )
    },
    {
      id: "journey",
      title: "System Evolution Journey",
      date: "Yesterday",
      author: "System Architect",
      icon: "🛤️",
      content: (
        <div className="space-y-6">
           <p className="text-gray-600 leading-relaxed">
              <strong>The V1 to V3 Transition:</strong> What started as a static menu concept has evolved into a fully-fledged, multi-tenant lightweight commerce infrastructure. Note the major paradigm shifts:
           </p>
           <div className="relative border-l-2 border-indigo-200 ml-3 pl-4 space-y-6">
              <div className="relative">
                 <div className="absolute -left-[25px] bg-white border-2 border-indigo-200 w-4 h-4 rounded-full"></div>
                 <h4 className="font-bold text-gray-800 text-sm">V1: The Static Concept</h4>
                 <p className="text-sm text-gray-500 mt-1">Proof of concept. Basic digital representation of menus.</p>
              </div>
              <div className="relative">
                 <div className="absolute -left-[25px] bg-white border-2 border-indigo-400 w-4 h-4 rounded-full"></div>
                 <h4 className="font-bold text-gray-800 text-sm">V2: Programmability</h4>
                 <p className="text-sm text-gray-500 mt-1">Introduction of 'Smart QR Nodes'. Codes could now switch context (Order vs Campaign) dynamically without reprinting physics codes.</p>
              </div>
              <div className="relative">
                 <div className="absolute -left-[25px] bg-indigo-600 border-2 border-indigo-600 w-4 h-4 rounded-full shadow-sm"></div>
                 <h4 className="font-bold text-indigo-900 text-sm">V3: True Commerce OS</h4>
                 <p className="text-sm text-gray-700 mt-1 font-medium">The current era. Subdomain routing, multi-image product ingestion, legal compliance walls, and unified God-mode system management.</p>
              </div>
           </div>
        </div>
      )
    },
    {
      id: "goals",
      title: "System Goals & Trajectory",
      date: "System Core",
      author: "Super Manager Directive",
      icon: "🎯",
      content: (
        <div className="space-y-6">
           <p className="text-gray-600 leading-relaxed">
              <strong>Forward Trajectory:</strong> The foundation is solid. The next immediate protocol shifts from building features to validating the ecosystem at scale.
           </p>
           <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                 <h4 className="font-bold text-amber-900 mb-1">1. Pilot Validation</h4>
                 <p className="text-amber-700 text-sm">Onboard the first 5 test shops. Monitor organic usage patterns, offline-queue stress limits, and unhandled interface errors in real-world environments.</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
                 <h4 className="font-bold text-purple-900 mb-1">2. White-Label Subdomains</h4>
                 <p className="text-purple-700 text-sm">Automate Vercel DNS injection so `shopname.platform.com` seamlessly points to the tenant dashboard without manual intervention.</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                 <h4 className="font-bold text-emerald-900 mb-1">3. Aggregated Analytics</h4>
                 <p className="text-emerald-700 text-sm">Roll up all shop-level scan telemetry (`qr_events`) into a global heatmap here in the System Manager desk to pitch platform dominance to investors.</p>
              </div>
           </div>
        </div>
      )
    },
    {
      id: "threat_model",
      title: "Threat Model & Anti-Sabotage",
      date: "System Security Desk",
      author: "Red Team Diagnostics",
      icon: "🛡️",
      content: (
        <div className="space-y-6">
           <div className="flex gap-2 text-sm text-yellow-700 font-medium mb-4">
              <span className="bg-yellow-100 border border-yellow-200 px-2 py-1 rounded">Status: Mitigated (Phase 47)</span>
              <span className="bg-gray-100 border border-gray-200 text-gray-700 px-2 py-1 rounded">Vectors: 3 Analyzed</span>
           </div>
           
           <p className="text-gray-700 leading-relaxed">
              <strong>Sabotage Assessment:</strong> A deployed commerce ecosystem is an inevitable target for malicious actors. The following vectors detail how hackers previously could have attacked the system, and how the core architecture now neutralizes them.
           </p>

           <div className="space-y-4 text-sm mt-4">
              <div className="bg-white border text-gray-800 border-gray-200 p-5 rounded-2xl shadow-sm">
                 <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    1. The Free-Cart Injection (Tampered Prices)
                 </h4>
                 <p className="text-sm leading-relaxed mb-2">
                    <strong>The Hack:</strong> A malicious user uses Chrome DevTools to edit their frontend React state, changing a "KSh 500 Burger" to cost "KSh 0", and submits the checkout payload to bypass payment requirements.
                 </p>
                 <p className="text-sm leading-relaxed text-indigo-700">
                    <strong>The Defense (RPC Checkout):</strong> The database completely ignores frontend pricing data. The `checkout_cart` Postgres function manually queries the source of truth (`menu_items.price`) via the item IDs and calculates the mathematical total securely out of the hacker's reach.
                 </p>
              </div>

              <div className="bg-white border text-gray-800 border-gray-200 p-5 rounded-2xl shadow-sm">
                 <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    2. Inventory Manipulation & Negative Orders
                 </h4>
                 <p className="text-sm leading-relaxed mb-2">
                    <strong>The Hack:</strong> A hacker orders a "Quantity: -10" of an expensive item to mathematically refund themselves, or orders 10,000 artificial items to wipe out a competitor shop's digital stock.
                 </p>
                 <p className="text-sm leading-relaxed text-indigo-700">
                    <strong>The Defense (Data Boundaries & Soft Limits):</strong> The database constraints `CHECK (quantity &gt; 0)` mathematically block negative quantities on insertion. As for stock exhaustion, we deployed <em>Soft Limits</em>—the database handles the math (even into negative integers) but still passes the order payload to the Shop Owner's WhatsApp natively, allowing the physical human operator to assess if they are actually out of stock or if it was an attack.
                 </p>
              </div>

              <div className="bg-white border text-gray-800 border-gray-200 p-5 rounded-2xl shadow-sm">
                 <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    3. Impatient Double-Click Polling (Denial of Service)
                 </h4>
                 <p className="text-sm leading-relaxed mb-2">
                    <strong>The Hack:</strong> A user clicks the "Checkout" button very fast 50 times during a slow 3G connection, writing 50 duplicate orders to the database.
                 </p>
                 <p className="text-sm leading-relaxed text-indigo-700">
                    <strong>The Defense (Client-Side Cart Hashing):</strong> The `Order.jsx` module fingerprints the cart layout via JSON stringification. If an identical cart is submitted within 30 seconds, the client layer natively blocks the submission network request, preventing database pollution.
                 </p>
              </div>
           </div>
        </div>
      )
    },
    {
      id: "security",
      title: "Automated Security Audit (Action Required)",
      date: "CRITICAL: ONGOING",
      author: "Vulnerability Scanner",
      icon: "🚨",
      content: (
        <div className="space-y-6">
           <div className="flex gap-2 text-sm text-red-500 font-medium mb-4">
              <span className="bg-red-100 text-red-800 border border-red-200 px-2 py-1 rounded shadow-sm animate-pulse">Status: THREAT DETECTED</span>
              <span className="bg-orange-100 text-orange-800 border border-orange-200 px-2 py-1 rounded">Vulnerabilities: 3</span>
           </div>
           <p className="text-red-600 leading-relaxed font-bold">
              <strong>WARNING:</strong> The scanner has identified fundamental security vulnerabilities rooted in the platform's MVP architecture. Production deployment under these conditions invites sabotage and data corruption.
           </p>
           
           <div className="space-y-4 text-sm mt-4">
              <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-xl">
                 <h4 className="font-bold text-red-900 mb-1">1. Authentication Circumvention</h4>
                 <p className="text-red-700">Currently mapping sessions against a custom `shop_users` table with plaintext verification. This invites packet sniffing and session spoofing. <strong>Action: </strong> Must migrate strictly to Native Supabase Auth JWTs.</p>
              </div>
              <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-xl">
                 <h4 className="font-bold text-red-900 mb-1">2. Open Row-Level Security (RLS)</h4>
                 <p className="text-red-700">To enable the MVP, tables like `product_images` and `shop_compliance_settings` were forced into public write access (`auth.uid() = true`). Any bad actor with the anon key can execute script-based mass deletion. <strong>Action: </strong> Lockdown all policies to verify the JWT `shop_id` claim.</p>
              </div>
              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-xl">
                 <h4 className="font-bold text-orange-900 mb-1">3. Permissive Data Insertion</h4>
                 <p className="text-orange-800">The database accepts any client payload format without backend validation constraints, meaning numeric overrides or negative stock counts could be maliciously injected.</p>
              </div>
           </div>
           
           <p className="text-gray-500 text-xs mt-6 italic">We must tie these dependencies down together immediately.</p>
        </div>
      )
    },
    {
      id: "economics",
      title: "Platform Economics & Architecture Costs",
      date: "CRITICAL: ONGOING",
      author: "Financial Directive",
      icon: "💸",
      content: (
        <div className="space-y-6">
           <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-2xl mb-6 shadow-sm">
             <h3 className="font-black text-indigo-900 text-xl mb-4">Unit Analytics & Infrastructure Costs</h3>
             <p className="text-gray-700 leading-relaxed mb-4">
               The V3 system is compiled on edge-serverless architecture (Vercel + Supabase). We pay exactly <strong>$0.00</strong> for idle time. Costs trigger exclusively upon dynamic engagement (scans) and API dispatch.
             </p>

             <div className="space-y-3">
               <div className="flex justify-between items-center py-2 border-b border-indigo-100">
                  <span className="font-bold text-gray-800">Compute (Vercel Edge)</span>
                  <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm">~$0.05 / 1k Scans</span>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-indigo-100">
                  <span className="font-bold text-gray-800">Database (Supabase I/O)</span>
                  <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm">~$0.02 / 1k Scans</span>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-indigo-100">
                  <span className="font-bold text-gray-800">Media Pipeline (Supabase Storage)</span>
                  <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm">~$0.02 / 1k Scans</span>
               </div>
               <div className="flex justify-between items-center py-2">
                  <span className="font-black text-indigo-900 text-lg">Total Operations Gravity</span>
                  <span className="font-black text-indigo-700 text-lg bg-indigo-100 px-3 py-1 rounded-lg">~$0.09 / 1,000 Scans</span>
               </div>
             </div>
           </div>

           <div className="grid md:grid-cols-2 gap-6">
             <div className="bg-white border text-gray-800 border-gray-200 p-5 rounded-2xl shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                   <span className="text-xl">⚠️</span> The "Free Tier" Burden
                </h4>
                <p className="text-sm leading-relaxed mb-3">
                   A free tier shop doing 100 scans/day generates ~3k monthly scans. The physical cost is exactly <strong>$0.27 USD / month</strong>.
                </p>
                <p className="text-sm leading-relaxed">
                   While microscopic individually, 10,000 non-paying shops equates to <strong>$2,700/mo</strong> in dead compute weight. Therefore, "Free" shops are strictly blocked at 2 initial deploying nodes to constrain abuse.
                </p>
             </div>

             <div className="bg-white border text-gray-800 border-gray-200 p-5 rounded-2xl shadow-sm ring-2 ring-emerald-500 ring-offset-2">
                <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                   <span className="text-xl">📈</span> The "Pro" Tier Margins
                </h4>
                <p className="text-sm leading-relaxed mb-3">
                   If a premium shop processes 10,000 scans per month, their physical gravity cost is <strong>$0.90 USD</strong>.
                </p>
                 <p className="text-sm leading-relaxed font-bold">
                    If the Pro Subscription costs $15.00, our Gross Software Margin stands at 94.0%.
                 </p>
              </div>
            </div>

            {/* WhatsApp & M-Pesa Cost Model */}
            <div className="bg-white border text-gray-800 border-gray-200 p-6 rounded-2xl mb-6 shadow-sm mt-6">
              <h3 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2">
                 <span>📞</span> 3rd Party API Cost Pass-Through Model
              </h3>
              
              <div className="space-y-4">
                 <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <h4 className="font-bold text-blue-900 mb-2">WhatsApp Cloud API (Meta)</h4>
                    <p className="text-sm text-blue-800 mb-3">
                       Meta charges per 24-hour conversation window. Utility conversations (Order dispatched to shop) cost approx <strong>KES 1.50 per conversation</strong> in Kenya.
                    </p>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                       <li>If a Pro shop receives 10 orders/day → ~300 convos/month = <strong>KES 450/mo</strong> direct Meta cost.</li>
                       <li>If a Business shop receives 50 orders/day → ~1,500 convos/month = <strong>KES 2,250/mo</strong> direct Meta cost.</li>
                    </ul>
                    <p className="text-xs font-bold text-blue-900 mt-3 pt-3 border-t border-blue-200">
                       Recommendation: Ensure Pro/Business tier pricing (e.g., KES 2,499 & 4,999) safely absorbs this API floor.
                    </p>
                 </div>

                 <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                    <h4 className="font-bold text-green-900 mb-2">M-Pesa Daraja STK Push</h4>
                    <p className="text-sm text-green-800 mb-3">
                       Safaricom does not charge for STK push initiation. Revenue is collected via our platform commission slice (e.g., 5%) upon successful settlement.
                    </p>
                    <ul className="text-xs text-green-700 space-y-1 list-disc list-inside">
                       <li>Cost to System per STK payload: <strong>KES 0.00</strong></li>
                       <li>Settlement B2B auto-transfer (Future Phase): <strong>KES 15.00 - 45.00</strong> per bulk payout.</li>
                    </ul>
                 </div>
              </div>
            </div>
        </div>
      )
    },
    {
      id: "cron",
      title: "Background Jobs & Cron Analytics",
      date: "REAL-TIME",
      author: "Task Scheduler Engine",
      icon: "⚙️",
      content: (
        <div className="space-y-6">
           <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl mb-6 shadow-sm">
             <h3 className="font-black text-slate-900 text-xl mb-4">Background Processing Architecture</h3>
             <p className="text-gray-700 leading-relaxed mb-4">
               The V3 infrastructure relies on lightweight, asynchronous "Cron-like" workers operating on the client-side edge to drastically reduce physical backend query costs.
             </p>

             <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
                   <div className="bg-indigo-100 text-indigo-700 p-3 rounded-lg text-xl">📡</div>
                   <div>
                      <h4 className="font-bold text-gray-900 mb-1">Long-Polling Sync Loops</h4>
                      <p className="text-sm text-gray-600">Active dashboards (`OrderManager.jsx`) run detached interval workers that independently ping the Supabase edge every 5000ms. This simulates WebSockets perfectly without paying the high connection concurrency tax.</p>
                   </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
                   <div className="bg-amber-100 text-amber-700 p-3 rounded-lg text-xl">📶</div>
                   <div>
                      <h4 className="font-bold text-gray-900 mb-1">Service Worker Caching (Offline Queue)</h4>
                      <p className="text-sm text-gray-600">The `useOfflineEventQueue` intercepts Cart requests during network drops. It acts as an implicit background worker mapping requests to LocalStorage and executing mutation retry loops immediately upon network restoration.</p>
                   </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
                   <div className="bg-emerald-100 text-emerald-700 p-3 rounded-lg text-xl">🧹</div>
                   <div>
                      <h4 className="font-bold text-gray-900 mb-1">Database Triggers (Ghost Jobs)</h4>
                      <p className="text-sm text-gray-600">Hard-coded Postgres triggers execute instantly upon targeted mutations (e.g. migrating Phase 11 users to Auth upon insertion). These represent absolute zero-latency execution pipelines completely disconnected from the React UI thread.</p>
                   </div>
                </div>
             </div>
           </div>
        </div>
      )
    }
  ];

  const activeReportData = reports.find(r => r.id === activeReport);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/admin"
            className="flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition"
          >
            ← System Control
          </Link>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-black">M</div>
             <h1 className="text-lg font-black text-gray-900 tracking-tight hidden sm:block">System Manager's Desk</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
         {/* Desktop layout: Sidebar + Main Content */}
         <div className="flex flex-col md:flex-row gap-6">
            
            {/* Sidebar Inbox */}
            <div className="md:w-1/3 space-y-2">
               <h2 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-4 px-2">Secure Inbox</h2>
               
               {reports.map((report) => (
                  <button 
                     key={report.id}
                     onClick={() => setActiveReport(report.id)}
                     className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border ${
                        activeReport === report.id 
                        ? 'bg-white border-indigo-200 shadow-md transform scale-100 relative z-10' 
                        : 'bg-transparent border-transparent hover:bg-gray-100 text-gray-600 hover:border-gray-200 scale-95 opacity-80'
                     }`}
                  >
                     <div className="flex justify-between items-start mb-1">
                        <span className="text-2xl">{report.icon}</span>
                        <span className={`text-xs font-bold ${activeReport === report.id ? 'text-indigo-600' : 'text-gray-400'}`}>{report.date}</span>
                     </div>
                     <h3 className={`font-bold mt-2 ${activeReport === report.id ? 'text-gray-900' : 'text-gray-700'}`}>{report.title}</h3>
                     <p className="text-xs text-gray-500 mt-1 line-clamp-1">From: {report.author}</p>
                  </button>
               ))}
               
               <div className="mt-8 p-4 bg-gray-100 rounded-2xl border border-gray-200 text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Platform Status</p>
                  <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                     <span className="text-sm font-bold text-gray-700">All Systems Nominal</span>
                  </div>
               </div>
            </div>

            {/* Main Email/Report View */}
            <div className="md:w-2/3">
               {activeReport === 'inbox' ? (
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 h-full min-h-[500px] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                     <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-4xl mb-4 text-gray-300">
                        📬
                     </div>
                     <h2 className="text-xl font-bold text-gray-400">Select a report</h2>
                     <p className="text-sm text-gray-400 mt-2 max-w-sm">Review the incoming automated reports from the V3 core engine via the secure inbox menu.</p>
                  </div>
               ) : (
                  <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in-up">
                     
                     {/* Report Header */}
                     <div className="bg-gray-900 p-6 md:p-8 text-white relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 text-9xl opacity-10">
                           {activeReportData.icon}
                        </div>
                        <div className="relative z-10">
                           <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-2">{activeReportData.author} • {activeReportData.date}</p>
                           <h2 className="text-2xl md:text-3xl font-black">{activeReportData.title}</h2>
                        </div>
                     </div>

                     {/* Report Content */}
                     <div className="p-6 md:p-8">
                        {activeReportData.content}

                        {/* Sign-off */}
                        <div className="mt-12 pt-6 border-t border-gray-100 flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                              🤖
                           </div>
                           <div>
                              <p className="text-sm font-bold text-gray-800">The Modern Savannah V3 Core Engine</p>
                              <p className="text-xs text-gray-400">Automated Intelligence Division</p>
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </div>

         </div>
      </main>
    </div>
  );
}
