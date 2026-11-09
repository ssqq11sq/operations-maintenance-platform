import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import AppLayout from './layout/AppLayout';
import LoginPage from './pages/LoginPage';
import TeamsPage from './pages/TeamsPage';
import MembersPage from './pages/MembersPage';
import TemplatesPage from './pages/TemplatesPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import PhotosPage from './pages/PhotosPage';
import StatsPage from './pages/StatsPage';
import RoutesPage from './pages/RoutesPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';
import OvertimePage from './pages/OvertimePage';
import { GlobalRole } from '@omp/shared';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole(GlobalRole.SUPER_ADMIN)) {
    return <Navigate to="/photos" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole(GlobalRole.ADMIN, GlobalRole.SUPER_ADMIN)) {
    return <Navigate to="/photos" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/photos" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="photos" element={<PhotosPage />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="work-orders" element={<WorkOrdersPage />} />
          <Route path="overtimes" element={<OvertimePage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route
            path="audit"
            element={
              <AdminRoute>
                <AuditPage />
              </AdminRoute>
            }
          />
          <Route
            path="users"
            element={
              <SuperAdminRoute>
                <UsersPage />
              </SuperAdminRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
