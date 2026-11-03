# V3 QR Manager: Super Manager Account Documentation

## 1. Overview & Scope of Authority
The **Super Manager** (or System Administrator) account holds absolute authority over the entire V3 QR Manager platform. Unlike Shop Owners who are restricted by Row Level Security (RLS) to only see their own telemetry and menu data, the Super Manager handles global orchestration.

**Core Responsibilities:**
- Lifecycle management of independent shops (onboarding, suspension, offboarding).
- Subscription plan tier generation and feature gating.
- Platform-wide epidemiological analytics (understanding macro trends across all shops).

---

## 2. Authentication & Security Boundaries

### 2.1 Access Control
Super Managers access the platform via the exact same `/login` gateway as Shop Owners. However, upon authentication, the system evaluates the JWT token.
- **Shop Owner Role**: `user.role === 'shop_owner'` ➔ Routed to `/dashboard`.
- **Super Manager Role**: `user.role === 'system_admin'` ➔ Routed exclusively to `/admin`.

### 2.2 Security Configuration (Supabase)
To establish a Super Manager account, a developer or database administrator must manually elevate the user's role in the database.
```sql
-- Example SQL to elevate a user to Super Manager
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "system_admin"}'::jsonb 
WHERE email = 'admin@shopqrplatform.com';
```
Because the Super Manager operates outside standard RLS bounds when managing global data, they often interface via dedicated API endpoints or Supabase Service Role keys for highly destructive actions (like mass-deleting a shop context).

---

## 3. The Super Manager Control Center (`/admin`)

The `/admin` dashboard is logically separated from the consumer and shop workflows.

### 3.1 🏪 Shop Management (`/admin/shops`)
- **Bird's Eye View:** View all registered shops, their verification status, and their overall activity (Total Scans, Active Campaigns).
- **Impersonation/Support:** The ability to temporarily assume the context of a specific Shop Owner to debug Menu or QR generation issues without requiring their password.
- **Account Status Toggles:** Instantly suspend a shop if they fail to pay platform fees, immediately deactivating all associated live QR nodes globally.

### 3.2 💳 Plan Management (`/admin/plans`)
- **Tier Configuration:** Define the exact limits and features for "Basic", "Pro", and "Enterprise" tiers.
  - *Example Limits:* Number of active QR nodes, access to Campaign Manager, advanced custom reporting.
- **Feature Flags:** Toggle new V3 features on or off globally, or roll them out to specific beta-testing shops before a global launch.

### 3.3 📈 Platform Analytics (Future Capability)
The Super Manager has access to cross-shop data aggregation.
- They can answer questions like: *"Across all 50 shops on our platform, what time of day generates the most QR scans?"*
- These insights can be packaged and sold back to the Shop Owners as "Industry Benchmark Reports."

---

## 4. Best Practices for Super Managers
1. **Never Share Credentials**: The `system_admin` role has the power to destroy the platform database. Protect it with hardware 2FA if possible.
2. **Audit Logs**: All actions taken in the `/admin` portal (especially deleting shops or changing plans) should generate a non-deletable audit log in the database for compliance.
3. **Use Support Mode**: When helping a Shop Owner, always use a transparent "Support Mode" that flags any changes made to their menu as "Modified by Admin" to maintain trust.
