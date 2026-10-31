// src/pages/DashboardPage.jsx
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { theme } from '../styles/theme';

function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch {
    return null;
  }
}

export const DashboardPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const usuario = leerUsuario();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  const rolNormalizado = (usuario?.rol || '').toLowerCase();
  const esEvaluadorOAdmin = ['evaluador', 'administrador', 'admin'].includes(rolNormalizado);
  const esAutorizador = rolNormalizado === 'autorizador';
  const esAdmin = ['administrador', 'admin'].includes(rolNormalizado);

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Bienvenido{usuario?.nombre ? `, ${usuario.nombre}` : ''}</h2>
      {usuario?.email && <p style={styles.text}>{usuario.email}</p>}
      {usuario?.rol && <p style={styles.text}>Rol: {usuario.rol}</p>}

      <div style={styles.links}>
        <Link to="/convocatorias" style={styles.link}>Convocatorias abiertas</Link>
        <Link to="/solicitudes" style={styles.link}>Mis solicitudes</Link>
        <Link to="/notificaciones" style={styles.link}>Mis notificaciones</Link>
        {esEvaluadorOAdmin && (
          <Link to="/evaluador" style={styles.link}>Bandeja del evaluador</Link>
        )}
        {esAutorizador && (
          <Link to="/evaluador" style={styles.link}>Solicitudes por autorizar</Link>
        )}
        {esAdmin && (
          <Link to="/admin/asignaciones" style={styles.link}>Asignar evaluadores</Link>
        )}
        {esAdmin && (
          <Link to="/admin/auditoria" style={styles.link}>Auditoría</Link>
        )}
      </div>

      <button type="button" onClick={handleLogout} style={styles.button}>
        Cerrar sesión
      </button>
    </div>
  );
};

const styles = {
  card: { backgroundColor: theme.colors.cardBg, padding: '2.5rem', borderRadius: theme.borderRadius.lg, boxShadow: theme.shadows.card, width: '100%', maxWidth: '420px', borderTop: `6px solid ${theme.colors.primary}`, textAlign: 'center' },
  title: { fontSize: '1.4rem', color: theme.colors.secondary, fontWeight: 'bold', margin: '0 0 0.5rem 0' },
  links: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.25rem' },
  link: { color: theme.colors.accent, fontWeight: 600, fontSize: '0.92rem' },
  text: { fontSize: '0.9rem', color: theme.colors.textSecondary, margin: '0.25rem 0' },
  button: { width: '100%', padding: '0.85rem', backgroundColor: theme.colors.primary, color: '#ffffff', border: 'none', borderRadius: theme.borderRadius.md, fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', marginTop: '1.5rem' }
};