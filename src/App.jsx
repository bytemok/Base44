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
import Clientes from '@/pages/Clientes';
import Productos from '@/pages/Productos';
import PedidosCoordinar from '@/pages/PedidosCoordinar';
import CalendarioEntregas from '@/pages/CalendarioEntregas';
import Recepciones from '@/pages/Recepciones';
import PedidosEnviados from '@/pages/PedidosEnviados';
import Inventario from '@/pages/Inventario';
import Facturas from '@/pages/Facturas';
import ErpLayout from '@/components/erp/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

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
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Add your page Route elements here */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<ErpLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/coordinar" element={<PedidosCoordinar />} />
          <Route path="/calendario" element={<CalendarioEntregas />} />
          <Route path="/recepciones" element={<Recepciones />} />
          <Route path="/enviados" element={<PedidosEnviados />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/facturas" element={<Facturas />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

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