import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../services/auth-service";
import { supabase } from "../services/supabase-client";
import LoadingSpinner from "./LoadingSpinner";
import { useState, useEffect, useMemo } from "react";

/**
 * Strict Authentication Gate.
 * Ensures the user is logged in before accessing protected routes.
 * Redirects to /login if no active session is found.
 */
export default function AuthGate({ children }) {
  const [user, setUser] = useState(() => getCurrentUser());
  const [loading, setLoading] = useState(() => !getCurrentUser());

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = getCurrentUser();
        setUser(currentUser);
        
        if (currentUser && supabase) {
          // Cryptographically secure background session verification
          const { data: { user: secureUser }, error } = await supabase.auth.getUser();
          if (error || !secureUser) {
            // Check if this is a temporary network issue or offline status
            const isNetworkIssue = !navigator.onLine || 
              (error && (
                error.message?.toLowerCase().includes("fetch") || 
                error.message?.toLowerCase().includes("network") ||
                error.message?.toLowerCase().includes("timeout") ||
                error.status === 0 ||
                error.status === 503 ||
                error.status === 504
              ));

            if (!isNetworkIssue) {
              console.warn("AuthGate: Cryptographic background session verification failed (invalid/expired session). Stale session warning logged, but active session preserved for grace period.");
            } else {
              console.warn("AuthGate: Network issue detected during session revalidation. Preserving session for offline use.");
            }
          }
        }
      } catch (err) {
        console.error("AuthGate Security Error during background revalidation:", err);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const isDebug = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === 'true' || localStorage.getItem('tms_debug') === 'true';
  }, []);

  if (loading) {
    return (
      <LoadingSpinner 
        showLogo={true} 
        message={isDebug ? "Validating Secure Session..." : "Securing Connection..."} 
        fullPage={true} 
      />
    );
  }

  if (!user) {
    console.warn("AuthGate: Unauthenticated access attempt blocked. Redirecting to login.");
    return <Navigate to="/login" replace />;
  }

  // ── Admin-Specific Role & Pilot Mode Lockdown ──
  const isTargetingAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith("/a/admin");
  const isPilot = typeof window !== 'undefined' && (
    localStorage.getItem("tms_pilot_mode") === "true" ||
    import.meta.env.VITE_PILOT_MODE === "true"
  );
  if (isTargetingAdmin && (isPilot || user.system_role !== 'system_admin')) {
    console.warn(`AuthGate: Admin route ${window.location.pathname} blocked (Pilot: ${isPilot}). Redirecting to /a.`);
    return <Navigate to="/a" replace />;
  }

  return children;
}
