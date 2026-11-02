import { createClient, SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://ocsuqfabqsyrbsewcaez.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jc3VxZmFicXN5cmJzZXdjYWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MjI4MjAsImV4cCI6MjA4OTA5ODgyMH0.ZxDwD3TIYg9dL2pvJPaTInLmlQu95Xv7BVB_PAezt9Q";

const envUrl = (import.meta.env.VITE_SUPABASE_URL as string || "").trim().replace(/\r?\n|\r/g, "");
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string || "").trim().replace(/\r?\n|\r/g, "");

const supabaseUrl = envUrl || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = envKey || DEFAULT_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: false,
    lock: null // Disable navigator.locks to prevent cross-tab deadlocks
  }
});
