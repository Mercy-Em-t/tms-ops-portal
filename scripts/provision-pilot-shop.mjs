#!/usr/bin/env node
import fs from "fs";
import path from "path";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// 1. Load environment variables
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

// 2. Parse command line flags (--name="...", --slug="...", etc.)
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const [rawKey, ...rawVal] = arg.slice(2).split("=");
      const key = rawKey.toLowerCase();
      if (rawVal.length > 0) {
        params[key] = rawVal.join("=");
      } else if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        params[key] = args[++i];
      } else {
        params[key] = true;
      }
    }
  }
  return params;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

function buildDefaultStations(industryType) {
  const isFood = industryType === "food" || industryType === "restaurant";
  if (isFood) {
    return [
      { id: "pending_payment", label: "Awaiting Payment", icon: "⏳", notify_customer: false, notify_ops: true, command_triggers: [] },
      { id: "confirmed", label: "Order Confirmed", icon: "✅", notify_customer: true, notify_ops: true, command_triggers: ["!paid", "!confirm"] },
      { id: "cooking", label: "In Kitchen", icon: "🍳", notify_customer: true, notify_ops: false, command_triggers: ["!cook", "!prep", "!kitchen"] },
      { id: "packed", label: "Packed & Boxed", icon: "🥡", notify_customer: true, notify_ops: true, command_triggers: ["!pack", "!ready"] },
      { id: "out_for_delivery", label: "Out for Delivery", icon: "🛵", notify_customer: true, notify_ops: true, command_triggers: ["!dispatch", "!deliver"] },
      { id: "completed", label: "Delivered", icon: "🎉", notify_customer: true, notify_ops: false, command_triggers: ["!done", "!complete"] }
    ];
  }
  return [
    { id: "pending_payment", label: "Awaiting Payment", icon: "⏳", notify_customer: false, notify_ops: true, command_triggers: [] },
    { id: "confirmed", label: "Order Confirmed", icon: "✅", notify_customer: true, notify_ops: true, command_triggers: ["!paid", "!confirm"] },
    { id: "picking", label: "Picking Items", icon: "🪡", notify_customer: true, notify_ops: false, command_triggers: ["!pick", "!prepare"] },
    { id: "packed", label: "Packed & Boxed", icon: "📦", notify_customer: true, notify_ops: true, command_triggers: ["!pack", "!ready"] },
    { id: "dispatched", label: "Out for Delivery", icon: "🛵", notify_customer: true, notify_ops: true, command_triggers: ["!dispatch", "!deliver"] },
    { id: "completed", label: "Delivered", icon: "🎉", notify_customer: true, notify_ops: false, command_triggers: ["!done", "!complete"] }
  ];
}

function buildOrderPrefix(name, slug) {
  const words = (name || slug || "TMS").replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  }
  if (words.length === 2) {
    return (words[0].slice(0, 2) + words[1][0]).toUpperCase();
  }
  return (words[0] || "TMS").slice(0, 3).toUpperCase();
}

// Extract defaults from src/tenants/<slug>/tenant.config.ts if present
function loadTenantPresetFromDisk(slug) {
  const candidates = [
    path.join(process.cwd(), "src", "tenants", slug, "tenant.config.ts"),
    path.join(process.cwd(), "src", "tenants", slug.replace(/-/g, "_"), "tenant.config.ts")
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const extractStr = (key) => {
        const m = raw.match(new RegExp(`${key}:\\s*["']([^"']+)["']`));
        return m ? m[1] : null;
      };
      const extractBool = (key) => {
        const m = raw.match(new RegExp(`${key}:\\s*(true|false)`));
        return m ? m[1] === "true" : undefined;
      };
      const pickupMatch = raw.match(/pickupPoints:\s*\[([\s\S]*?)\]/);
      let pickupPoints = [];
      if (pickupMatch) {
        pickupPoints = [...pickupMatch[1].matchAll(/["']([^"']+)["']/g)].map(m => m[1]);
      }
      return {
        brandName: extractStr("brandName"),
        tagline: extractStr("tagline"),
        supportPhone: extractStr("supportPhone"),
        opsGroupJid: extractStr("opsGroupJid"),
        adminGroupJid: extractStr("adminGroupJid"),
        communityGroupJid: extractStr("communityGroupJid"),
        primaryColor: extractStr("primaryColor"),
        secondaryColor: extractStr("secondaryColor"),
        accentColor: extractStr("accentColor"),
        backgroundColor: extractStr("backgroundColor"),
        surfaceColor: extractStr("surfaceColor"),
        textColor: extractStr("textColor"),
        acceptsPickup: extractBool("acceptsPickup"),
        acceptsDelivery: extractBool("acceptsDelivery"),
        acceptsDineIn: extractBool("acceptsDineIn"),
        acceptsPickupPoint: extractBool("acceptsPickupPoint"),
        pickupPoints
      };
    }
  }
  return null;
}

async function main() {
  console.log("\n==========================================================");
  console.log("   🚀 TMS WHITELABEL — PILOT SHOP AUTOMATED PROVISIONER   ");
  console.log("==========================================================\n");

  const env = loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("❌ Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    console.error("   The service role key is required to provision Supabase Auth users and shops.\n");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const cliParams = parseArgs();
  let name = cliParams.name;
  let slug = cliParams.slug;
  let email = cliParams.email;
  let password = cliParams.password;
  let phone = cliParams.phone;
  let color = cliParams.color;

  const isInteractive = Boolean(input.isTTY && (!name || !email || !password));

  if (isInteractive) {
    const rl = readline.createInterface({ input, output });
    try {
      if (!name) {
        name = await rl.question("🏪 Shop Name (e.g. Nairobi Bistro): ");
        name = name.trim() || "Nairobi Bistro";
      }
      if (!slug) {
        const defaultSlug = slugify(name);
        const inputSlug = await rl.question(`🔗 Shop Slug / Subdomain [default: ${defaultSlug}]: `);
        slug = inputSlug.trim() ? slugify(inputSlug.trim()) : defaultSlug;
      }
      if (!email) {
        const defaultEmail = `operator@${slug}.com`;
        const inputEmail = await rl.question(`👤 Operator Login Email [default: ${defaultEmail}]: `);
        email = inputEmail.trim() || defaultEmail;
      }
      if (!password) {
        const genPass = `Pilot@${Math.floor(1000 + Math.random() * 9000)}`;
        const inputPassword = await rl.question(`🔑 Security Password [default: ${genPass}]: `);
        password = inputPassword.trim() || genPass;
      }
      if (!phone) {
        const inputPhone = await rl.question("📱 Business Phone Number (optional): ");
        phone = inputPhone.trim() || null;
      }
      if (!cliParams.color) {
        const inputColor = await rl.question("🎨 Brand Primary Color [default: #059669]: ");
        color = inputColor.trim() || "#059669";
      }
    } finally {
      rl.close();
    }
  } else {
    if (!name) name = "Nairobi Bistro";
    if (!slug) slug = slugify(name);
    if (!email) email = `operator@${slug}.com`;
    if (!password) password = `Pilot@${Math.floor(1000 + Math.random() * 9000)}`;
    if (!phone) phone = null;
  }

  const preset = loadTenantPresetFromDisk(slug);
  if (!color) {
    color = preset?.primaryColor || "#059669";
  }
  if (!phone && preset?.supportPhone) {
    phone = preset.supportPhone;
  }

  console.log(`\n⏳ Provisioning shop "${name}" (${slug}) and syncing full configuration to Supabase...\n`);

  // Step 1: Ensure Shop exists in `shops` table with complete self-contained configuration
  let shopId = null;
  const { data: existingShop } = await supabase
    .from("shops")
    .select("*")
    .or(`slug.eq.${slug},subdomain.eq.${slug}`)
    .maybeSingle();

  const existingFs = existingShop?.fulfillment_settings || {};
  const existingRouting = existingFs.whatsapp_routing || {};
  const existingApp = existingShop?.appearance_config || {};
  const existingTheme = existingApp.theme || {};

  const industryType = cliParams.industry || existingShop?.industry_type || "retail";
  const isPreorder = cliParams["is-preorder"] !== undefined
    ? String(cliParams["is-preorder"]) === "true"
    : Boolean(existingFs.is_preorder ?? false);
  const cutoffTime = cliParams.cutoff || existingFs.cutoff_time || (isPreorder ? "17:00" : null);
  const pickupPoints = cliParams["pickup-points"]
    ? String(cliParams["pickup-points"]).split(",").map(s => s.trim()).filter(Boolean)
    : (Array.isArray(existingFs.pickup_points) && existingFs.pickup_points.length > 0
        ? existingFs.pickup_points
        : (preset?.pickupPoints || []));

  const canonicalFulfillmentSettings = {
    ...existingFs,
    currency: existingFs.currency || "KES",
    is_preorder: isPreorder,
    preorder_mode: isPreorder,
    cutoff_time: cutoffTime,
    accepts_pickup: preset?.acceptsPickup ?? existingFs.accepts_pickup ?? true,
    accepts_delivery: preset?.acceptsDelivery ?? existingFs.accepts_delivery ?? true,
    accepts_dine_in: preset?.acceptsDineIn ?? existingFs.accepts_dine_in ?? Boolean(industryType === "restaurant" || industryType === "food"),
    accepts_pickup_point: preset?.acceptsPickupPoint ?? existingFs.accepts_pickup_point ?? (pickupPoints.length > 0),
    accepts_leave_with_items: existingFs.accepts_leave_with_items ?? false,
    pickup_points: pickupPoints,
    pipeline_type: existingFs.pipeline_type || ((industryType === "restaurant" || industryType === "food") ? "kitchen" : "retail"),
    pipeline_stations: (Array.isArray(existingFs.pipeline_stations) && existingFs.pipeline_stations.length > 0)
      ? existingFs.pipeline_stations
      : buildDefaultStations(industryType),
    whatsapp_routing: {
      ...existingRouting,
      order_prefix: cliParams.prefix || existingRouting.order_prefix || buildOrderPrefix(name, slug),
      operations_jid: cliParams["ops-jid"] || existingRouting.operations_jid || preset?.opsGroupJid || null,
      management_jid: cliParams["admin-jid"] || existingRouting.management_jid || preset?.adminGroupJid || null,
      community_jid: cliParams["community-jid"] || existingRouting.community_jid || preset?.communityGroupJid || null
    }
  };

  const canonicalAppearanceConfig = {
    ...existingApp,
    brand_name: name,
    primary_color: color,
    theme: {
      ...existingTheme,
      primary_color: color,
      secondary_color: cliParams["secondary-color"] || preset?.secondaryColor || existingTheme.secondary_color || "#0f172a",
      accent_color: cliParams["accent-color"] || preset?.accentColor || existingTheme.accent_color || color,
      background_color: preset?.backgroundColor || existingTheme.background_color || "#f8fafc",
      surface_color: preset?.surfaceColor || existingTheme.surface_color || "#ffffff",
      text_color: preset?.textColor || existingTheme.text_color || "#0f172a"
    }
  };

  const mpesaTill = cliParams.till || existingShop?.mpesa_till_number || env.VITE_PLATFORM_MASTER_TILL || "5758419";

  if (existingShop) {
    shopId = existingShop.id || existingShop.shop_id;
    console.log(`✓ Existing shop matched: "${existingShop.name}" (ID: ${shopId})`);

    const { error: updateErr } = await supabase.from("shops").update({
      name,
      plan: "business",
      is_online: true,
      phone: phone || existingShop.phone,
      whatsapp_number: phone || existingShop.whatsapp_number || existingShop.phone,
      mpesa_till_number: mpesaTill,
      industry_type: industryType,
      enabled_modules: ["orders", "products", "qr", "accounting", "settings", "appearance"],
      appearance_config: canonicalAppearanceConfig,
      fulfillment_settings: canonicalFulfillmentSettings
    }).eq("id", shopId);

    if (updateErr) {
      console.error("❌ Failed to update shop configuration:", updateErr);
      process.exit(1);
    }
    console.log(`✓ Synced complete isolated configuration (fulfillment, theme, pipeline, WhatsApp JIDs) in Supabase.`);
  } else {
    shopId = crypto.randomUUID();
    const { error: insertShopErr } = await supabase.from("shops").insert({
      id: shopId,
      name,
      slug,
      subdomain: slug,
      plan: "business",
      is_online: true,
      phone,
      whatsapp_number: phone,
      mpesa_till_number: mpesaTill,
      enabled_modules: ["orders", "products", "qr", "accounting", "settings", "appearance"],
      appearance_config: canonicalAppearanceConfig,
      industry_type: industryType,
      offers_dine_in: Boolean(industryType === "restaurant" || industryType === "food"),
      fulfillment_settings: canonicalFulfillmentSettings
    });

    if (insertShopErr) {
      console.error("❌ Failed to insert shop:", insertShopErr);
      process.exit(1);
    }
    console.log(`✓ Created new shop "${name}" with ID: ${shopId} and persisted full configuration in Supabase.`);
  }

  // Step 2: Create or retrieve Supabase Auth User
  let userId = null;
  const { data: userList } = await supabase.auth.admin.listUsers();
  const existingUser = userList?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (existingUser) {
    userId = existingUser.id;
    console.log(`✓ Existing Supabase Auth user found: ${email} (${userId})`);
    await supabase.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { shop_name: name, shop_slug: slug }
    });
    console.log(`✓ Reset user password to provided credentials.`);
  } else {
    const { data: newUser, error: createUserErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { shop_name: name, shop_slug: slug }
    });

    if (createUserErr) {
      console.error("❌ Failed to create Supabase Auth user:", createUserErr);
      process.exit(1);
    }
    userId = newUser.user.id;
    console.log(`✓ Created Supabase Auth user: ${email} (${userId})`);
  }

  // Step 3: Upsert into `profiles`
  const { error: profileErr } = await supabase.from("profiles").upsert({
    id: userId,
    display_name: `${name} Operator`,
    system_role: "user"
  });
  if (profileErr) {
    console.warn("⚠️ Warning on profiles upsert:", profileErr.message);
  } else {
    console.log(`✓ User profile configured.`);
  }

  // Step 4: Link user in `shop_members` as owner
  const { error: memberErr } = await supabase.from("shop_members").upsert({
    user_id: userId,
    shop_id: shopId,
    role: "owner",
    is_active: true
  }, { onConflict: "user_id,shop_id" });

  if (memberErr) {
    console.error("❌ Failed to link shop membership:", memberErr);
    process.exit(1);
  }
  console.log(`✓ Operator membership linked as "owner" to shop ${shopId}.`);

  // Step 5: Seed starter category and items if none exist
  const { data: existingItems } = await supabase
    .from("menu_items")
    .select("id")
    .eq("shop_id", shopId)
    .limit(1);

  if (!existingItems || existingItems.length === 0) {
    console.log(`✓ Seeding initial menu items and categories for ${name}...`);

    await supabase.from("categories").upsert({
      shop_id: shopId,
      name: "House Specials",
      slug: "house-specials"
    }, { onConflict: "shop_id,slug" });

    await supabase.from("menu_items").insert([
      {
        shop_id: shopId,
        name: `${name} Signature Platter`,
        description: "Freshly prepared chef specialty made with locally sourced organic ingredients.",
        price: 950,
        category: "House Specials",
        is_active: true,
        stock: 50,
        image_url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80"
      },
      {
        shop_id: shopId,
        name: "Savannah Artisanal Cooler",
        description: "Chilled house-crafted botanic beverage infused with fresh fruit notes.",
        price: 350,
        category: "House Specials",
        is_active: true,
        stock: 100,
        image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80"
      }
    ]);
    console.log(`✓ Seeded 2 starter dishes with pictures onto the public menu.`);
  }

  // Output Provisioning Summary
  console.log("\n==========================================================");
  console.log("   🎉 PILOT SHOP PROVISIONED & STORED IN SUPABASE!        ");
  console.log("==========================================================\n");
  console.log(`🏪 Shop Name:       ${name}`);
  console.log(`🆔 Shop ID:         ${shopId}`);
  console.log(`🔗 Slug:            ${slug}`);
  console.log(`🎨 Primary Color:   ${color}`);
  console.log(`💳 M-Pesa Till:     ${mpesaTill}`);
  console.log(`📅 Pre-Order Mode:  ${canonicalFulfillmentSettings.is_preorder}`);
  console.log(`📡 Ops Group JID:   ${canonicalFulfillmentSettings.whatsapp_routing.operations_jid || "Not bound yet"}`);
  console.log(`----------------------------------------------------------`);
  console.log(`👤 Operator Email:  ${email}`);
  console.log(`🔑 Password:        ${password}`);
  console.log(`----------------------------------------------------------`);
  console.log(`🌐 Public Storefront: /s/${slug}`);
  console.log(`🔐 Merchant Login:    /login?shop=${slug}`);
  console.log("==========================================================\n");
}

main().catch(err => {
  console.error("Unhandled provisioning error:", err);
  process.exit(1);
});
