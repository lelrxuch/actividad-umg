// src/pages/EvaluadorPage.jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  listarMisSolicitudes,
  evaluarSolicitud,
  dictaminarSolicitud,
} from '../services/solicitudService';
import { nombreModalidad } from '../utils/catalogos';
import { haySesion } from '../utils/sesion';
import { theme } from '../styles/theme';

export const EvaluadorPage = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [procesandoId, setProcesandoId] = useState(null);
  const [aviso, setAviso] = useState('');

  const cargarSolicitudes = async () => {
    setCargando(true);
    setError('');
    try {
      const data = await listarMisSolicitudes();
      setSolicitudes(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  if (!haySesion()) return <Navigate to="/login" replace />;

  const handleEvaluar = async (id) => {
    setProcesandoId(id);
    setAviso('');
    setError('');
    try {
      await evaluarSolicitud(id);
      setAviso(`Solicitud #${id} pasada a "En Evaluación".`);
      await cargarSolicitudes();
    } catch (e) {
      setError(e.message);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleDictaminar = async (id, aprobado) => {
    setProcesandoId(id);
    setAviso('');
    setError('');
    try {
      await dictaminarSolicitud(id, aprobado);
      setAviso(`Solicitud #${id} dictaminada como ${aprobado ? 'APROBADA' : 'RECHAZADA'}.`);
      await cargarSolicitudes();
    } catch (e) {
      setError(e.message);
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <section style={styles.contenedor}>
      <header style={styles.encabezado}>
        <h1 style={styles.titulo}>Bandeja del Evaluador</h1>
        <p style={styles.subtitulo}>Gestión y dictamen de solicitudes de beca</p>
      </header>

      {aviso && <div style={styles.avisoOk} role="status">{aviso}</div>}
      {error && <div style={styles.avisoError} role="alert">{error}</div>}

      {cargando ? (
        <p style={styles.cargando}>Cargando solicitudes...</p>
      ) : solicitudes.length === 0 ? (
        <p style={styles.vacio}>No hay solicitudes registradas para evaluar.</p>
      ) : (
        <div style={styles.grid}>
          {solicitudes.map((sol) => (
            <div key={sol.id} style={styles.tarjeta}>
              <div style={styles.tarjetaHeader}>
                <span style={styles.solicitudId}>Solicitud #{sol.id}</span>
                <span style={styles.estado} data-estado={sol.estado}>{sol.estado}</span>
              </div>

              <p style={styles.detalleText}>
                <strong>Modalidad:</strong> {nombreModalidad(sol.tipo || 'Beca')}
              </p>
              <p style={styles.detalleText}>
                <strong>Estudiante ID:</strong> {sol.estudiante_id || sol.estudiante}
              </p>

              <div style={styles.acciones}>
                {sol.estado === 'Enviada' && (
                  <button
                    type="button"
                    style={styles.botonEvaluar}
                    disabled={procesandoId === sol.id}
                    onClick={() => handleEvaluar(sol.id)}
                  >
                    {procesandoId === sol.id ? 'Procesando...' : 'Iniciar Evaluación'}
                  </button>
                )}

                {sol.estado === 'En Evaluación' && (
                  <div style={styles.grupoDictamen}>
                    <button
                      type="button"
                      style={styles.botonAprobar}
                      disabled={procesandoId === sol.id}
                      onClick={() => handleDictaminar(sol.id, true)}
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      style={styles.botonRechazar}
                      disabled={procesandoId === sol.id}
                      onClick={() => handleDictaminar(sol.id, false)}
                    >
                      Rechazar
                    </button>
                  </div>
                )}

                {['Borrador', 'Aprobada', 'Rechazada'].includes(sol.estado) && (
                  <span style={styles.textoSinAccion}>Sin acciones pendientes</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const styles = {
  contenedor: { width: '100%', maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem' },
  encabezado: { marginBottom: '1.5rem', borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: '1rem' },
  titulo: { fontSize: '1.6rem', color: theme.colors.primary, margin: 0 },
  subtitulo: { fontSize: '0.9rem', color: theme.colors.textSecondary, margin: '0.3rem 0 0' },
  cargando: { color: theme.colors.textSecondary },
  vacio: { color: theme.colors.textSecondary, fontStyle: 'italic' },
  grid: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  tarjeta: { backgroundColor: theme.colors.cardBg, border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.md, padding: '1.2rem', boxShadow: theme.shadows.card },
  tarjetaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' },
  solicitudId: { fontWeight: '700', fontSize: '1.1rem', color: theme.colors.secondary },
  estado: { padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600', border: `1px solid ${theme.colors.border}`, backgroundColor: theme.colors.background },
  detalleText: { margin: '0.2rem 0', fontSize: '0.9rem', color: theme.colors.textPrimary },
  acciones: { marginTop: '1rem', paddingTop: '0.8rem', borderTop: `1px solid ${theme.colors.border}`, display: 'flex', justifyContent: 'flex-end' },
  botonEvaluar: { backgroundColor: theme.colors.primary, color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: theme.borderRadius.md, cursor: 'pointer', fontWeight: '600' },
  grupoDictamen: { display: 'flex', gap: '0.5rem' },
  botonAprobar: { backgroundColor: theme.colors.success, color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: theme.borderRadius.md, cursor: 'pointer', fontWeight: '600' },
  botonRechazar: { backgroundColor: theme.colors.error, color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: theme.borderRadius.md, cursor: 'pointer', fontWeight: '600' },
  textoSinAccion: { fontSize: '0.85rem', color: theme.colors.textSecondary, fontStyle: 'italic' },
  avisoOk: { padding: '0.75rem', backgroundColor: theme.colors.successBg, color: theme.colors.success, borderRadius: theme.borderRadius.md, marginBottom: '1rem', border: `1px solid ${theme.colors.successBorder}` },
  avisoError: { padding: '0.75rem', backgroundColor: theme.colors.errorBg, color: theme.colors.error, borderRadius: theme.borderRadius.md, marginBottom: '1rem', border: `1px solid ${theme.colors.errorBorder}` },
};