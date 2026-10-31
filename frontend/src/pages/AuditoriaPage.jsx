// src/pages/AuditoriaPage.jsx
//
// Bitácora de auditoría para el administrador: quién hizo qué, sobre qué
// solicitud, cuándo y qué dato cambió. Quién puede verla lo decide el backend
// (403 para cualquier otro rol); esta pantalla muestra su mensaje.
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { listarAuditoria } from '../services/auditoriaService';
import { OPERACION, describirDetalle } from '../utils/auditoria';
import { haySesion } from '../utils/sesion';
import { theme } from '../styles/theme';

function fechaYHora(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'medium' });
}

export const AuditoriaPage = () => {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');
  /** El filtro aplicado: cambiarlo dispara la consulta. */
  const [consulta, setConsulta] = useState({ solicitudId: '' });
  const conSesion = haySesion();

  useEffect(() => {
    if (!conSesion) return undefined;
    let vigente = true;
    listarAuditoria({ solicitudId: consulta.solicitudId || undefined })
      .then((datos) => {
        if (!vigente) return;
        setRegistros(datos);
        setError('');
      })
      .catch((e) => {
        if (!vigente) return;
        setRegistros([]);
        setError(e.message);
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [conSesion, consulta]);

  if (!conSesion) return <Navigate to="/login" replace />;

  const buscar = (evento) => {
    evento.preventDefault();
    setCargando(true);
    setConsulta({ solicitudId: filtro.trim() });
  };

  return (
    <section style={styles.contenedor}>
      <h1 style={styles.titulo}>Auditoría</h1>
      <p style={styles.subtitulo}>
        Operaciones relevantes, de la más reciente a la más vieja. Los registros no se pueden modificar ni borrar.
      </p>

      <form onSubmit={buscar} style={styles.filtro}>
        <label htmlFor="filtro-solicitud" style={styles.etiqueta}>Solicitud #</label>
        <input
          id="filtro-solicitud"
          type="number"
          min="1"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.boton}>Filtrar</button>
      </form>

      {error && <p style={styles.error} role="alert">{error}</p>}
      {cargando ? (
        <p style={styles.aviso}>Cargando…</p>
      ) : !error && registros.length === 0 ? (
        <p style={styles.aviso}>No hay registros.</p>
      ) : (
        registros.length > 0 && (
          <div style={styles.tablaCaja}>
            <table style={styles.tabla}>
              <thead>
                <tr>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Usuario</th>
                  <th style={styles.th}>Operación</th>
                  <th style={styles.th}>Solicitud</th>
                  <th style={styles.th}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id}>
                    <td style={styles.td}>{fechaYHora(r.creadoEn)}</td>
                    <td style={styles.td}>
                      {r.usuarioNombre} <span style={styles.rol}>{r.usuarioRol}</span>
                    </td>
                    <td style={styles.td}>{OPERACION[r.operacion] ?? r.operacion}</td>
                    <td style={styles.td}>
                      {r.solicitudId ? <Link to={`/solicitudes/${r.solicitudId}`} style={styles.enlace}>#{r.solicitudId}</Link> : '—'}
                    </td>
                    <td style={styles.td}>{describirDetalle(r.operacion, r.detalle)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  );
};

const styles = {
  contenedor: { width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '1rem 0' },
  titulo: { margin: 0, fontSize: '1.5rem', color: theme.colors.secondary },
  subtitulo: { margin: '0.3rem 0 1rem', color: theme.colors.textSecondary, fontSize: '0.9rem' },
  filtro: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' },
  etiqueta: { fontSize: '0.88rem', fontWeight: 600, color: theme.colors.textPrimary },
  input: { width: '110px', padding: '0.45rem 0.6rem', border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.md },
  boton: { backgroundColor: theme.colors.primary, color: '#fff', border: 'none', borderRadius: theme.borderRadius.md, padding: '0.45rem 1rem', fontWeight: 600, cursor: 'pointer' },
  aviso: { color: theme.colors.textSecondary },
  error: { color: theme.colors.error, backgroundColor: theme.colors.errorBg, border: `1px solid ${theme.colors.errorBorder}`, borderRadius: theme.borderRadius.md, padding: '0.7rem 1rem' },
  tablaCaja: { overflowX: 'auto', backgroundColor: theme.colors.cardBg, border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.md },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' },
  th: { textAlign: 'left', padding: '0.6rem 0.8rem', borderBottom: `1px solid ${theme.colors.border}`, color: theme.colors.secondary, whiteSpace: 'nowrap' },
  td: { padding: '0.55rem 0.8rem', borderBottom: `1px solid ${theme.colors.border}`, color: theme.colors.textPrimary, verticalAlign: 'top' },
  rol: { fontSize: '0.75rem', color: theme.colors.textSecondary },
  enlace: { color: theme.colors.accent, textDecoration: 'none' },
};
