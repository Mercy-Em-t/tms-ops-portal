import { supabase } from "./supabase-client";

export async function getGoogleMetadata(targetType, targetId = null) {
  if (!supabase) return null;

  let query = supabase
    .from("google_metadata")
    .select("*")
    .eq("target_type", targetType);

  if (targetId) {
    query = query.eq("target_id", targetId);
  } else {
    query = query.is("target_id", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Error fetching google metadata:", error);
    return null;
  }

  return data;
}

export async function upsertGoogleMetadata(targetType, targetId, jsonLd) {
  if (!supabase) return { error: new Error("No database connection") };

  // Generate payload
  const payload = {
    target_type: targetType,
    target_id: targetId || null,
    json_ld: typeof jsonLd === "string" ? JSON.parse(jsonLd) : jsonLd
  };

  const { data, error } = await supabase
    .from("google_metadata")
    .upsert(payload, { onConflict: "target_type, target_id" })
    .select()
    .single();

  if (error) {
    console.error("Error saving google metadata:", error);
    return { error };
  }

  return { data, error: null };
}

// Fetch all metadata configs for the admin dashboard list
export async function getAllMetadataConfigs() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("google_metadata")
    .select("*, shops!google_metadata_target_id_fkey(name)") // Try to join shop name if it's a shop target
    .order("created_at", { ascending: false });

  if (error) {
     // If the foreign key relationship doesn't implicitly exist, fallback to a standard fetch
     console.warn("Join failed, fetching base rows");
     const fallback = await supabase.from("google_metadata").select("*");
     return fallback.data || [];
  }

  return data || [];
}
