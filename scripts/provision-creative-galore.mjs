import fs from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const env = {};
  if (fs.existsSync(".env")) {
    const lines = fs.readFileSync(".env", "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function provisionCreativeGalore() {
  console.log("🚀 Provisioning Creative Galore into Supabase...");

  const slug = "creative-galore";
  const name = "Creative Galore";
  const primaryColor = "#7C3AED";
  const accentColor = "#F472B6";

  // 1. Check or Insert Shop
  const { data: existingShop } = await supabase
    .from("shops")
    .select("shop_id, id, name, slug")
    .or(`slug.eq.${slug},subdomain.eq.${slug}`)
    .maybeSingle();

  let shopId = existingShop?.shop_id || existingShop?.id;

  if (shopId) {
    console.log(`✓ Existing shop found: ${name} (ID: ${shopId})`);
    await supabase.from("shops").update({
      name,
      slug,
      subdomain: slug,
      phone: "0710720949",
      whatsapp_number: "254710720949",
      plan: "business",
      is_online: true,
      appearance_config: {
        primary_color: primaryColor,
        accent_color: accentColor,
        brand_name: name,
        tagline: "Handcrafted Crochet Kits, Notions, Custom Patterns & Yarn Tasting",
        phone: "0710720949",
        whatsapp: "254710720949",
        dark_mode: true
      },
      fulfillment_settings: { pickup: true, delivery: true, dine_in: false }
    }).eq("shop_id", shopId);
  } else {
    shopId = crypto.randomUUID();
    const { error: insErr } = await supabase.from("shops").insert({
      shop_id: shopId,
      name,
      slug,
      subdomain: slug,
      phone: "0710720949",
      whatsapp_number: "254710720949",
      plan: "business",
      is_online: true,
      enabled_modules: ['orders', 'products', 'qr', 'accounting', 'settings', 'appearance'],
      appearance_config: {
        primary_color: primaryColor,
        accent_color: accentColor,
        brand_name: name,
        tagline: "Handcrafted Crochet Kits, Notions, Custom Patterns & Yarn Tasting",
        phone: "0710720949",
        whatsapp: "254710720949",
        dark_mode: true
      },
      fulfillment_settings: { pickup: true, delivery: true, dine_in: false }
    });
    if (insErr) {
      console.error("Failed to insert shop:", insErr);
      process.exit(1);
    }
    console.log(`✓ Created shop ${name} with ID: ${shopId}`);
  }

  // 2. Categories
  const categories = [
    { name: "DIY Craft Kits", slug: "diy-craft-kits" },
    { name: "Hooks & Tools", slug: "hooks-tools" },
    { name: "Yarns & Fibers", slug: "yarns-fibers" },
    { name: "Notions & Accessories", slug: "notions-accessories" },
    { name: "Custom Patterns", slug: "custom-patterns" },
    { name: "Ready-Made Products", slug: "ready-made-products" },
    { name: "Yarn Tasting & Experience", slug: "yarn-tasting-experience" }
  ];

  for (const cat of categories) {
    await supabase.from("categories").upsert({
      shop_id: shopId,
      name: cat.name,
      slug: cat.slug
    }, { onConflict: "shop_id,slug" });
  }
  console.log(`✓ Upserted ${categories.length} categories.`);

  // 3. Clear and Seed Items
  await supabase.from("menu_items").delete().eq("shop_id", shopId);

  const craftItems = [
    {
      shop_id: shopId,
      name: "The Ultimate Crochet Beginner Kit",
      description: "Complete beginner kit with 3 milk cotton yarn skeins, 2 ergonomic hooks (3.5mm & 4.0mm), 10 stitch markers, darning needle, tape measure, and step-by-step video guide.",
      price: 2400.00,
      category: "DIY Craft Kits",
      stock: 25,
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1606902965551-dce093cda6e7?w=800&auto=format&fit=crop&q=80"
    },
    {
      shop_id: shopId,
      name: "Ergonomic Soft-Grip Crochet Hooks Set (9 Sizes: 2.0mm - 6.0mm)",
      description: "Comfortable color-coded rubber handle aluminum crochet hooks designed to prevent hand fatigue during long crafting sessions.",
      price: 1250.00,
      category: "Hooks & Tools",
      stock: 50,
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800&auto=format&fit=crop&q=80"
    },
    {
      shop_id: shopId,
      name: "Premium 5-Ply Milk Cotton Yarn Skein (100g)",
      description: "Ultra-soft, skin-friendly, anti-pilling milk cotton yarn ideal for wearables, baby blankets, and amigurumi plushies. Available in curated pastel shades.",
      price: 380.00,
      category: "Yarns & Fibers",
      stock: 120,
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800&auto=format&fit=crop&q=80"
    },
    {
      shop_id: shopId,
      name: "Locking Stitch Markers & Large-Eye Darning Needles Tin (35 pcs)",
      description: "Portable metallic tin packed with 30 colorful locking stitch markers and 5 rust-proof blunt yarn darning needles for weaving ends.",
      price: 450.00,
      category: "Notions & Accessories",
      stock: 80,
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1606902965551-dce093cda6e7?w=800&auto=format&fit=crop&q=80"
    },
    {
      shop_id: shopId,
      name: "Handmade Wooden Yarn Bowl with Spiral Cutout",
      description: "Hand-carved solid hardwood bowl designed to hold your yarn ball securely and feed yarn evenly without rolling across the floor.",
      price: 1850.00,
      category: "Notions & Accessories",
      stock: 15,
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80"
    },
    {
      shop_id: shopId,
      name: "Bespoke Granny Square Tote Bag (PDF Pattern & Video)",
      description: "Full downloadable crochet pattern with detailed stitch diagrams, color theory palette ideas, and size adjustment notes.",
      price: 350.00,
      category: "Custom Patterns",
      stock: 999,
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1606902965551-dce093cda6e7?w=800&auto=format&fit=crop&q=80"
    },
    {
      shop_id: shopId,
      name: "Ready-Made Vintage Daisy Granny Square Shoulder Bag",
      description: "Artisan handmade lined cotton crochet shoulder bag with sturdy reinforced straps. Handcrafted with love in Nairobi.",
      price: 3200.00,
      category: "Ready-Made Products",
      stock: 8,
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800&auto=format&fit=crop&q=80"
    },
    {
      shop_id: shopId,
      name: "The Creative Galore 'Yarn Tasting' Experience Palette Card",
      description: "A sensory sampler card featuring 6 curated mini yarn swatches (Milk Cotton, Organic Bamboo, Merino Wool, Velvet Chenille, Linen-Cotton, and Brushed Alpaca) with fiber gauge specs and hook pairings so you can touch, test, and feel before purchasing full skeins.",
      price: 650.00,
      category: "Yarn Tasting & Experience",
      stock: 40,
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1606902965551-dce093cda6e7?w=800&auto=format&fit=crop&q=80"
    }
  ];

  const { error: itemErr } = await supabase.from("menu_items").insert(craftItems);
  if (itemErr) {
    console.error("Error inserting items:", itemErr);
  } else {
    console.log(`✓ Successfully seeded all ${craftItems.length} Creative Galore products & Yarn Tasting Card!`);
  }

  console.log("\n🎉 Provisioning complete! Refresh your browser at http://localhost:5173/");
}

provisionCreativeGalore();
