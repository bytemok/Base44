import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Pedidos from '@/pages/Pedidos';
import Dashboard from '@/pages/Dashboard';
import Ventas from '@/pages/Ventas';
import PuntoVenta from '@/pages/PuntoVenta';
import Clientes from '@/pages/Clientes';
import Productos from '@/pages/Productos';
import PedidosCoordinar from '@/pages/PedidosCoordinar';
import CalendarioEntregas from '@/pages/CalendarioEntregas';
import Recepciones from '@/pages/Recepciones';
import PedidosEnviados from '@/pages/PedidosEnviados';
import ProductosStock from '@/pages/ProductosStock';
import Variantes from '@/pages/Variantes';
import StockDisponible from '@/pages/StockDisponible';
import ControlStock from '@/pages/ControlStock';
import PickInPickOut from '@/pages/PickInPickOut';
import Facturas from '@/pages/Facturas';
import RegistroLogistico from '@/pages/RegistroLogistico';
import Compras from '@/pages/Compras';
import HojasRuta from '@/pages/HojasRuta';
import ReporteSatisfaccion from '@/pages/ReporteSatisfaccion';
import GestionZonas from '@/pages/GestionZonas';
import AlertasStock from '@/pages/AlertasStock';
import Reportes from '@/pages/Reportes';
import ReporteZonas from '@/pages/ReporteZonas';
import ReporteEntregas from '@/pages/ReporteEntregas';
import Etiquetas from '@/pages/Etiquetas';
import Perfil from '@/pages/Perfil';
import AuditoriaSeguridad from '@/pages/AuditoriaSeguridad';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import VendedorPanel from '@/pages/VendedorPanel';
import ErpLayout from '@/components/erp/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import VendedorRouteGuard from '@/components/erp/VendedorRouteGuard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // auth_required u otros: seguimos al router, que muestra la página /login propia
  }

  // Render the main app
  return (
    <Routes>
      {/* Add your page Route elements here */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<VendedorRouteGuard />}>
          <Route path="/etiquetas" element={<Etiquetas />} />
          <Route element={<ErpLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vendedor" element={<VendedorPanel />} />
            <Route path="/vendedor/nueva-venta" element={<VendedorPanel />} />
            <Route path="/vendedor/stock" element={<VendedorPanel />} />
            <Route path="/vendedor/senas" element={<VendedorPanel />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/punto-venta" element={<PuntoVenta />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/coordinar" element={<PedidosCoordinar />} />
          <Route path="/calendario" element={<CalendarioEntregas />} />
          <Route path="/recepciones" element={<Recepciones />} />
          <Route path="/enviados" element={<PedidosEnviados />} />
          <Route path="/inventario" element={<ProductosStock />} />
          <Route path="/variantes" element={<Variantes />} />
          <Route path="/stock-disponible" element={<StockDisponible />} />
          <Route path="/control-stock" element={<ControlStock />} />
          <Route path="/pick" element={<PickInPickOut />} />
          <Route path="/facturas" element={<Facturas />} />
          <Route path="/registro-logistico" element={<RegistroLogistico />} />
          <Route path="/reporte-satisfaccion" element={<ReporteSatisfaccion />} />
          <Route path="/gestion-zonas" element={<GestionZonas />} />
          <Route path="/alertas-stock" element={<AlertasStock />} />
          <Route path="/auditoria" element={<AuditoriaSeguridad />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/reporte-zonas" element={<ReporteZonas />} />
          <Route path="/reporte-entregas" element={<ReporteEntregas />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/hojas-ruta" element={<HojasRuta />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  useEffect(() => {
    const stored = localStorage.getItem("tema");
    const root = document.documentElement;
    let dark;
    if (stored === "oscuro") dark = true;
    else if (stored === "claro") dark = false;
    else dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App