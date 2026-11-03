import fs from "fs";
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
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const SHOP_ID = "b8c8be14-7bcf-4dd5-86fa-d672ac7b4422"; // Leah's Kitchen

async function createSampleOrders() {
  console.log("🍳 Creating 4 distinct sample orders for Leah's Kitchen...");

  // Fetch menu items
  const { data: menuItems, error: menuErr } = await supabase
    .from("menu_items")
    .select("id, name, price")
    .eq("shop_id", SHOP_ID);

  if (menuErr || !menuItems || menuItems.length === 0) {
    console.error("Failed to retrieve menu items:", menuErr);
    process.exit(1);
  }

  const findItem = (namePart) => menuItems.find(i => i.name.toLowerCase().includes(namePart.toLowerCase())) || menuItems[0];

  const pilau = findItem("pilau");
  const samosas = findItem("samosa");
  const biryani = findItem("biryani");
  const passion = findItem("passion");
  const fishCurry = findItem("fish");
  const chapati = findItem("chapati");
  const goatStew = findItem("goat");

  const ordersData = [
    {
      mutationId: "LK-1001",
      customerName: "Faith Wanjiku",
      customerPhone: "0712345678",
      customerEmail: "faith.w@example.com",
      status: "preparing",
      fulfillmentType: "pickup_point",
      deliveryAddress: "Gate A",
      mpesaCode: "SHK89271KJ",
      items: [
        { item: pilau, qty: 1 },
        { item: samosas, qty: 2 }
      ],
      note: "Extra kachumbari please!"
    },
    {
      mutationId: "LK-1002",
      customerName: "Brian Otieno",
      customerPhone: "0723456789",
      customerEmail: "brian.o@example.com",
      status: "ready",
      fulfillmentType: "pickup_point",
      deliveryAddress: "Gate A",
      mpesaCode: "QRM41920LX",
      items: [
        { item: biryani, qty: 1 },
        { item: passion, qty: 1 }
      ],
      note: "Will pick up at exactly 9:15 AM."
    },
    {
      mutationId: "LK-1003",
      customerName: "Mercy Chebet",
      customerPhone: "0734567890",
      customerEmail: "mercy.c@example.com",
      status: "ready",
      shopConfirmedAt: new Date().toISOString(),
      fulfillmentType: "pickup_point",
      deliveryAddress: "Gate B",
      mpesaCode: "PLK55219TR",
      items: [
        { item: fishCurry, qty: 1 },
        { item: chapati, qty: 1 }
      ],
      note: "Runner is at Gate B right now."
    },
    {
      mutationId: "LK-1004",
      customerName: "Kevin Mwangi",
      customerPhone: "0745678901",
      customerEmail: "kevin.m@example.com",
      status: "completed",
      shopConfirmedAt: new Date(Date.now() - 3600000).toISOString(),
      customerConfirmedAt: new Date(Date.now() - 3500000).toISOString(),
      fulfillmentType: "pickup_point",
      deliveryAddress: "Gate B",
      mpesaCode: "WXZ98762LK",
      items: [
        { item: goatStew, qty: 1 },
        { item: samosas, qty: 2 }
      ],
      rating: 5,
      comment: "The coconut goat stew was melt-in-the-mouth perfection! Samosas still warm."
    }
  ];

  const createdOrders = [];

  for (const o of ordersData) {
    const total = o.items.reduce((sum, i) => sum + (i.item.price * i.qty), 0);

    // Delete existing test order with same mutationId if any
    await supabase.from("orders").delete().eq("client_mutation_id", o.mutationId);

    const { data: newOrder, error: orderErr } = await supabase
      .from("orders")
      .insert({
        shop_id: SHOP_ID,
        status: o.status,
        total_price: total,
        client_name: o.customerName,
        client_phone: o.customerPhone,
        customer_email: o.customerEmail,
        fulfillment_type: o.fulfillmentType,
        delivery_address: o.deliveryAddress,
        mpesa_code: o.mpesaCode,
        client_mutation_id: o.mutationId,
        shop_confirmed_at: o.shopConfirmedAt || null,
        customer_confirmed_at: o.customerConfirmedAt || null,
        fulfillment_deadline: new Date(Date.now() + 14 * 3600000).toISOString(),
        order_type: "direct"
      })
      .select()
      .single();

    if (orderErr) {
      console.error(`Failed to create order ${o.mutationId}:`, orderErr);
      continue;
    }

    // Insert order items
    for (const line of o.items) {
      await supabase.from("order_items").insert({
        order_id: newOrder.id,
        menu_item_id: line.item.id,
        quantity: line.qty,
        price: line.item.price
      });
    }

    // Insert rating if present
    if (o.rating) {
      await supabase.from("order_ratings").upsert({
        order_id: newOrder.id,
        shop_id: SHOP_ID,
        rating: o.rating,
        comment: o.comment
      });
    }

    createdOrders.push({
      code: o.mutationId,
      uuid: newOrder.id,
      customer: o.customerName,
      status: o.status,
      gate: o.deliveryAddress,
      total: total
    });
  }

  console.log("\n========================================================");
  console.log("   🎉 4 SAMPLE ORDERS CREATED FOR LEAH'S KITCHEN!       ");
  console.log("========================================================");
  createdOrders.forEach(o => {
    console.log(`📌 Code: ${o.code} | Status: ${o.status.toUpperCase()} | Gate: ${o.gate} | Total: KSh ${o.total}`);
    console.log(`   🔗 Direct UUID Tracking Link:  /track/${o.uuid}`);
    console.log(`   🔗 Short ID Tracking Link:     /track/${o.code}`);
  });
  console.log("========================================================\n");
}

createSampleOrders();
