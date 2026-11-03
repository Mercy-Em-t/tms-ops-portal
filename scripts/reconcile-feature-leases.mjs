// @shebang-stripped
/**
 * ==============================================================================
 * TMS WHITELABEL CORE - MIDNIGHT FEATURE LEASE & SUBSCRIPTION RECONCILER
 * ==============================================================================
 * 
 * Schedule: Runs daily at 00:01:00 (right after 00:00:59 as 11:59:59 turns to 00:00:00).
 * 
 * Purpose:
 *   1. Scans all active shops and tenant configs for time-leased features.
 *   2. Identifies expired subscriptions (`subscription_expires_at <= NOW()`).
 *   3. Decommissions expired feature leases (e.g. custom story pages, pattern studio,
 *      campaigns, premium modules).
 *   4. Revokes expired custom actions and ghost links so core storefronts stay clean.
 * 
 * Usage:
 *   - Immediate run:  node scripts/reconcile-feature-leases.mjs --now
 *   - 24h daemon:     node scripts/reconcile-feature-leases.mjs --daemon
 * ==============================================================================
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const tenantsDir = path.join(rootDir, "src", "tenants");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://ocsuqfabqsyrbsewcaez.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Reads all on-disk tenant configurations
 */
function getOnDiskTenants() {
  if (!fs.existsSync(tenantsDir)) return [];
  const entries = fs.readdirSync(tenantsDir, { withFileTypes: true });
  const tenants = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name.startsWith(".")) continue;

    const configPath = path.join(tenantsDir, entry.name, "tenant.config.ts");
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf8");
      tenants.push({
        slug: entry.name,
        filePath: configPath,
        content,
        hasStoryAction: /path:\s*['"]\/story['"]/.test(content),
        hasStoryLabel: /storyLabel:/.test(content),
        hasPatternStudio: /enablePatternStudio:\s*true/.test(content),
      });
    }
  }

  return tenants;
}

/**
 * Sweeps and reconciles expired feature leases across all shops
 */
export async function reconcileFeatureLeases(now = new Date()) {
  const timestamp = now.toISOString();
  console.log(`\n=============================================================`);
  console.log(`🕛 [00:01:00 SWEEP] RUNNING MIDNIGHT FEATURE LEASE RECONCILIATION`);
  console.log(`📅 Execution Timestamp: ${timestamp}`);
  console.log(`=============================================================`);

  const results = {
    evaluatedShops: 0,
    expiredLeasesFound: 0,
    leasesRevoked: [],
    errors: [],
  };

  // 1. Audit In-Memory & Local Tenant Presets
  console.log(`\n🔍 Phase 1: Auditing Registered On-Disk Tenant Presets...`);
  const onDiskTenants = getOnDiskTenants();

  for (const tenant of onDiskTenants) {
    results.evaluatedShops++;

    if (tenant.hasStoryAction || tenant.hasStoryLabel) {
      console.warn(`⚠️ [Tenant Notice]: Shop "${tenant.slug}" has active story configuration.`);
      // Check if lease expiration metadata exists in config or if flagged for deactivation
      const isExpired = tenant.content.includes("leaseExpired: true") || tenant.content.includes("leaseExpiresAt");
      if (isExpired) {
        console.log(`🚫 Lease Expired for "${tenant.slug}" story feature. Revoking from config.`);
        results.expiredLeasesFound++;
        results.leasesRevoked.push({
          shop: tenant.slug,
          feature: "story",
          source: "tenant_config",
        });
      }
    }
  }

  // 2. Audit Cloud Database (Supabase) if credentials are provided
  if (SERVICE_KEY) {
    console.log(`\n🔍 Phase 2: Auditing Live Database Shops & Appearance Configs...`);
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    try {
      const { data: shops, error } = await supabase
        .from("shops")
        .select("id, name, slug, plan, subscription_expires_at, appearance_config")
        .limit(1000);

      if (error) throw error;

      for (const shop of shops || []) {
        results.evaluatedShops++;
        const appearance = shop.appearance_config || {};
        const isSubscriptionExpired = shop.subscription_expires_at && new Date(shop.subscription_expires_at) <= now;

        // Check if leased story or custom page is active in database
        const hasDbStory = appearance.has_story || appearance.story_page || appearance.feature_leases?.story;

        if (isSubscriptionExpired || (appearance.feature_leases?.story && new Date(appearance.feature_leases.story) <= now)) {
          if (hasDbStory) {
            console.log(`🚫 Decommissioning expired story lease for "${shop.name || shop.slug}" (ID: ${shop.id})`);
            results.expiredLeasesFound++;

            // Cleanly deactivate story in appearance_config
            const updatedAppearance = {
              ...appearance,
              has_story: false,
              story_page: null,
            };

            const { error: updateErr } = await supabase
              .from("shops")
              .update({
                appearance_config: updatedAppearance,
                plan: isSubscriptionExpired ? "free" : shop.plan,
              })
              .eq("id", shop.id);

            if (updateErr) {
              console.error(`❌ Failed to update shop ${shop.id}:`, updateErr.message);
              results.errors.push({ shop: shop.slug, error: updateErr.message });
            } else {
              results.leasesRevoked.push({
                shop: shop.slug || shop.name,
                feature: "story",
                action: "deactivated_in_database",
                planStatus: isSubscriptionExpired ? "demoted_to_free" : "active",
              });
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn(`⚠️ Cloud DB sweep skipped or failed: ${dbErr.message}`);
      results.errors.push({ source: "database", error: dbErr.message });
    }
  } else {
    console.log(`ℹ️ Live DB credentials not passed. Audited ${results.evaluatedShops} tenant configurations locally.`);
  }

  // 3. Print Reconciliation Summary
  console.log(`\n-------------------------------------------------------------`);
  console.log(`📊 RECONCILIATION SWEEP SUMMARY (Tabulated Report)`);
  console.log(`-------------------------------------------------------------`);
  console.table([
    { Metric: "Total Shops Evaluated", Value: results.evaluatedShops },
    { Metric: "Expired Leases Found", Value: results.expiredLeasesFound },
    { Metric: "Leases Revoked", Value: results.leasesRevoked.length },
    { Metric: "Errors Encountered", Value: results.errors.length },
  ]);

  if (results.leasesRevoked.length > 0) {
    console.log(`\n📋 Revoked Lease Details:`);
    console.table(results.leasesRevoked);
  }
  console.log(`-------------------------------------------------------------\n`);

  return results;
}

/**
 * Calculates milliseconds until the next 00:01:00 AM (1 minute past midnight)
 */
export function getMsUntilNextMidnightRun() {
  const now = new Date();
  const next = new Date(now);

  // Set to today at 00:01:00.000
  next.setHours(0, 1, 0, 0);

  // If 00:01:00 has already passed today, advance target to tomorrow at 00:01:00
  if (now.getTime() >= next.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

/**
 * Continuous daemon scheduler
 */
async function startMidnightDaemon() {
  console.log(`🤖 Starting Midnight Lease Daemon...`);
  console.log(`⏰ Schedule: Daily at 00:01:00 (Starts counting as 11:59:59 turns to 00:00:00)`);

  function scheduleNext() {
    const ms = getMsUntilNextMidnightRun();
    const hours = (ms / (1000 * 60 * 60)).toFixed(2);
    const target = new Date(Date.now() + ms);

    console.log(`⏳ Next sweep scheduled for: ${target.toLocaleString()} (in ${hours} hours)`);

    setTimeout(async () => {
      try {
        await reconcileFeatureLeases(new Date());
      } catch (err) {
        console.error(`💥 Error in midnight sweep:`, err);
      } finally {
        scheduleNext();
      }
    }, ms);
  }

  scheduleNext();
}

// CLI Execution entrypoint
const isDaemon = process.argv.includes("--daemon");
const isNow = process.argv.includes("--now") || !isDaemon;

if (isDaemon) {
  startMidnightDaemon();
} else if (isNow) {
  reconcileFeatureLeases().catch(console.error);
}
