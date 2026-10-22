// src/pages/MisSolicitudesPage.jsx
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { listarMisSolicitudes } from '../services/solicitudService';
import { nombreModalidad } from '../utils/catalogos';
import { haySesion } from '../utils/sesion';
import { theme } from '../styles/theme';

export const MisSolicitudesPage = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const conSesion = haySesion();

  useEffect(() => {
    if (!conSesion) return undefined;
    let vigente = true;
    listarMisSolicitudes()
      .then((d) => vigente && setSolicitudes(d))
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [conSesion]);

  if (!conSesion) return <Navigate to="/login" replace />;

  return (
    <section style={styles.contenedor}>
      <h1 style={styles.titulo}>Mis solicitudes</h1>

      {cargando && <p style={styles.aviso}>Cargando…</p>}
      {!cargando && error && <p style={styles.error} role="alert">{error}</p>}

      {!cargando && !error && solicitudes.length === 0 && (
        <div style={styles.vacio}>
          <p style={styles.vacioTitulo}>Todavía no tiene solicitudes.</p>
          <Link to="/convocatorias" style={styles.enlace}>Ver convocatorias abiertas</Link>
        </div>
      )}

      {!cargando && !error && solicitudes.length > 0 && (
        <ul style={styles.lista}>
          {solicitudes.map((s) => (
            <li key={s.id} style={styles.item}>
              <Link to={`/solicitudes/${s.id}`} style={styles.itemEnlace}>
                <span style={styles.itemTitulo}>
                  Solicitud #{s.id} · {s.tipo ? nombreModalidad(s.tipo) : 'Sin modalidad'}
                </span>
                <span style={styles.estado}>{s.estado}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const styles = {
  contenedor: { width: '100%', maxWidth: '760px', margin: '0 auto', padding: '1rem 0' },
  titulo: { margin: '0 0 1rem', fontSize: '1.5rem', color: theme.colors.secondary },
  aviso: { color: theme.colors.textSecondary },
  error: { color: theme.colors.error },
  vacio: { backgroundColor: theme.colors.cardBg, border: `1px dashed ${theme.colors.border}`, borderRadius: theme.borderRadius.lg, padding: '1.5rem', textAlign: 'center' },
  vacioTitulo: { margin: '0 0 0.5rem', color: theme.colors.secondary, fontWeight: 600 },
  enlace: { color: theme.colors.accent, fontSize: '0.9rem' },
  lista: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  item: { backgroundColor: theme.colors.cardBg, border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.md },
  itemEnlace: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', textDecoration: 'none' },
  itemTitulo: { color: theme.colors.textPrimary, fontWeight: 600, fontSize: '0.92rem' },
  estado: { fontSize: '0.78rem', fontWeight: 600, color: theme.colors.secondary, backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}`, borderRadius: '999px', padding: '0.15rem 0.6rem' },
};
