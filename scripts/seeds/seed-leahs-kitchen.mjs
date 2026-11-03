import fs from "fs";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPaths = [".env.local", ".env"];
  const env = {};
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!(key in env)) env[key] = val;
        }
      }
    }
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seedLeahsKitchen() {
  console.log("🚀 Provisioning Leah's Kitchen (Pre-order Cloud Kitchen)...");

  const name = "Leah's Kitchen";
  const slug = "leahs-kitchen";
  const email = "leah@kitchen.com";
  const password = "LeahKitchen2026!";
  const phone = "254712345678";
  const color = "#E11D48"; // Warm culinary rose

  const fulfillmentSettings = {
    accepts_dine_in: false,
    accepts_pickup: false,
    accepts_leave_with_items: false,
    accepts_delivery: false,
    accepts_pickup_point: true,
    pickup_points: ["Gate A", "Gate B"],
    pickup_point_label: "Collection Gate",
    is_preorder: true,
    cutoff_time: "17:00",
    preorder_notice: "Pre-orders cutoff daily at 5:00 PM for next-day delivery to Gate A & Gate B."
  };

  // 1. Shop Record
  let shopId = null;
  const { data: existingShop } = await supabase
    .from("shops")
    .select("shop_id, id")
    .or(`slug.eq.${slug},subdomain.eq.${slug}`)
    .maybeSingle();

  if (existingShop) {
    shopId = existingShop.shop_id || existingShop.id;
    await supabase.from("shops").update({
      name,
      plan: 'business',
      is_online: true,
      phone,
      whatsapp_number: phone,
      tagline: "Homestyle Pre-Order Kitchen • Next-Day Dispatch to Gate A & B",
      description: "Authentic, slow-cooked homestyle meals prepared with love. Pre-order before 5:00 PM for next-day collection.",
      enabled_modules: ['orders', 'products', 'qr', 'accounting', 'settings', 'appearance'],
      appearance_config: { primary_color: color, brand_name: name },
      fulfillment_settings: fulfillmentSettings
    }).eq("shop_id", shopId);
    console.log(`✓ Updated existing shop: ${shopId}`);
  } else {
    shopId = crypto.randomUUID();
    const { error: insErr } = await supabase.from("shops").insert({
      shop_id: shopId,
      name,
      slug,
      subdomain: slug,
      plan: 'business',
      is_online: true,
      phone,
      whatsapp_number: phone,
      tagline: "Homestyle Pre-Order Kitchen • Next-Day Dispatch to Gate A & B",
      description: "Authentic, slow-cooked homestyle meals prepared with love. Pre-order before 5:00 PM for next-day collection.",
      enabled_modules: ['orders', 'products', 'qr', 'accounting', 'settings', 'appearance'],
      appearance_config: { primary_color: color, brand_name: name },
      fulfillment_settings: fulfillmentSettings
    });
    if (insErr) throw insErr;
    console.log(`✓ Created shop: ${shopId}`);
  }

  // 2. Auth User & Membership
  let userId = null;
  const { data: userList } = await supabase.auth.admin.listUsers();
  const existingUser = userList?.users?.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (existingUser) {
    userId = existingUser.id;
    await supabase.auth.admin.updateUserById(userId, { password });
    console.log(`✓ Existing user updated: ${email}`);
  } else {
    const { data: newUser, error: uErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { shop_name: name, shop_slug: slug }
    });
    if (uErr) throw uErr;
    userId = newUser.user.id;
    console.log(`✓ Created user: ${email}`);
  }

  await supabase.from("profiles").upsert({
    id: userId,
    display_name: "Chef Leah",
    system_role: "user"
  });

  await supabase.from("shop_members").upsert({
    user_id: userId,
    shop_id: shopId,
    role: "owner",
    is_active: true
  }, { onConflict: "user_id,shop_id" });

  console.log(`✓ Linked membership to shop.`);

  // 3. Clear existing items and seed rotating daily menu
  await supabase.from("menu_items").delete().eq("shop_id", shopId);
  await supabase.from("categories").delete().eq("shop_id", shopId);

  // Categories (Real Culinary Taxonomies)
  const categoriesToSeed = [
    { shop_id: shopId, name: "Daily Specials", slug: "daily-specials" },
    { shop_id: shopId, name: "Snacks & Pastries", slug: "snacks-pastries" },
    { shop_id: shopId, name: "House Beverages", slug: "house-beverages" },
    { shop_id: shopId, name: "Sides & Extras", slug: "sides-extras" }
  ];
  await supabase.from("categories").insert(categoriesToSeed);
  console.log(`✓ Seeded culinary categories.`);

  // Menu items with culinary categories, multi-day tags, and daily stock caps
  const dishes = [
    // --- DAILY SPECIALS (MAINS) ---
    {
      shop_id: shopId,
      name: "Swahili Beef Pilau with Kachumbari",
      description: "Fragrant spiced basmati rice slow-cooked with tender beef chunks, served with fresh tomato-onion kachumbari and banana.",
      price: 650,
      category: "Daily Specials",
      tags: ["thursday"],
      diet_tags: ["thursday"],
      is_active: true,
      stock: 35, // Daily cap: 35 portions
      sku: "LK-PLU-01",
      image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80"
    },
    {
      shop_id: shopId,
      name: "Slow-Braised Chicken Chapati Roll",
      description: "Two flaky layered chapatis wrapped around succulent coconut-curry shredded chicken and crisp slaw.",
      price: 500,
      category: "Daily Specials",
      tags: ["thursday"],
      diet_tags: ["thursday"],
      is_active: true,
      stock: 40,
      sku: "LK-CHK-02",
      image_url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80"
    },
    {
      shop_id: shopId,
      name: "Coastal Coconut Fish Curry & Steamed Rice",
      description: "Fresh red snapper fillets simmered in rich coconut tamarind curry broth, served with aromatic jasmine rice.",
      price: 750,
      category: "Daily Specials",
      tags: ["friday"],
      diet_tags: ["friday"],
      is_active: true,
      stock: 30, // Daily cap: 30 portions
      sku: "LK-FSH-01",
      image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80"
    },
    {
      shop_id: shopId,
      name: "Herb Roast Chicken & Potato Wedges",
      description: "Half spring chicken roasted with rosemary, garlic, and thyme, paired with seasoned oven-baked wedges.",
      price: 700,
      category: "Daily Specials",
      tags: ["monday"],
      diet_tags: ["monday"],
      is_active: true,
      stock: 25,
      sku: "LK-RST-01",
      image_url: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&auto=format&fit=crop&q=80"
    },
    {
      shop_id: shopId,
      name: "Authentic Chicken Biryani with Boiled Egg",
      description: "Layered saffron basmati rice with marinated chicken pieces, caramelized onions, and a spiced farm egg.",
      price: 750,
      category: "Daily Specials",
      tags: ["tuesday"],
      diet_tags: ["tuesday"],
      is_active: true,
      stock: 35,
      sku: "LK-BRY-01",
      image_url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80"
    },
    {
      shop_id: shopId,
      name: "Slow-Simmered Coconut Goat Stew & Rice",
      description: "Tender goat stew simmered in rich spices and coconut milk, accompanied by fragrant rice.",
      price: 700,
      category: "Daily Specials",
      tags: ["wednesday"],
      diet_tags: ["wednesday"],
      is_active: true,
      stock: 30,
      sku: "LK-GST-01",
      image_url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80"
    },

    // --- SNACKS & PASTRIES (MULTI-DAY ITEMS) ---
    {
      shop_id: shopId,
      name: "Crispy Beef Samosas (Pair of 3)",
      description: "Golden fried pastry pockets stuffed with minced spiced beef, sweet onions, and fragrant coriander.",
      price: 150,
      category: "Snacks & Pastries",
      tags: ["monday", "thursday"], // Available on BOTH Monday & Thursday!
      diet_tags: ["monday", "thursday"],
      is_active: true,
      stock: 50, // Daily cap: 50 portions
      sku: "LK-SAM-01",
      image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80"
    },
    {
      shop_id: shopId,
      name: "Spiced Veggie Spring Rolls (Pair of 3)",
      description: "Crispy rolls filled with shredded cabbage, carrots, bell peppers, and mild sweet chili dip.",
      price: 120,
      category: "Snacks & Pastries",
      tags: ["daily", "all_days"], // Available Daily!
      diet_tags: ["daily"],
      is_active: true,
      stock: 60,
      sku: "LK-SPR-01",
      image_url: "https://images.unsplash.com/photo-1548507297-c884bfa4d805?w=800&auto=format&fit=crop&q=80"
    },
    {
      shop_id: shopId,
      name: "Mahamri & Coconut Mbaazi Breakfast Box",
      description: "Warm cardamom mahamri served with slow-cooked pigeon peas in thick savory coconut cream.",
      price: 450,
      category: "Snacks & Pastries",
      tags: ["friday"],
      diet_tags: ["friday"],
      is_active: true,
      stock: 50,
      sku: "LK-MBZ-01",
      image_url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80"
    },

    // --- HOUSE BEVERAGES (DAILY STAPLES) ---
    {
      shop_id: shopId,
      name: "Fresh Passion & Mint Cooler (500ml)",
      description: "Cold-pressed passion fruit juice blended with garden mint leaves and light organic cane sugar.",
      price: 200,
      category: "House Beverages",
      tags: ["daily", "all_days"],
      diet_tags: ["daily"],
      is_active: true,
      stock: 80,
      sku: "LK-JCE-01",
      image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80"
    },
    {
      shop_id: shopId,
      name: "Hibiscus Zobo Iced Tea (500ml)",
      description: "Chilled infusion of dried roselle calyces, fresh ginger, and cloves.",
      price: 180,
      category: "House Beverages",
      tags: ["daily", "all_days"],
      diet_tags: ["daily"],
      is_active: true,
      stock: 60,
      sku: "LK-ZOB-01",
      image_url: "https://images.unsplash.com/photo-1556881286-fc6915169721?w=800&auto=format&fit=crop&q=80"
    },

    // --- SIDES & EXTRAS (DAILY STAPLES) ---
    {
      shop_id: shopId,
      name: "Layered Soft Chapatis (Pair of 2)",
      description: "Hand-rolled, flaky golden chapatis pan-toasted to buttery perfection.",
      price: 100,
      category: "Sides & Extras",
      tags: ["daily", "all_days"],
      diet_tags: ["daily"],
      is_active: true,
      stock: 100,
      sku: "LK-CHP-01",
      image_url: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&auto=format&fit=crop&q=80"
    }
  ];

  await supabase.from("menu_items").insert(dishes);
  console.log(`✓ Seeded ${dishes.length} daily rotating dishes with pictures!`);

  console.log("\n========================================================");
  console.log("   🎉 LEAH'S KITCHEN PROVISIONED SUCCESSFULLY!          ");
  console.log("========================================================");
  console.log(`🏪 Name:              ${name}`);
  console.log(`🆔 Shop ID:           ${shopId}`);
  console.log(`🔗 Slug:              ${slug}`);
  console.log(`👤 Operator Email:    ${email}`);
  console.log(`🔑 Password:          ${password}`);
  console.log(`🚪 Collection Points: Gate A & Gate B`);
  console.log(`⏰ Cutoff Time:       5:00 PM (17:00)`);
  console.log("========================================================\n");
}

seedLeahsKitchen().catch(console.error);
