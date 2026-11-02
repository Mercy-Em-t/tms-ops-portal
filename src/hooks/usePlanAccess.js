import { useState, useEffect, useCallback } from "react";
import { getCurrentUser } from "../services/auth-service";
import { getSubscription } from "../services/subscription-service";
import { supabase } from "../services/supabase-client";
import { useConfig } from "../services/config-service";

export default function usePlanAccess() {
  const [access, setAccess] = useState({
    isFree: true,
    isBasic: false,
    isPro: false,
    isBusiness: false,
    isEnterprise: false,
    isSystemAdmin: false,
    planId: "free",
    loading: true
  });

  const checkPlan = useCallback(async () => {
    const user = getCurrentUser();

    if (!user) {
      setAccess(prev => ({ ...prev, loading: false }));
      return;
    }

    // Check if Pilot Mode is active
    const isPilot = typeof window !== 'undefined' && (
      localStorage.getItem("tms_pilot_mode") === "true" || 
      import.meta.env.VITE_PILOT_MODE === "true"
    );

    // Pilot Mode or System Admins bypass all locks and limits
    if (isPilot || user.system_role === "system_admin") {
      setAccess({
        isFree: true, 
        isBasic: true, 
        isPro: true,
        isBusiness: true, 
        isEnterprise: true,
        isSystemAdmin: user.system_role === "system_admin", 
        planId: "business", 
        loading: false
      });
      return;
    }

    try {
      // Primary: read shops.plan directly (AdminShops writes here)
      const { data: shopData } = await supabase
        .from("shops")
        .select("plan")
        .eq("shop_id", user.shop_id)
        .single();

      let planId = shopData?.plan?.toLowerCase() || null;

      // Fallback: check subscriptions table (plan_type column)
      if (!planId || planId === "free") {
        const sub = await getSubscription(user.shop_id);
        if (sub?.plan_type) {
          planId = sub.plan_type.toLowerCase();
        }
      }

      planId = planId || "free";

      setAccess({
        isFree: true,
        isBasic: ["basic", "pro", "business", "enterprise"].includes(planId),
        isPro:   ["pro", "business", "enterprise"].includes(planId),
        isBusiness: ["business", "enterprise"].includes(planId),
        isEnterprise: planId === "enterprise",
        isSystemAdmin: false,
        planId,
        loading: false
      });
    } catch (err) {
      console.warn("Failed to verify plan access, defaulting to free", err);
      setAccess(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkPlan();

    // Re-check whenever the tab comes back into focus (catches admin upgrades)
    const onFocus = () => checkPlan();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkPlan]);

  const { isFeatureEnabled } = useConfig();
  return { ...access, isFeatureEnabled };
}
