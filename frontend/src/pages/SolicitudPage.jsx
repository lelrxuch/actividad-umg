// src/pages/SolicitudPage.jsx
//
// Detalle de una solicitud: su estado, el expediente y el envío.
//
// Qué documentos exige la solicitud, qué acciones admite su estado y si el
// expediente está completo lo decide el backend. Esta pantalla muestra lo que
// él responde y no replica ninguna de esas reglas: si el backend dice que
// faltan documentos al enviar, se muestran SUS faltantes. Lo mismo con el CUI
// (SCRUM-38): la pantalla lo pide y el backend lo valida contra RENAP.
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { obtenerSolicitud, enviarSolicitud } from '../services/solicitudService';
import { listarDocumentos, subirDocumento } from '../services/documentoService';
import { nombreDocumento, nombreModalidad } from '../utils/catalogos';
import { haySesion } from '../utils/sesion';
import { theme } from '../styles/theme';

/** Lo que el estudiante puede subir. El backend lo vuelve a validar. */
const ACEPTA = '.pdf,.jpg,.jpeg,.png';
const LIMITE_MB = 5;
const AYUDA_ARCHIVOS = `PDF, JPG o PNG, hasta ${LIMITE_MB} MB`;

export const SolicitudPage = () => {
  const { id } = useParams();
  const [solicitud, setSolicitud] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [faltantes, setFaltantes] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [avisoEsError, setAvisoEsError] = useState(false);
  const [cui, setCui] = useState('');

  useEffect(() => {
    let vigente = true;
    Promise.all([obtenerSolicitud(id), listarDocumentos(id)])
      .then(([s, d]) => {
        if (!vigente) return;
        setSolicitud(s);
        setDocumentos(d);
      })
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [id]);

  if (!haySesion()) return <Navigate to="/login" replace />;
  if (cargando) return <p style={styles.aviso}>Cargando solicitud…</p>;
  if (error) {
    return (
      <section style={styles.contenedor}>
        <div style={styles.errorCaja} role="alert">
          <strong>No se pudo abrir la solicitud.</strong>
          <p style={styles.errorTexto}>{error}</p>
        </div>
        <Link to="/solicitudes" style={styles.enlace}>Volver a mis solicitudes</Link>
      </section>
    );
  }

  const requeridos = solicitud.documentosRequeridos ?? [];
  const subidos = new Map(documentos.map((d) => [d.tipo, d]));
  const puedeEnviar = (solicitud.accionesPermitidas ?? []).includes('enviar');
  const editable = solicitud.estado === 'Borrador';

  const alSubir = async () => {
    setFaltantes([]);
    setAviso('');
    setDocumentos(await listarDocumentos(id));
  };

  const enviar = async () => {
    setFaltantes([]);
    setAviso('');
    setEnviando(true);
    try {
      const actualizada = await enviarSolicitud(id, cui);
      setSolicitud(actualizada);
      setAvisoEsError(false);
      setAviso('Su solicitud fue enviada. Puede consultar aquí su avance.');
    } catch (e) {
      // Antes el aviso solo se pintaba como error si había faltantes; un CUI
      // rechazado o RENAP caído salían en verde, como si se hubiera enviado.
      setFaltantes(e.faltantes ?? []);
      setAvisoEsError(true);
      setAviso(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section style={styles.contenedor}>
      <Link to="/solicitudes" style={styles.enlace}>← Mis solicitudes</Link>

      <header style={styles.encabezado}>
        <h1 style={styles.titulo}>Solicitud #{solicitud.id}</h1>
        <span style={styles.estado} data-estado={solicitud.estado}>{solicitud.estado}</span>
      </header>
      <p style={styles.subtitulo}>
        Beca {nombreModalidad(solicitud.tipo).toLowerCase()}
        {solicitud.convocatoriaId ? ` · convocatoria #${solicitud.convocatoriaId}` : ''}
      </p>

      <h2 style={styles.seccion}>Expediente</h2>
      {editable && <p style={styles.ayuda}>Formatos aceptados: {AYUDA_ARCHIVOS}.</p>}
      <ul style={styles.lista}>
        {requeridos.map((tipo) => (
          <ItemDocumento
            key={tipo}
            tipo={tipo}
            documento={subidos.get(tipo)}
            faltaSegunBackend={faltantes.includes(tipo)}
            editable={editable}
            solicitudId={id}
            alSubir={alSubir}
          />
        ))}
      </ul>

      {puedeEnviar && (
        <div style={styles.campo}>
          <label htmlFor="cui" style={styles.etiqueta}>CUI (número de su DPI)</label>
          <input
            id="cui"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="1234 56789 0101"
            maxLength={16}
            value={cui}
            onChange={(e) => setCui(e.target.value)}
            disabled={enviando}
            style={styles.input}
          />
          <p style={styles.ayuda}>Se verifica contra RENAP al enviar. Debe ser el suyo.</p>
        </div>
      )}

      {aviso && (
        <p
          style={avisoEsError ? styles.avisoError : styles.avisoOk}
          data-tipo={avisoEsError ? 'error' : 'ok'}
          role="status"
        >
          {aviso}
        </p>
      )}

      {puedeEnviar && (
        <button type="button" style={styles.boton} onClick={enviar} disabled={enviando || !cui.trim()}>
          {enviando ? 'Enviando…' : 'Enviar a evaluación'}
        </button>
      )}
      {!editable && (
        <p style={styles.nota}>
          La solicitud ya no está en Borrador: su expediente queda en solo lectura.
        </p>
      )}
    </section>
  );
};

/** Un documento del expediente: subido, o el control para subirlo. */
const ItemDocumento = ({ tipo, documento, faltaSegunBackend, editable, solicitudId, alSubir }) => {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  const elegir = async (evento) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;

    setError('');
    setSubiendo(true);
    try {
      await subirDocumento(solicitudId, tipo, archivo);
      await alSubir();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <li style={{ ...styles.item, ...(faltaSegunBackend ? styles.itemFalta : {}) }}>
      <div>
        <p style={styles.itemNombre}>{nombreDocumento(tipo)}</p>
        {documento ? (
          <p style={styles.itemOk}>Subido: {documento.nombreArchivo}</p>
        ) : (
          <p style={styles.itemPendiente}>Pendiente</p>
        )}
        {error && <p style={styles.itemError} role="alert">{error}</p>}
      </div>

      {!documento && editable && (
        <label style={styles.botonSecundario}>
          {subiendo ? 'Subiendo…' : 'Subir archivo'}
          <input
            type="file"
            accept={ACEPTA}
            onChange={elegir}
            disabled={subiendo}
            style={styles.inputOculto}
            aria-label={`Subir ${nombreDocumento(tipo)}`}
          />
        </label>
      )}
    </li>
  );
};


const styles = {
  contenedor: { width: '100%', maxWidth: '760px', margin: '0 auto', padding: '1rem 0' },
  aviso: { color: theme.colors.textSecondary },
  enlace: { color: theme.colors.accent, fontSize: '0.86rem', textDecoration: 'none' },
  encabezado: { display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '0.8rem' },
  titulo: { margin: 0, fontSize: '1.5rem', color: theme.colors.secondary },
  estado: { padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}`, color: theme.colors.secondary },
  subtitulo: { margin: '0.3rem 0 0', color: theme.colors.textSecondary, fontSize: '0.9rem' },
  seccion: { margin: '1.6rem 0 0.6rem', fontSize: '1.05rem', color: theme.colors.secondary },
  ayuda: { margin: '0 0 0.6rem', fontSize: '0.8rem', color: theme.colors.textSecondary },
  lista: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', backgroundColor: theme.colors.cardBg, border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.md, padding: '0.8rem 1rem' },
  itemFalta: { border: `1px solid ${theme.colors.errorBorder}`, backgroundColor: theme.colors.errorBg },
  itemNombre: { margin: 0, fontWeight: 600, fontSize: '0.92rem', color: theme.colors.textPrimary },
  itemOk: { margin: '0.2rem 0 0', fontSize: '0.82rem', color: theme.colors.success },
  itemPendiente: { margin: '0.2rem 0 0', fontSize: '0.82rem', color: theme.colors.textSecondary },
  itemError: { margin: '0.3rem 0 0', fontSize: '0.82rem', color: theme.colors.error },
  botonSecundario: { position: 'relative', whiteSpace: 'nowrap', cursor: 'pointer', border: `1px solid ${theme.colors.primary}`, color: theme.colors.primary, borderRadius: theme.borderRadius.md, padding: '0.4rem 0.85rem', fontSize: '0.84rem', fontWeight: 600 },
  inputOculto: { position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' },
  campo: { marginTop: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', maxWidth: '320px' },
  etiqueta: { fontSize: '0.88rem', fontWeight: 600, color: theme.colors.textPrimary },
  input: { padding: '0.55rem 0.7rem', border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.md, fontSize: '0.92rem' },
  avisoOk: { margin: '1rem 0 0', color: theme.colors.success, fontSize: '0.9rem' },
  avisoError: { margin: '1rem 0 0', color: theme.colors.error, fontSize: '0.9rem' },
  boton: { marginTop: '1.2rem', backgroundColor: theme.colors.primary, color: '#fff', border: 'none', borderRadius: theme.borderRadius.md, padding: '0.6rem 1.2rem', fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer' },
  nota: { marginTop: '1rem', fontSize: '0.84rem', color: theme.colors.textSecondary, fontStyle: 'italic' },
  errorCaja: { backgroundColor: theme.colors.errorBg, border: `1px solid ${theme.colors.errorBorder}`, color: theme.colors.error, borderRadius: theme.borderRadius.md, padding: '1rem', marginBottom: '1rem' },
  errorTexto: { margin: '0.4rem 0 0', fontSize: '0.88rem' },
};
