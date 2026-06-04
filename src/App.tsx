import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { RequireAuth, RequireAdmin } from './components/RouteGuards';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import AddProjectPage from './pages/AddProjectPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import AdminWorkersPage from './pages/AdminWorkersPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Signed-in users (workers see only their assigned projects via RLS) */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <MapPage />
              </RequireAuth>
            }
          />
          <Route
            path="/project/:id"
            element={
              <RequireAuth>
                <ProjectDetailPage />
              </RequireAuth>
            }
          />

          {/* Admin-only */}
          <Route
            path="/add"
            element={
              <RequireAdmin>
                <AddProjectPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/workers"
            element={
              <RequireAdmin>
                <AdminWorkersPage />
              </RequireAdmin>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
