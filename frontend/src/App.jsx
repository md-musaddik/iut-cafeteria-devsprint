import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }  from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute, GuestRoute } from './routes/ProtectedRoute';

import LoginPage        from './pages/LoginPage';
import AdminLoginPage   from './pages/AdminLoginPage';
import DashboardPage    from './pages/DashboardPage';
import { MenuPage, MealOrderPage } from './pages/MenuPage';
import OrderStatusPage  from './pages/OrderStatusPage';
import MyOrdersPage     from './pages/MyOrdersPage';
import AccountPage      from './pages/AccountPage';
import AdminDashboard   from './pages/AdminDashboard';
import InventoryPage    from './pages/InventoryPage';
import AdminOrdersPage  from './pages/AdminOrdersPage';
import AdminStudentsPage from './pages/AdminStudentsPage';
import MetricsPage      from './pages/MetricsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/login"        element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/admin/login"  element={<GuestRoute><AdminLoginPage /></GuestRoute>} />

            {/* Student */}
            <Route path="/dashboard"        element={<ProtectedRoute requiredRole="student"><DashboardPage /></ProtectedRoute>} />
            <Route path="/menu"             element={<ProtectedRoute requiredRole="student"><MenuPage /></ProtectedRoute>} />
            <Route path="/menu/:category"   element={<ProtectedRoute requiredRole="student"><MealOrderPage /></ProtectedRoute>} />
            <Route path="/order/:orderId"   element={<ProtectedRoute requiredRole="student"><OrderStatusPage /></ProtectedRoute>} />
            <Route path="/orders"           element={<ProtectedRoute requiredRole="student"><MyOrdersPage /></ProtectedRoute>} />
            <Route path="/account"          element={<ProtectedRoute requiredRole="student"><AccountPage /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin/dashboard"  element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/inventory"  element={<ProtectedRoute requiredRole="admin"><InventoryPage /></ProtectedRoute>} />
            <Route path="/admin/orders"     element={<ProtectedRoute requiredRole="admin"><AdminOrdersPage /></ProtectedRoute>} />
            <Route path="/admin/students"   element={<ProtectedRoute requiredRole="admin"><AdminStudentsPage /></ProtectedRoute>} />
            <Route path="/admin/metrics"    element={<ProtectedRoute requiredRole="admin"><MetricsPage /></ProtectedRoute>} />

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
