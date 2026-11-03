# TMS Ops Portal — Administrative & Operations CLI Toolset

This directory contains backoffice provisioning tools, subscription reconcilers, and test data generators for `tms-ops-portal`:

## 🏪 Shop Provisioning
- **`provision-pilot-shop.mjs`**: Interactive backoffice wizard to onboard and provision new merchant accounts and stores in Supabase.
  - Run: `npm run provision:shop`
- **`provision-creative-galore.mjs`**: Administrative script for provisioning the Creative Galore shop configuration and catalog.
  - Run: `npm run provision:creative-galore`

## 🕛 Subscription & Lease Management
- **`reconcile-feature-leases.mjs`**: Midnight cron and on-demand sweep that evaluates merchant trial/feature leases and revokes expired licenses using the master service role.
  - Run: `npm run lease:reconcile`

## 🌱 Test Data Seeds (`seeds/`)
- **`seed-leahs-kitchen.mjs`**: Seeds dishes, categories, and inventory for Leah's Kitchen test storefront.
  - Run: `npm run seed:leahs-kitchen`
- **`seed-sample-orders.mjs`**: Populates demo orders across statuses (pending, preparing, ready, fulfilled) for testing kitchen displays and ops dispatch.
  - Run: `npm run seed:sample-orders`
