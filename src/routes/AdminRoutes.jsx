import { Routes, Route } from "react-router-dom";
import MasterAdmin from "../pages/MasterAdmin";
import Admin from "../pages/Admin";
import AdminShops from "../pages/AdminShops";
import AdminPlans from "../pages/AdminPlans";
import AdminSEO from "../pages/AdminSEO";
import AdminReport from "../pages/AdminReport";
import AdminEngineering from "../pages/AdminEngineering";
import AdminGlobalOrders from "../pages/AdminGlobalOrders";
import AdminGlobalProducts from "../pages/AdminGlobalProducts";
import AdminMonitoring from "../pages/AdminMonitoring";
import AdminSecurity from "../pages/AdminSecurity";
import AdminSuppliers from "../pages/AdminSuppliers";
import AdminAnalytics from "../pages/AdminAnalytics";
import AdminPayouts from "../pages/AdminPayouts";
import AdminIndustries from "../pages/AdminIndustries";
import AdminGateway from "../pages/AdminGateway";
import DeveloperPortal from "../pages/DeveloperPortal";
import WholesaleSalesSystem from "../pages/WholesaleSalesSystem";

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MasterAdmin />} />
      <Route path="/ops" element={<Admin />} />
      <Route path="/shops" element={<AdminShops />} />
      <Route path="/plans" element={<AdminPlans />} />
      <Route path="/seo" element={<AdminSEO />} />
      <Route path="/report" element={<AdminReport />} />
      <Route path="/engineering" element={<AdminEngineering />} />
      <Route path="/global-orders" element={<AdminGlobalOrders />} />
      <Route path="/global-products" element={<AdminGlobalProducts />} />
      <Route path="/monitoring" element={<AdminMonitoring />} />
      <Route path="/security" element={<AdminSecurity />} />
      <Route path="/suppliers" element={<AdminSuppliers />} />
      <Route path="/analytics" element={<AdminAnalytics />} />
      <Route path="/payouts" element={<AdminPayouts />} />
      <Route path="/industries" element={<AdminIndustries />} />
      <Route path="/gateway" element={<AdminGateway />} />
      <Route path="/developer/portal" element={<DeveloperPortal />} />
      <Route path="/developer/wholesale" element={<WholesaleSalesSystem />} />
    </Routes>
  );
}
