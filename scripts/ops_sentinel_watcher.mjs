import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.trim().split('=');
    if (parts.length >= 2 && !parts[0].startsWith('#')) {
      process.env[parts[0]] = parts.slice(1).join('=');
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

const ENDPOINTS = [
  { name: 'Shop Front / Till API', url: 'https://shop.tmsavannah.com/api/till/receipt?action=health' },
  { name: 'Ops Management Portal', url: 'https://ops.tmsavannah.com' },
  { name: 'Commute Logistics Hub', url: 'https://commute.tmsavannah.com' }
];

export async function runSentinelCheck() {
  const timestamp = new Date().toISOString();
  console.log(`\n===============================================================`);
  console.log(`🛡️  TMS ECOSYSTEM SENTINEL WATCHER — ${timestamp}`);
  console.log(`===============================================================\n`);

  const report = {
    timestamp,
    endpoints: [],
    tillRelay: null,
    unclaimedPayments: [],
    stalePendingOrders: [],
    ledgerVariances: [],
    threatLevel: 'HEALTHY'
  };

  // 1. Endpoint Connectivity Probes
  console.log('--- 1. PROBING CLOUD ENDPOINTS ---');
  for (const ep of ENDPOINTS) {
    try {
      const start = Date.now();
      const res = await fetch(ep.url, { headers: { 'User-Agent': 'TMSSentinel/1.0' } });
      const latency = Date.now() - start;
      const status = res.status;
      const ok = status >= 200 && status < 400;
      console.log(`  [${ok ? 'OK' : 'ERR'}] ${ep.name.padEnd(24)} -> HTTP ${status} (${latency}ms)`);
      report.endpoints.push({ name: ep.name, url: ep.url, status, latency, ok });
      if (!ok) report.threatLevel = 'WARNING';
    } catch (err) {
      console.log(`  [DOWN] ${ep.name.padEnd(24)} -> Unreachable (${err.message})`);
      report.endpoints.push({ name: ep.name, url: ep.url, status: 0, ok: false, error: err.message });
      report.threatLevel = 'CRITICAL';
    }
  }

  // 2. Till Relay Dead-Man's Switch Audit
  console.log('\n--- 2. TILL RELAY PHONE OBSERVABILITY ---');
  try {
    const healthRes = await fetch('https://shop.tmsavannah.com/api/till/receipt?action=health');
    const health = await healthRes.json();
    report.tillRelay = health;
    if (health.is_online) {
      console.log(`  ✅ Relay Device: ${health.device_id} | Online | Battery: ${health.device_info?.battery}% | Latency: ${health.latency_minutes}m`);
    } else {
      console.log(`  ⚠️  Relay Device: ${health.device_id} | OFFLINE / STALE | Latency: ${health.latency_minutes}m`);
      console.log(`      Alert: ${health.alert}`);
      if (report.threatLevel !== 'CRITICAL') report.threatLevel = 'WARNING';
    }
  } catch (err) {
    console.log(`  ❌ Failed to query Till Relay health: ${err.message}`);
    report.threatLevel = 'CRITICAL';
  }

  // 3. Database Anomaly & Dropped Payment Detection
  console.log('\n--- 3. FINANCIAL ANOMALIES & UNCLAIMED RECEIPTS ---');
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  // Unclaimed payments
  const { data: unclaimed } = await supabase
    .from('payments')
    .select('id, amount, transaction_id, created_at, raw_payload')
    .is('order_id', null)
    .gte('created_at', thirtyMinsAgo);

  report.unclaimedPayments = unclaimed || [];
  if (unclaimed && unclaimed.length > 0) {
    console.log(`  ⚠️  Detected ${unclaimed.length} UNCLAIMED POOLED receipts in last 30m:`);
    unclaimed.forEach(u => console.log(`      • ${u.transaction_id} (KES ${u.amount}) from ${u.raw_payload?.name || 'Unknown'}`));
    if (report.threatLevel === 'HEALTHY') report.threatLevel = 'WARNING';
  } else {
    console.log(`  ✅ Zero orphaned/unclaimed payments in the active 30m window.`);
  }

  // Stale pending orders
  const { data: staleOrders } = await supabase
    .from('orders')
    .select('id, client_name, client_phone, total_price, created_at')
    .eq('status', 'pending')
    .lte('created_at', thirtyMinsAgo)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  report.stalePendingOrders = staleOrders || [];
  if (staleOrders && staleOrders.length > 0) {
    console.log(`  ⚠️  Detected ${staleOrders.length} pending orders older than 30m without payment.`);
  } else {
    console.log(`  ✅ Zero abandoned pending orders in active window.`);
  }

  // Till Balance Variances
  const { data: variances } = await supabase
    .from('payments')
    .select('transaction_id, amount, raw_payload')
    .not('raw_payload->balance_variance', 'is', null)
    .neq('raw_payload->balance_variance', 0)
    .order('created_at', { ascending: false })
    .limit(5);

  report.ledgerVariances = variances || [];
  if (variances && variances.length > 0) {
    console.log(`  ℹ️  Recent Ledger Variances detected: ${variances.length}`);
    variances.forEach(v => {
      console.log(`      • Receipt ${v.transaction_id}: Variance ${v.raw_payload?.balance_variance} (Expected: ${v.raw_payload?.expected_balance}, Actual: ${v.raw_payload?.balance})`);
    });
  }

  console.log(`\n===============================================================`);
  console.log(`OVERALL ECOSYSTEM STATUS: [ ${report.threatLevel} ]`);
  console.log(`===============================================================\n`);

  return report;
}

if (process.argv[1] && process.argv[1].endsWith('ops_sentinel_watcher.mjs')) {
  runSentinelCheck().catch(console.error);
}
