// src/pages/AsignacionEvaluadoresPage.jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { listarAsignadas, asignarEvaluador } from '../services/solicitudService';
import { listarEvaluadores } from '../services/usuarioService';
import { nombreModalidad } from '../utils/catalogos';
import { haySesion } from '../utils/sesion';
import { theme } from '../styles/theme';

function obtenerRolUsuario() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return (user.rol || '').toLowerCase();
  } catch {
    return '';
  }
}

export const AsignacionEvaluadoresPage = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [evaluadores, setEvaluadores] = useState([]);
  const [seleccionados, setSeleccionados] = useState({});
  const [cargando, setCargando] = useState(true);
  const [errorGlobal, setErrorGlobal] = useState('');
  const [mensajesId, setMensajesId] = useState({});
  const [procesandoId, setProcesandoId] = useState(null);

  const rol = obtenerRolUsuario();
  const esAdmin = ['administrador', 'admin'].includes(rol);

  useEffect(() => {
    let vigente = true;

    Promise.all([listarAsignadas(), listarEvaluadores()])
      .then(([datosSolicitudes, datosEvaluadores]) => {
        if (vigente) {
          setSolicitudes(datosSolicitudes);
          setEvaluadores(datosEvaluadores);
        }
      })
      .catch((e) => {
        if (vigente) setErrorGlobal(e.message);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  if (!haySesion()) return <Navigate to="/login" replace />;
  if (!esAdmin) return <Navigate to="/dashboard" replace />;

  const handleSelectChange = (solicitudId, valor) => {
    setSeleccionados((prev) => ({ ...prev, [solicitudId]: valor }));
  };

  const handleAsignar = async (solicitudId) => {
    const evaluadorId = Number(seleccionados[solicitudId]);
    if (!evaluadorId) {
      setMensajesId((prev) => ({
        ...prev,
        [solicitudId]: { tipo: 'error', texto: 'Seleccione un evaluador' },
      }));
      return;
    }

    setProcesandoId(solicitudId);
    setMensajesId((prev) => ({ ...prev, [solicitudId]: null }));

    try {
      await asignarEvaluador(solicitudId, evaluadorId);
      const ev = evaluadores.find((e) => Number(e.id) === evaluadorId);
      const nombreEv = ev ? ev.nombre : `ID ${evaluadorId}`;

      setMensajesId((prev) => ({
        ...prev,
        [solicitudId]: {
          tipo: 'exito',
          texto: `Evaluador ${nombreEv} asignado correctamente.`,
        },
      }));

      const listaActualizada = await listarAsignadas();
      setSolicitudes(listaActualizada);
    } catch (e) {
      setMensajesId((prev) => ({
        ...prev,
        [solicitudId]: { tipo: 'error', texto: e.message },
      }));
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <section style={styles.contenedor}>
      <header style={styles.encabezado}>
        <h1 style={styles.titulo}>Asignación de Evaluadores</h1>
        <p style={styles.subtitulo}>Gestión de solicitudes para revisión técnica</p>
      </header>

      {errorGlobal && <div style={styles.avisoError} role="alert">{errorGlobal}</div>}

      {cargando ? (
        <p style={styles.cargando}>Cargando datos...</p>
      ) : solicitudes.length === 0 ? (
        <p style={styles.vacio}>No hay solicitudes pendientes de asignación.</p>
      ) : (
        <div style={styles.grid}>
          {solicitudes.map((sol) => {
            const mensaje = mensajesId[sol.id];
            return (
              <div key={sol.id} style={styles.tarjeta}>
                <div style={styles.tarjetaHeader}>
                  <span style={styles.solicitudId}>Solicitud #{sol.id}</span>
                  <span style={styles.estado}>{sol.estado}</span>
                </div>

                <p style={styles.detalleText}>
                  <strong>Modalidad:</strong> {nombreModalidad(sol.tipo || 'Beca')}
                </p>

                {mensaje && (
                  <div
                    style={mensaje.tipo === 'exito' ? styles.avisoOk : styles.avisoErrorCard}
                    role={mensaje.tipo === 'exito' ? 'status' : 'alert'}
                  >
                    {mensaje.texto}
                  </div>
                )}

                <div style={styles.controles}>
                  <select
                    style={styles.select}
                    value={seleccionados[sol.id] || ''}
                    onChange={(e) => handleSelectChange(sol.id, e.target.value)}
                  >
                    <option value="">-- Seleccionar evaluador --</option>
                    {evaluadores.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.nombre} ({ev.email})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    style={styles.botonAsignar}
                    disabled={procesandoId === sol.id}
                    onClick={() => handleAsignar(sol.id)}
                  >
                    {procesandoId === sol.id ? 'Asignando...' : 'Asignar'}
                  </button>
                </div>
              </div>
            );
          })}
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
  detalleText: { margin: '0.2rem 0 0.8rem', fontSize: '0.9rem', color: theme.colors.textPrimary },
  controles: { display: 'flex', gap: '0.5rem', marginTop: '0.8rem' },
  select: { flex: 1, padding: '0.5rem', borderRadius: theme.borderRadius.sm, border: `1px solid ${theme.colors.border}`, fontSize: '0.9rem' },
  botonAsignar: { backgroundColor: theme.colors.primary, color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: theme.borderRadius.md, cursor: 'pointer', fontWeight: '600' },
  avisoOk: { padding: '0.5rem', backgroundColor: theme.colors.successBg, color: theme.colors.success, borderRadius: theme.borderRadius.sm, marginBottom: '0.5rem', fontSize: '0.85rem' },
  avisoErrorCard: { padding: '0.5rem', backgroundColor: theme.colors.errorBg, color: theme.colors.error, borderRadius: theme.borderRadius.sm, marginBottom: '0.5rem', fontSize: '0.85rem' },
  avisoError: { padding: '0.75rem', backgroundColor: theme.colors.errorBg, color: theme.colors.error, borderRadius: theme.borderRadius.md, marginBottom: '1rem', border: `1px solid ${theme.colors.errorBorder}` },
};