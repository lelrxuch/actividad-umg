// src/pages/MisNotificacionesPage.jsx
//
// Canal de notificación dentro de la aplicación: cada cambio de estado de una
// solicitud del estudiante le deja aquí un aviso. El backend decide a quién va
// cada aviso; esta pantalla solo muestra los del usuario en sesión.
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { listarMisNotificaciones, marcarNotificacionLeida } from '../services/notificacionService';
import { haySesion } from '../utils/sesion';
import { theme } from '../styles/theme';

/** Fecha y hora legibles; cadena vacía si no se puede interpretar. */
function fechaYHora(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
}

export const MisNotificacionesPage = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const conSesion = haySesion();

  useEffect(() => {
    if (!conSesion) return undefined;
    let vigente = true;
    listarMisNotificaciones()
      .then((datos) => vigente && setNotificaciones(datos.notificaciones))
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [conSesion]);

  if (!conSesion) return <Navigate to="/login" replace />;

  const noLeidas = notificaciones.filter((n) => !n.leidaEn).length;

  const marcarLeida = async (id) => {
    setError('');
    try {
      const actualizada = await marcarNotificacionLeida(id);
      setNotificaciones((lista) =>
        lista.map((n) => (n.id === id ? { ...n, leidaEn: actualizada?.leidaEn ?? new Date().toISOString() } : n))
      );
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section style={styles.contenedor}>
      <h1 style={styles.titulo}>Mis notificaciones</h1>
      {!cargando && !error && notificaciones.length > 0 && (
        <p style={styles.resumen}>
          {noLeidas === 0 ? 'Todas leídas.' : `${noLeidas} sin leer.`}
        </p>
      )}

      {cargando && <p style={styles.aviso}>Cargando…</p>}
      {error && <p style={styles.error} role="alert">{error}</p>}

      {!cargando && !error && notificaciones.length === 0 && (
        <div style={styles.vacio}>
          <p style={styles.vacioTitulo}>No tiene notificaciones.</p>
          <p style={styles.aviso}>Aquí verá un aviso cada vez que una de sus solicitudes cambie de estado.</p>
        </div>
      )}

      {!cargando && notificaciones.length > 0 && (
        <ul style={styles.lista}>
          {notificaciones.map((n) => (
            <li key={n.id} style={n.leidaEn ? styles.item : styles.itemNuevo}>
              <div style={styles.cuerpo}>
                <p style={styles.mensaje}>
                  {!n.leidaEn && <span style={styles.nueva}>Nueva</span>}
                  {n.mensaje}
                </p>
                <p style={styles.detalle}>
                  <Link to={`/solicitudes/${n.solicitudId}`} style={styles.enlace}>
                    Solicitud #{n.solicitudId}
                  </Link>
                  {' · '}
                  {fechaYHora(n.creadoEn)}
                </p>
              </div>
              {!n.leidaEn && (
                <button type="button" style={styles.boton} onClick={() => marcarLeida(n.id)}>
                  Marcar como leída
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const styles = {
  contenedor: { width: '100%', maxWidth: '760px', margin: '0 auto', padding: '1rem 0' },
  titulo: { margin: '0 0 0.25rem', fontSize: '1.5rem', color: theme.colors.secondary },
  resumen: { margin: '0 0 1rem', color: theme.colors.textSecondary, fontSize: '0.9rem' },
  aviso: { color: theme.colors.textSecondary, margin: 0 },
  error: { color: theme.colors.error },
  vacio: { backgroundColor: theme.colors.cardBg, border: `1px dashed ${theme.colors.border}`, borderRadius: theme.borderRadius.lg, padding: '1.5rem', textAlign: 'center' },
  vacioTitulo: { margin: '0 0 0.5rem', color: theme.colors.secondary, fontWeight: 600 },
  lista: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  item: { display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.cardBg, border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.md, padding: '0.85rem 1rem' },
  itemNuevo: { display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.cardBg, border: `1px solid ${theme.colors.primary}`, borderRadius: theme.borderRadius.md, padding: '0.85rem 1rem' },
  cuerpo: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  mensaje: { margin: 0, color: theme.colors.textPrimary, fontSize: '0.95rem' },
  nueva: { display: 'inline-block', marginRight: '0.5rem', fontSize: '0.72rem', fontWeight: 700, color: '#ffffff', backgroundColor: theme.colors.primary, borderRadius: '999px', padding: '0.1rem 0.5rem' },
  detalle: { margin: 0, color: theme.colors.textSecondary, fontSize: '0.82rem' },
  enlace: { color: theme.colors.accent, fontWeight: 600 },
  boton: { flexShrink: 0, backgroundColor: 'transparent', border: `1px solid ${theme.colors.primary}`, color: theme.colors.primary, borderRadius: theme.borderRadius.sm, padding: '0.35rem 0.7rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' },
};
