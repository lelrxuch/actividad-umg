// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ConvocatoriasPage } from './pages/ConvocatoriasPage';
import { SolicitudPage } from './pages/SolicitudPage';
import { MisSolicitudesPage } from './pages/MisSolicitudesPage';
import { EvaluadorPage } from './pages/EvaluadorPage';
import { AsignacionEvaluadoresPage } from './pages/AsignacionEvaluadoresPage';
import { MisNotificacionesPage } from './pages/MisNotificacionesPage';
import { AuditoriaPage } from './pages/AuditoriaPage';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Envoltorio General con Navbar y Footer */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/convocatorias" element={<ConvocatoriasPage />} />
          <Route path="/solicitudes" element={<MisSolicitudesPage />} />
          <Route path="/solicitudes/:id" element={<SolicitudPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/evaluador" element={<EvaluadorPage />} />
          <Route path="/admin/asignaciones" element={<AsignacionEvaluadoresPage />} />
          <Route path="/notificaciones" element={<MisNotificacionesPage />} />
          <Route path="/admin/auditoria" element={<AuditoriaPage />} />
        </Route>
      </Routes>
    </Router>
  );
}