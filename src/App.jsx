import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';

const Login               = lazy(() => import('./pages/Login'));
const MasterAdmin         = lazy(() => import('./pages/MasterAdmin'));
const Admin               = lazy(() => import('./pages/Admin'));
const AdminShops          = lazy(() => import('./pages/AdminShops'));
const AdminPlans          = lazy(() => import('./pages/AdminPlans'));
const AdminSEO            = lazy(() => import('./pages/AdminSEO'));
const AdminReport         = lazy(() => import('./pages/AdminReport'));
const AdminEngineering    = lazy(() => import('./pages/AdminEngineering'));
const AdminGlobalOrders   = lazy(() => import('./pages/AdminGlobalOrders'));
const AdminGlobalProducts = lazy(() => import('./pages/AdminGlobalProducts'));
const AdminMonitoring     = lazy(() => import('./pages/AdminMonitoring'));
const AdminSecurity       = lazy(() => import('./pages/AdminSecurity'));
const AdminSuppliers      = lazy(() => import('./pages/AdminSuppliers'));
const AdminAnalytics      = lazy(() => import('./pages/AdminAnalytics'));
const AdminPayouts        = lazy(() => import('./pages/AdminPayouts'));
const AdminIndustries     = lazy(() => import('./pages/AdminIndustries'));
const AdminGateway        = lazy(() => import('./pages/AdminGateway'));
const AdminObservatory    = lazy(() => import('./pages/AdminObservatory'));
const AdminReplayDesk     = lazy(() => import('./pages/AdminReplayDesk'));
const AdminUserGuide      = lazy(() => import('./pages/AdminUserGuide'));
const BusinessIntelligence= lazy(() => import('./pages/BusinessIntelligence'));
const DeveloperPortal     = lazy(() => import('./pages/DeveloperPortal'));
const SocialCommerce      = lazy(() => import('./pages/SocialCommerce'));
const PerpetualBridge     = lazy(() => import('./pages/PerpetualBridge'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 text-emerald-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-widest font-mono">Loading TMS Ops Console...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Authentication Gateway */}
        <Route path="/login" element={<Login />} />

        {/* Default redirect to master admin dashboard */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/a/admin" element={<Navigate to="/admin" replace />} />

        {/* Master Admin Hub & Sub-modules */}
        <Route path="/admin" element={<MasterAdmin />} />
        <Route path="/admin/ops" element={<Admin />} />
        <Route path="/admin/shops" element={<AdminShops />} />
        <Route path="/admin/plans" element={<AdminPlans />} />
        <Route path="/admin/seo" element={<AdminSEO />} />
        <Route path="/admin/report" element={<AdminReport />} />
        <Route path="/admin/engineering" element={<AdminEngineering />} />
        <Route path="/admin/global-orders" element={<AdminGlobalOrders />} />
        <Route path="/admin/global-products" element={<AdminGlobalProducts />} />
        <Route path="/admin/monitoring" element={<AdminMonitoring />} />
        <Route path="/admin/security" element={<AdminSecurity />} />
        <Route path="/admin/suppliers" element={<AdminSuppliers />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/payouts" element={<AdminPayouts />} />
        <Route path="/admin/industries" element={<AdminIndustries />} />
        <Route path="/admin/gateway" element={<AdminGateway />} />
        <Route path="/admin/bridge" element={<PerpetualBridge />} />
        <Route path="/bridge" element={<PerpetualBridge />} />
        <Route path="/admin/observatory" element={<AdminObservatory />} />
        <Route path="/observatory" element={<AdminObservatory />} />
        <Route path="/admin/replay" element={<AdminReplayDesk />} />
        <Route path="/replay" element={<AdminReplayDesk />} />
        <Route path="/admin/guide" element={<AdminUserGuide />} />
        <Route path="/admin/intelligence" element={<BusinessIntelligence />} />
        <Route path="/admin/developer" element={<DeveloperPortal />} />
        <Route path="/admin/social" element={<SocialCommerce />} />

        {/* Short aliases for PWA Home Screen Shortcuts */}
        <Route path="/payouts" element={<AdminPayouts />} />
        <Route path="/ops" element={<Admin />} />
        <Route path="/orders" element={<AdminGlobalOrders />} />
        <Route path="/admin/orders" element={<AdminGlobalOrders />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  );
}
