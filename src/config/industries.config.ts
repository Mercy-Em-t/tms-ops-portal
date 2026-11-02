// src/config/industries.config.ts
/**
 * TMS WHITELABEL PLATFORM - INDUSTRY TAXONOMY REGISTRY
 * 
 * Central registry of all supported business domains.
 * Defines default domain nomenclature (terms) and default trust value propositions.
 * 
 * How to add a new industry:
 * 1. Add an entry to INDUSTRY_REGISTRY below.
 * 2. It becomes instantly available to all existing and future tenant stores.
 */

import type { ValuePropItem } from "./whitelabel.types";

export interface IndustryNomenclature {
  menu: string;
  table: string;
  order: string;
  kitchen: string;
  chef: string;
  eating: string;
  cart?: string;
  emptyCart?: string;
  emptyCartSubtext?: string;
  craftsman?: string;
  collectionMethod?: string;
  collectionSubtext?: string;
  deliveryMethod?: string;
  deliverySubtext?: string;
}

export interface IndustryDefinition {
  slug: string;
  name: string;
  description: string;
  nomenclature: IndustryNomenclature;
  defaultProps: ValuePropItem[];
}

export const INDUSTRY_REGISTRY: Record<string, IndustryDefinition> = {
  // 1. Universal Retail Default
  retail: {
    slug: "retail",
    name: "General Retail & E-Commerce",
    description: "Standard physical merchandise, electronics, hardware, books, and consumer goods.",
    nomenclature: {
      menu: "Products",
      table: "Collection Point",
      order: "Order",
      kitchen: "Fulfillment Depot",
      chef: "Fulfillment Lead",
      eating: "shopping",
      cart: "Cart",
      emptyCart: "Your cart is empty",
      emptyCartSubtext: "Add items from the catalogue to get started",
      craftsman: "Fulfillment Lead",
      collectionMethod: "Store Pickup",
      collectionSubtext: "with your order confirmation",
      deliveryMethod: "Doorstep Delivery",
      deliverySubtext: "Reliable delivery to your door, tracked end-to-end."
    },
    defaultProps: [
      { id: "1", emoji: "🛡️", title: "Quality Guaranteed", text: "Every product is quality-checked before it reaches you." },
      { id: "2", emoji: "🚚", title: "Fast Delivery", text: "Reliable delivery to your door, tracked end-to-end." },
      { id: "3", emoji: "🔒", title: "Secure Checkout", text: "Encrypted M-Pesa & WhatsApp ordering. Always safe." }
    ]
  },

  // 2. Textiles & Haberdashery
  textile: {
    slug: "textile",
    name: "African Textiles & Haberdashery",
    description: "African wax prints, Kitenge, Maasai Shúkàs, Kikoy, tailoring shears, buttons, and notions.",
    nomenclature: {
      menu: "Fabrics & Notions",
      table: "Showroom Counter",
      order: "Order",
      kitchen: "Cutting Room",
      chef: "Master Tailor",
      eating: "styling"
    },
    defaultProps: [
      { id: "1", emoji: "🧵", title: "Authentic African Textiles", text: "100% genuine Dutch Wax Hollandais, Maasai Shúkàs & Lamu Kikoys." },
      { id: "2", emoji: "✂️", title: "Tailor-Grade Notions", text: "Heavyweight brass shears, bone buttons & industrial thread." },
      { id: "3", emoji: "⚡", title: "Same-Day Boda Courier", text: "Swift delivery across Nairobi CBD, Westlands & nationwide courier." }
    ]
  },

  // 3. Crafts & DIY Artisans
  crafts: {
    slug: "crafts",
    name: "Crafts, Yarns & Handcrafted Goods",
    description: "Crochet kits, knitting yarns, artisan patterns, pottery, and DIY maker supplies.",
    nomenclature: {
      menu: "Craft Kits & Patterns",
      table: "Studio Bench",
      order: "Order",
      kitchen: "Workshop",
      chef: "Artisan Maker",
      eating: "crafting"
    },
    defaultProps: [
      { id: "1", emoji: "🧶", title: "Handcrafted Quality", text: "Curated artisan materials and premium natural fibers." },
      { id: "2", emoji: "🎨", title: "Custom Patterns Included", text: "Free stitch-by-stitch PDF guides with every complete kit." },
      { id: "3", emoji: "⚡", title: "Swift Dispatch", text: "Same-day courier dispatch across Nairobi and beyond." }
    ]
  },

  // 4. Food & Gastronomy
  food: {
    slug: "food",
    name: "Food, Hospitality & Dining",
    description: "Restaurants, cafes, cloud kitchens, bakeries, and daily rotating specialties.",
    nomenclature: {
      menu: "Menu",
      table: "Table",
      order: "Order",
      kitchen: "Kitchen",
      chef: "Chef",
      eating: "dining",
      cart: "Bag",
      emptyCart: "Your bag is empty",
      emptyCartSubtext: "Add something delicious from the menu",
      craftsman: "Prepared by",
      collectionMethod: "Store Pickup",
      collectionSubtext: "",
      deliveryMethod: "Delivery",
      deliverySubtext: "Choose delivery at checkout where available."
    },
    defaultProps: [
      { id: "1", emoji: "🍳", title: "Freshly Prepared", text: "Every order is made fresh. No reheated shortcuts — ever." },
      { id: "2", emoji: "🥬", title: "Hygiene Certified", text: "Our kitchen meets strict food safety standards." },
      { id: "3", emoji: "⚡", title: "Quick Turnaround", text: "Hot food delivered or ready for pickup fast." }
    ]
  },

  // 5. Fresh Grocery & Produce
  grocery: {
    slug: "grocery",
    name: "Grocery & Fresh Produce",
    description: "Farm-fresh fruits, vegetables, dairy, grains, and pantry essentials.",
    nomenclature: {
      menu: "Pantry & Produce",
      table: "Depot Basket",
      order: "Order",
      kitchen: "Packing Bay",
      chef: "Farm Sorter",
      eating: "cooking"
    },
    defaultProps: [
      { id: "1", emoji: "🌱", title: "Farm Fresh", text: "Sourced daily from trusted local farmers and suppliers." },
      { id: "2", emoji: "🧼", title: "Sanitized Handling", text: "All produce is cleaned and handled with food-grade care." },
      { id: "3", emoji: "🚚", title: "Reliable Delivery", text: "Fresh to your door — on time, every time." }
    ]
  },

  // 6. Consumer Electronics & Gadgets
  electronics: {
    slug: "electronics",
    name: "Electronics & Tech Accessories",
    description: "Smartphones, laptops, accessories, cables, smart home, and audio equipment.",
    nomenclature: {
      menu: "Catalog",
      table: "Tech Desk",
      order: "Order",
      kitchen: "Tech Hub",
      chef: "Hardware Tech",
      eating: "using"
    },
    defaultProps: [
      { id: "1", emoji: "✅", title: "Genuine Products", text: "Every device is authentic and covered by manufacturer warranty." },
      { id: "2", emoji: "🔧", title: "After-Sale Support", text: "We're here for device setup, diagnostics, and troubleshooting." },
      { id: "3", emoji: "🔒", title: "Secure Transactions", text: "Encrypted payment verification on every hardware purchase." }
    ]
  },

  // 7. Beauty & Cosmetics
  beauty: {
    slug: "beauty",
    name: "Beauty, Hair & Skincare",
    description: "Cosmetics, haircare, essential oils, organic skincare, and beauty tools.",
    nomenclature: {
      menu: "Beauty Collection",
      table: "Consultation Chair",
      order: "Order",
      kitchen: "Beauty Bar",
      chef: "Aesthetician",
      eating: "pampering"
    },
    defaultProps: [
      { id: "1", emoji: "💆", title: "Expert-Curated", text: "Products curated by professional beauty therapists." },
      { id: "2", emoji: "🌿", title: "Skin-Safe Formulas", text: "Dermatologist-tested and cruelty-free ingredients." },
      { id: "3", emoji: "💝", title: "Loyalty Perks", text: "Earn rewards on every purchase towards free beauty treats." }
    ]
  },

  // 8. Health & Pharmacy
  pharmacy: {
    slug: "pharmacy",
    name: "Health, Wellness & Pharmacy",
    description: "Vitamins, OTC wellness, first aid, supplements, and certified health essentials.",
    nomenclature: {
      menu: "Health Catalog",
      table: "Pharmacy Counter",
      order: "Prescription / Order",
      kitchen: "Dispensary",
      chef: "Pharmacist",
      eating: "healing"
    },
    defaultProps: [
      { id: "1", emoji: "🏥", title: "Certified Products", text: "All health items are certified and regulated." },
      { id: "2", emoji: "🔬", title: "Lab Verified", text: "Third-party tested for safety, purity, and potency." },
      { id: "3", emoji: "🔒", title: "Discreet Delivery", text: "Private, sealed packaging for total peace of mind." }
    ]
  },

  // 9. Services & Appointments
  service: {
    slug: "service",
    name: "Professional Services & Bookings",
    description: "Salons, consulting, maintenance, equipment rental, and custom work.",
    nomenclature: {
      menu: "Services",
      table: "Station",
      order: "Appointment",
      kitchen: "Staff Room",
      chef: "Specialist",
      eating: "visiting"
    },
    defaultProps: [
      { id: "1", emoji: "⭐", title: "Vetted Specialists", text: "Experienced, certified professionals ready to serve you." },
      { id: "2", emoji: "⏱️", title: "Guaranteed Punctuality", text: "Prompt service delivery adhering strictly to your booking." },
      { id: "3", emoji: "🛡️", title: "Satisfaction Assured", text: "100% satisfaction guarantee or we re-service for free." }
    ]
  }
};

/**
 * Resolves an industry definition with fuzzy sector matching and safe universal fallback.
 */
export function getIndustryDefinition(rawType = ""): IndustryDefinition {
  const norm = rawType.toLowerCase().trim();
  if (!norm) return INDUSTRY_REGISTRY.retail;

  // Direct key lookup
  if (INDUSTRY_REGISTRY[norm]) {
    return INDUSTRY_REGISTRY[norm];
  }

  // Sector aliases
  if (norm.includes("textile") || norm.includes("haberdashery") || norm.includes("fabric") || norm.includes("apparel") || norm.includes("clothing") || norm.includes("boutique") || norm.includes("fashion")) {
    return INDUSTRY_REGISTRY.textile;
  }
  if (norm.includes("craft") || norm.includes("crochet") || norm.includes("knit") || norm.includes("diy") || norm.includes("artisan") || norm.includes("yarn")) {
    return INDUSTRY_REGISTRY.crafts;
  }
  if (norm.includes("food") || norm.includes("restaurant") || norm.includes("cafe") || norm.includes("bakery") || norm.includes("dining") || norm.includes("kitchen")) {
    return INDUSTRY_REGISTRY.food;
  }
  if (norm.includes("produce") || norm.includes("grocery") || norm.includes("supermarket") || norm.includes("farm")) {
    return INDUSTRY_REGISTRY.grocery;
  }
  if (norm.includes("tech") || norm.includes("electron") || norm.includes("hardware") || norm.includes("gadget")) {
    return INDUSTRY_REGISTRY.electronics;
  }
  if (norm.includes("beauty") || norm.includes("cosmetic") || norm.includes("salon") || norm.includes("hair") || norm.includes("skin")) {
    return INDUSTRY_REGISTRY.beauty;
  }
  if (norm.includes("health") || norm.includes("pharmacy") || norm.includes("wellness") || norm.includes("med")) {
    return INDUSTRY_REGISTRY.pharmacy;
  }
  if (norm.includes("service") || norm.includes("consult") || norm.includes("repair")) {
    return INDUSTRY_REGISTRY.service;
  }

  // Safe Universal Fallback
  return INDUSTRY_REGISTRY.retail;
}
