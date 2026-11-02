import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../services/auth-service";

const TIERS = [
  {
    name: "Free",
    price: "KSh 0 / mo",
    color: "bg-gray-100",
    headerColor: "bg-gray-800 text-white",
    features: [
      { label: "Products in menu", value: "Up to 20" },
      { label: "QR Codes", value: "1 node" },
      { label: "Order tracking page", value: "✅" },
      { label: "WhatsApp click-to-chat ordering", value: "✅" },
      { label: "Discount coupons", value: "❌" },
      { label: "Structured WhatsApp receipts", value: "❌" },
      { label: "Multiple QR nodes", value: "❌" },
      { label: "M-Pesa STK Push", value: "❌" },
      { label: "Campaigns & Banners", value: "❌" },
      { label: "Product bundles & Auto-cart links", value: "❌" },
      { label: "Smart Order Revisions", value: "❌" },
      { label: "WhatsApp Auto-Dashboard", value: "❌" },
      { label: "Dynamic QR (time-based routing)", value: "❌" },
      { label: "Analytics", value: "Basic" },
      { label: "Platform commission", value: "5%" },
    ]
  },
  {
    name: "Basic",
    price: "KSh 999 / mo",
    color: "bg-green-50",
    headerColor: "bg-green-700 text-white",
    badge: "Most Popular",
    features: [
      { label: "Products in menu", value: "Unlimited" },
      { label: "QR Codes", value: "Up to 5" },
      { label: "Order tracking page", value: "✅" },
      { label: "WhatsApp click-to-chat ordering", value: "✅" },
      { label: "Discount coupons", value: "✅" },
      { label: "Structured WhatsApp receipts", value: "✅" },
      { label: "Multiple QR nodes", value: "✅" },
      { label: "M-Pesa STK Push", value: "✅ (if configured)" },
      { label: "Campaigns & Banners", value: "✅" },
      { label: "Product bundles & Auto-cart links", value: "✅" },
      { label: "Smart Order Revisions", value: "❌" },
      { label: "WhatsApp Auto-Dashboard", value: "❌" },
      { label: "Dynamic QR (time-based routing)", value: "❌" },
      { label: "Analytics", value: "Standard" },
      { label: "Platform commission", value: "5%" },
    ]
  },
  {
    name: "Pro",
    price: "KSh 2,499 / mo",
    color: "bg-blue-50",
    headerColor: "bg-blue-700 text-white",
    features: [
      { label: "Products in menu", value: "Unlimited" },
      { label: "QR Codes", value: "Up to 25" },
      { label: "Order tracking page", value: "✅" },
      { label: "WhatsApp click-to-chat ordering", value: "✅" },
      { label: "Discount coupons", value: "✅" },
      { label: "Structured WhatsApp receipts", value: "✅" },
      { label: "Multiple QR nodes", value: "✅" },
      { label: "M-Pesa STK Push", value: "✅" },
      { label: "Campaigns & Banners", value: "✅" },
      { label: "Product bundles & Auto-cart links", value: "✅" },
      { label: "Smart Order Revisions", value: "✅" },
      { label: "WhatsApp Auto-Dashboard", value: "✅ (Meta API)" },
      { label: "Dynamic QR (time-based routing)", value: "✅" },
      { label: "Analytics", value: "Advanced" },
      { label: "Platform commission", value: "4%" },
    ]
  },
  {
    name: "Business",
    price: "KSh 4,999 / mo",
    color: "bg-purple-50",
    headerColor: "bg-purple-800 text-white",
    features: [
      { label: "Products in menu", value: "Unlimited" },
      { label: "QR Codes", value: "Unlimited" },
      { label: "Order tracking page", value: "✅" },
      { label: "WhatsApp click-to-chat ordering", value: "✅" },
      { label: "Discount coupons", value: "✅" },
      { label: "Structured WhatsApp receipts", value: "✅" },
      { label: "Multiple QR nodes", value: "✅" },
      { label: "M-Pesa STK Push", value: "✅" },
      { label: "Campaigns & Banners", value: "✅" },
      { label: "Product bundles & Auto-cart links", value: "✅" },
      { label: "Smart Order Revisions", value: "✅" },
      { label: "WhatsApp Auto-Dashboard", value: "✅ (Meta API)" },
      { label: "Dynamic QR (time-based routing)", value: "✅" },
      { label: "Analytics", value: "Premium + Export" },
      { label: "Platform commission", value: "3%" },
    ]
  }
];

const FEATURE_GUIDES = [
  {
    id: "menu",
    icon: "📋",
    title: "Setting Up Your Menu",
    steps: [
      "After logging in, click 'Product Manager' from your dashboard.",
      "Click 'Add Item'. Fill in the name, price, category, and optionally upload a product photo.",
      "Group items into categories (e.g. 'Food', 'Drinks', 'Specials') using the Category field.",
      "Toggle items as 'Available' or 'Out of Stock' any time — changes are instant.",
      "Use the 'Import CSV' button to bulk-upload an entire product list from a spreadsheet."
    ]
  },
  {
    id: "campaign",
    icon: "🎯",
    title: "Running a Campaign",
    steps: [
      "Go to Dashboard → Campaigns → New Campaign.",
      "Give the campaign a name (e.g. 'Happy Hour'), choose type: Discount or Bundle.",
      "For discount: set a percentage off. For bundle: pick 2–5 items and set a combined price.",
      "After saving, copy the Auto-Cart Link and share on WhatsApp, Instagram, or Facebook.",
      "Link the campaign to a QR code so it shows a full-screen banner when customers scan."
    ]
  },
  {
    id: "qr",
    icon: "📱",
    title: "Generating QR Codes",
    steps: [
      "Go to Dashboard → QR Manager → Deploy QR.",
      "Give the QR a label (e.g. 'Table 3', 'Window Display', 'Instagram Ad').",
      "Choose the action: Open Menu, Open Campaign, or Open Specific Products.",
      "For Pro/Business: set opening and closing times for time-based routing.",
      "Download and print the branded QR code. Place it on tables, walls, or share online."
    ]
  },
  {
    id: "mpesa",
    icon: "💳",
    title: "Accepting M-Pesa Payments",
    steps: [
      "Go to Settings and scroll to the M-Pesa Configuration section.",
      "Enter your Paybill Shortcode and Passkey (provided by your ShopQR account manager).",
      "Save settings. The 'Pay with M-Pesa' button will now appear during customer checkout.",
      "When a customer pays, you receive an instant Paid notification in the Order Manager.",
      "Payouts to your M-Pesa are processed weekly by ShopQR after deducting the platform commission."
    ]
  },
  {
    id: "whatsapp-dashboard",
    icon: "💬",
    title: "Using the WhatsApp Order Dashboard (Pro/Business)",
    steps: [
      "Ensure your WhatsApp number is correct in Settings.",
      "When a customer places an order, you receive it directly in your WhatsApp — no app needed.",
      "The message contains the order items, total, and two buttons: ✅ Accept or ❌ Reject.",
      "Tapping Accept confirms the order and triggers the customer's M-Pesa payment prompt.",
      "Tapping Reject notifies the customer to edit their cart and resubmit."
    ]
  }
];

function AccordionItem({ icon, title, steps }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-4 flex items-center gap-3 bg-white hover:bg-gray-50 transition"
      >
        <span className="text-xl">{icon}</span>
        <span className="font-semibold text-gray-800 flex-1">{title}</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="bg-gray-50 border-t border-gray-100 p-4">
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700">
                <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">{i+1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function AdminUserGuide() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [activeTab, setActiveTab] = useState("tiers");

  useEffect(() => {
    if (!user || user.system_role !== "system_admin") navigate("/login");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/admin" className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">👤 User Guide & Tier Overview</h1>
            <p className="text-xs text-gray-400 mt-0.5">For shop owners — what each plan includes and how to use every feature</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-8 gap-1 w-fit">
          {[{ id: "tiers", label: "📊 Plan Comparison" }, { id: "guides", label: "📖 Feature Guides" }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === tab.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "tiers" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-gray-900 mb-1">Plan Comparison</h2>
              <p className="text-gray-500 text-sm">Review what each tier offers. Prices are in Kenyan Shillings (KES) and are subject to review as the platform matures.</p>
            </div>

            {/* Pricing Review Note */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <div>
                <p className="font-bold text-yellow-800 text-sm">Pricing Review Recommended</p>
                <p className="text-yellow-700 text-sm mt-0.5">The WhatsApp Cloud API charges approximately KES 1–3 per conversation per 24-hour window. For Pro/Business tiers using the WhatsApp Auto-Dashboard feature, pricing should factor this in. See the Financial Report → Cost Structure tab for the full model.</p>
              </div>
            </div>

            {/* Tier Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {TIERS.map(tier => (
                <div key={tier.name} className={`rounded-xl border border-gray-100 overflow-hidden shadow-sm relative`}>
                  {tier.badge && (
                    <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      {tier.badge}
                    </div>
                  )}
                  <div className={`${tier.headerColor} p-5`}>
                    <h3 className="font-black text-xl">{tier.name}</h3>
                    <p className="text-sm opacity-80 mt-1 font-medium">{tier.price}</p>
                  </div>
                  <div className={`${tier.color} p-4`}>
                    <ul className="space-y-2">
                      {tier.features.map((f, i) => (
                        <li key={i} className="flex justify-between items-start gap-2 text-xs border-b border-black/5 pb-2 last:border-0 last:pb-0">
                          <span className="text-gray-600 leading-relaxed">{f.label}</span>
                          <span className={`font-bold text-right shrink-0 ${f.value === '❌' ? 'text-gray-300' : f.value === '✅' ? 'text-green-600' : 'text-gray-800'}`}>{f.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "guides" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-gray-900 mb-1">Step-by-Step Feature Guides</h2>
              <p className="text-gray-500 text-sm">Click any guide to expand it. Share these with shop owners to help them get started quickly.</p>
            </div>
            <div className="space-y-3">
              {FEATURE_GUIDES.map(guide => (
                <AccordionItem key={guide.id} {...guide} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
