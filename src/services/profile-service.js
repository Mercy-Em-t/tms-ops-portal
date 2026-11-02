import { supabase } from "./supabase-client";

/**
 * Profile Service (V2)
 * ─────────────────────────────────────────
 * Handles all user profile related operations.
 */

export async function getProfile(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Profile: Fetch error", error);
    return null;
  }
  return data;
}

export async function updateProfile(userId, updates) {
  if (!supabase) return { error: "Supabase not connected" };
  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function getShopMemberships(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("shop_members")
    .select(`
      *,
      shops!shop_id (
        id,
        shop_id,
        name,
        subdomain,
        slug,
        logo_url
      )
    `)
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    console.error("Profile: Memberships fetch error", error);
    return [];
  }
  return data;
}
