import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import CustomerDashboard from './components/CustomerDashboard';
import DriverDashboard from './components/DriverDashboard';
import AdminDashboard from './components/AdminDashboard';
import './App.css';
import { LogoutModal } from './components/LogoutModal';
import { useState } from 'react';

// Protected Route Guard checking Role compatibility with role-specific keys
function RoleProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole: string }) {
  const token = localStorage.getItem(`${allowedRole}_auth_token`);
  const user = JSON.parse(localStorage.getItem(`${allowedRole}_auth_user`) || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to="/login" replace />;
  }

  // Prevent drivers without vehicle details from entering dashboard
  if (allowedRole === 'driver') {
    const vehicle = user.driver_detail;
    if (!vehicle || !vehicle.license_number || !vehicle.vehicle_model || !vehicle.vehicle_plate_number) {
      localStorage.removeItem('driver_auth_token');
      localStorage.removeItem('driver_auth_user');
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}

// (will be inserted inside App component) placeholder

function App() {
  const [logoutInfo, setLogoutInfo] = useState<{ role: 'customer' | 'driver' | 'admin'; user: any } | null>(null);
  const getUser = (role: string) => JSON.parse(localStorage.getItem(`${role}_auth_user`) || '{}');

  const handleLogout = (role: 'customer' | 'driver' | 'admin') => {
    const user = getUser(role);
    setLogoutInfo({ role, user });
  };

  const confirmLogout = () => {
    if (!logoutInfo) return;
    const { role } = logoutInfo;
    localStorage.removeItem(`${role}_auth_token`);
    localStorage.removeItem(`${role}_auth_user`);
    if (role === 'driver') {
      localStorage.removeItem('driver_is_online');
    }
    setLogoutInfo(null);
    window.location.href = '/login';
  };

  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Customer Portal */}
          <Route
            path="/customer"
            element={
              <RoleProtectedRoute allowedRole="customer">
                <CustomerDashboard user={getUser('customer')} onLogout={() => handleLogout('customer')} />
              </RoleProtectedRoute>
            }
          />

          {/* Driver Portal */}
          <Route
            path="/driver"
            element={
              <RoleProtectedRoute allowedRole="driver">
                <DriverDashboard user={getUser('driver')} onLogout={() => handleLogout('driver')} />
              </RoleProtectedRoute>
            }
          />

          {/* Admin Control Center */}
          <Route
            path="/admin"
            element={
              <RoleProtectedRoute allowedRole="admin">
                <AdminDashboard user={getUser('admin')} onLogout={() => handleLogout('admin')} />
              </RoleProtectedRoute>
            }
          />

          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      {logoutInfo && (
        <LogoutModal
          isOpen={true}
          onClose={() => setLogoutInfo(null)}
          onConfirm={confirmLogout}
          userName={logoutInfo.user?.name || ''}
          role={logoutInfo.role}
        />
      )}
    </>
  );
}

export default App;
