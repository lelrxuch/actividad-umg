// src/pages/EvaluadorPage.jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  listarAsignadas,
  evaluarSolicitud,
  dictaminarSolicitud,
  autorizarSolicitud,
} from '../services/solicitudService';
import {
  listarDocumentosPorSolicitud,
  descargarDocumento,
} from '../services/documentoService';
import { nombreDocumento, nombreModalidad } from '../utils/catalogos';
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

export const EvaluadorPage = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [procesandoId, setProcesandoId] = useState(null);
  const [aviso, setAviso] = useState('');

  const rol = obtenerRolUsuario();
  const esAdmin = ['administrador', 'admin'].includes(rol);
  const esAutorizador = rol === 'autorizador';

  const recargarLista = async () => {
    try {
      const data = await listarAsignadas();
      setSolicitudes(data);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    let vigente = true;
    listarAsignadas()
      .then((data) => {
        if (vigente) setSolicitudes(data);
      })
      .catch((e) => {
        if (vigente) setError(e.message);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  if (!haySesion()) return <Navigate to="/login" replace />;

  const handleEvaluar = async (id) => {
    setProcesandoId(id);
    setAviso('');
    setError('');
    try {
      await evaluarSolicitud(id);
      setAviso(`Solicitud #${id} pasada a "En Evaluación".`);
      await recargarLista();
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
      const resultado = await dictaminarSolicitud(id, aprobado);
      // Si supera Q10,000, aprobar no la deja Aprobada: el backend responde
      // "Pendiente de Autorización". Se muestra lo que él dice.
      setAviso(`Solicitud #${id}: ${resultado?.estado ?? (aprobado ? 'Aprobada' : 'Rechazada')}.`);
      await recargarLista();
    } catch (e) {
      setError(e.message);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleAutorizar = async (id, aprobado) => {
    setProcesandoId(id);
    setAviso('');
    setError('');
    try {
      const resultado = await autorizarSolicitud(id, aprobado);
      setAviso(`Solicitud #${id}: ${resultado?.estado ?? (aprobado ? 'Aprobada' : 'Rechazada')}.`);
      await recargarLista();
    } catch (e) {
      setError(e.message);
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <section style={styles.contenedor}>
      <header style={styles.encabezado}>
        <h1 style={styles.titulo}>{esAutorizador ? 'Bandeja de autorización' : 'Bandeja del Evaluador'}</h1>
        <p style={styles.subtitulo}>
          {esAutorizador
            ? 'Solicitudes de más de Q10,000 que el evaluador ya aprobó y esperan su autorización'
            : 'Gestión y dictamen de solicitudes de beca'}
        </p>
      </header>

      {aviso && <div style={styles.avisoOk} role="status">{aviso}</div>}
      {error && <div style={styles.avisoError} role="alert">{error}</div>}

      {cargando ? (
        <p style={styles.cargando}>Cargando solicitudes...</p>
      ) : solicitudes.length === 0 ? (
        <p style={styles.vacio}>No hay solicitudes asignadas para evaluar.</p>
      ) : (
        <div style={styles.grid}>
          {solicitudes.map((sol) => {
            const acciones = sol.accionesPermitidas ?? [];
            const puedeEvaluar = !esAdmin && acciones.includes('evaluar');
            const puedeDictaminar = !esAdmin && acciones.includes('dictaminar');
            const puedeAutorizar = esAutorizador && acciones.includes('autorizar');

            return (
              <TarjetaSolicitud
                key={sol.id}
                solicitud={sol}
                puedeEvaluar={puedeEvaluar}
                puedeDictaminar={puedeDictaminar}
                puedeAutorizar={puedeAutorizar}
                procesando={procesandoId === sol.id}
                onEvaluar={handleEvaluar}
                onDictaminar={handleDictaminar}
                onAutorizar={handleAutorizar}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};

/** Tarjeta individual que gestiona la carga de sus propios documentos */
const TarjetaSolicitud = ({
  solicitud,
  puedeEvaluar,
  puedeDictaminar,
  puedeAutorizar,
  procesando,
  onEvaluar,
  onDictaminar,
  onAutorizar,
}) => {
  const [documentos, setDocumentos] = useState([]);
  const [cargandoDocs, setCargandoDocs] = useState(true);
  const [errorDocs, setErrorDocs] = useState('');
  const [descargandoId, setDescargandoId] = useState(null);

  useEffect(() => {
    let vigente = true;
    listarDocumentosPorSolicitud(solicitud.id)
      .then((docs) => {
        if (vigente) setDocumentos(docs);
      })
      .catch((e) => {
        if (vigente) setErrorDocs(e.message);
      })
      .finally(() => {
        if (vigente) setCargandoDocs(false);
      });

    return () => {
      vigente = false;
    };
  }, [solicitud.id]);

  const handleDescargar = async (doc) => {
    setDescargandoId(doc.id);
    try {
      await descargarDocumento(doc.id, doc.nombreArchivo || `documento-${doc.id}`);
    } catch (e) {
      setErrorDocs(e.message);
    } finally {
      setDescargandoId(null);
    }
  };

  return (
    <div style={styles.tarjeta}>
      <div style={styles.tarjetaHeader}>
        <span style={styles.solicitudId}>Solicitud #{solicitud.id}</span>
        <span style={styles.estado} data-estado={solicitud.estado}>{solicitud.estado}</span>
      </div>

      <p style={styles.detalleText}>
        <strong>Modalidad:</strong> {nombreModalidad(solicitud.tipo || 'Beca')}
      </p>
      <p style={styles.detalleText}>
        <strong>Estudiante ID:</strong> {solicitud.estudiante_id || solicitud.estudiante}
      </p>
      {solicitud.montoSolicitado != null && (
        <p style={styles.detalleText}>
          <strong>Monto:</strong> Q{Number(solicitud.montoSolicitado).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
          {solicitud.requiereDobleAprobacion ? ' · requiere autorización' : ''}
        </p>
      )}

      {/* Sección de expedientes/documentos */}
      <div style={styles.seccionDocumentos}>
        <h4 style={styles.subtituloDocs}>Expediente adjunto:</h4>
        {errorDocs && <p style={styles.itemError} role="alert">{errorDocs}</p>}
        {cargandoDocs ? (
          <p style={styles.textoCargandoDocs}>Cargando documentos...</p>
        ) : documentos.length === 0 ? (
          <p style={styles.textoSinDocs}>Sin documentos subidos</p>
        ) : (
          <ul style={styles.listaDocs}>
            {documentos.map((doc) => (
              <li key={doc.id} style={styles.itemDoc}>
                <span>{nombreDocumento(doc.tipo)} ({doc.nombreArchivo})</span>
                <button
                  type="button"
                  style={styles.botonDescarga}
                  disabled={descargandoId === doc.id}
                  onClick={() => handleDescargar(doc)}
                >
                  {descargandoId === doc.id ? 'Descargando...' : 'Descargar'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={styles.acciones}>
        {puedeAutorizar && (
          <div style={styles.grupoDictamen}>
            <button
              type="button"
              style={styles.botonAprobar}
              disabled={procesando}
              onClick={() => onAutorizar(solicitud.id, true)}
            >
              Autorizar
            </button>
            <button
              type="button"
              style={styles.botonRechazar}
              disabled={procesando}
              onClick={() => onAutorizar(solicitud.id, false)}
            >
              No autorizar
            </button>
          </div>
        )}

        {puedeEvaluar && (
          <button
            type="button"
            style={styles.botonEvaluar}
            disabled={procesando}
            onClick={() => onEvaluar(solicitud.id)}
          >
            {procesando ? 'Procesando...' : 'Iniciar Evaluación'}
          </button>
        )}

        {puedeDictaminar && (
          <div style={styles.grupoDictamen}>
            <button
              type="button"
              style={styles.botonAprobar}
              disabled={procesando}
              onClick={() => onDictaminar(solicitud.id, true)}
            >
              Aprobar
            </button>
            <button
              type="button"
              style={styles.botonRechazar}
              disabled={procesando}
              onClick={() => onDictaminar(solicitud.id, false)}
            >
              Rechazar
            </button>
          </div>
        )}

        {!puedeEvaluar && !puedeDictaminar && !puedeAutorizar && (
          <span style={styles.textoSinAccion}>Sin acciones pendientes</span>
        )}
      </div>
    </div>
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
  seccionDocumentos: { marginTop: '1rem', padding: '0.8rem', backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.sm, border: `1px solid ${theme.colors.border}` },
  subtituloDocs: { margin: '0 0 0.5rem', fontSize: '0.88rem', color: theme.colors.secondary },
  listaDocs: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  itemDoc: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: theme.colors.textPrimary },
  botonDescarga: { backgroundColor: 'transparent', border: `1px solid ${theme.colors.primary}`, color: theme.colors.primary, borderRadius: theme.borderRadius.sm, padding: '0.25rem 0.5rem', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 },
  textoCargandoDocs: { fontSize: '0.82rem', color: theme.colors.textSecondary, margin: 0 },
  textoSinDocs: { fontSize: '0.82rem', color: theme.colors.textSecondary, fontStyle: 'italic', margin: 0 },
  acciones: { marginTop: '1rem', paddingTop: '0.8rem', borderTop: `1px solid ${theme.colors.border}`, display: 'flex', justifyContent: 'flex-end' },
  botonEvaluar: { backgroundColor: theme.colors.primary, color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: theme.borderRadius.md, cursor: 'pointer', fontWeight: '600' },
  grupoDictamen: { display: 'flex', gap: '0.5rem' },
  botonAprobar: { backgroundColor: theme.colors.success, color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: theme.borderRadius.md, cursor: 'pointer', fontWeight: '600' },
  botonRechazar: { backgroundColor: theme.colors.error, color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: theme.borderRadius.md, cursor: 'pointer', fontWeight: '600' },
  textoSinAccion: { fontSize: '0.85rem', color: theme.colors.textSecondary, fontStyle: 'italic' },
  avisoOk: { padding: '0.75rem', backgroundColor: theme.colors.successBg, color: theme.colors.success, borderRadius: theme.borderRadius.md, marginBottom: '1rem', border: `1px solid ${theme.colors.successBorder}` },
  avisoError: { padding: '0.75rem', backgroundColor: theme.colors.errorBg, color: theme.colors.error, borderRadius: theme.borderRadius.md, marginBottom: '1rem', border: `1px solid ${theme.colors.errorBorder}` },
  itemError: { margin: '0 0 0.5rem', fontSize: '0.82rem', color: theme.colors.error },
};