// src/pages/ConvocatoriasPage.jsx
//
// SCRUM-35: pantalla de convocatorias disponibles.
//
// Criterios de aceptacion del backlog:
//   - Muestra los dias restantes para el cierre.
//   - Si no hay convocatorias abiertas, muestra un mensaje, NO una tabla vacia.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarConvocatorias } from '../services/convocatoriaService';
import { crearSolicitud } from '../services/solicitudService';
import { periodo, formatearFecha } from '../utils/fechas';
import { nombreModalidad } from '../utils/catalogos';
import { haySesion } from '../utils/sesion';
import { theme } from '../styles/theme';

export const ConvocatoriasPage = () => {
  const [convocatorias, setConvocatorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;

    listarConvocatorias()
      .then((datos) => {
        if (vigente) setConvocatorias(datos);
      })
      .catch((e) => {
        if (vigente) setError(e.message);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    // Si el usuario navega antes de que responda la peticion, no se escribe
    // sobre un componente desmontado.
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <section style={styles.contenedor}>
      <header style={styles.encabezado}>
        <h1 style={styles.titulo}>Convocatorias de beca</h1>
        <p style={styles.subtitulo}>
          Periodos abiertos para presentar una solicitud ante el Ministerio de Educación.
        </p>
      </header>

      {cargando && <p style={styles.aviso}>Cargando convocatorias…</p>}

      {!cargando && error && (
        <div style={styles.errorCaja} role="alert">
          <strong>No se pudieron cargar las convocatorias.</strong>
          <p style={styles.errorTexto}>{error}</p>
        </div>
      )}

      {/* Criterio de aceptacion: un mensaje, no una tabla vacia. */}
      {!cargando && !error && convocatorias.length === 0 && (
        <div style={styles.vacioCaja}>
          <p style={styles.vacioTitulo}>Por ahora no hay convocatorias abiertas.</p>
          <p style={styles.vacioTexto}>
            Cuando el Ministerio publique una nueva convocatoria, aparecerá en esta página
            con sus fechas y los documentos que solicita.
          </p>
        </div>
      )}

      {!cargando && !error && convocatorias.length > 0 && (
        <ul style={styles.lista}>
          {convocatorias.map((c) => (
            <TarjetaConvocatoria key={c.id} convocatoria={c} />
          ))}
        </ul>
      )}
    </section>
  );
};

/** Una convocatoria en la lista. */
const TarjetaConvocatoria = ({ convocatoria }) => {
  const { fase, etiqueta } = periodo(convocatoria);
  const colorFase = {
    abierta: { fondo: theme.colors.successBg, borde: theme.colors.successBorder, texto: theme.colors.success },
    'por-abrir': { fondo: theme.colors.warningBg, borde: theme.colors.warning, texto: theme.colors.warning },
    vencida: { fondo: theme.colors.errorBg, borde: theme.colors.errorBorder, texto: theme.colors.error },
    'sin-fechas': { fondo: theme.colors.background, borde: theme.colors.border, texto: theme.colors.textSecondary },
  }[fase];

  return (
    <li style={styles.tarjeta}>
      <div style={styles.tarjetaCabecera}>
        <h2 style={styles.tarjetaTitulo}>{convocatoria.titulo}</h2>
        <span
          style={{
            ...styles.insignia,
            backgroundColor: colorFase.fondo,
            border: `1px solid ${colorFase.borde}`,
            color: colorFase.texto,
          }}
        >
          {etiqueta}
        </span>
      </div>

      {convocatoria.descripcion && (
        <p style={styles.tarjetaDescripcion}>{convocatoria.descripcion}</p>
      )}

      <dl style={styles.datos}>
        <div style={styles.dato}>
          <dt style={styles.datoEtiqueta}>Apertura</dt>
          <dd style={styles.datoValor}>{formatearFecha(convocatoria.fechaApertura) || '—'}</dd>
        </div>
        <div style={styles.dato}>
          <dt style={styles.datoEtiqueta}>Cierre</dt>
          <dd style={styles.datoValor}>{formatearFecha(convocatoria.fechaCierre) || '—'}</dd>
        </div>
        <div style={styles.dato}>
          <dt style={styles.datoEtiqueta}>Modalidades</dt>
          <dd style={styles.datoValor}>
            {(convocatoria.modalidades ?? [])
              .map(nombreModalidad)
              .join(' · ') || '—'}
          </dd>
        </div>
      </dl>

      {/*
        Quien decide si se puede aplicar es el backend, con `recibeSolicitudes`:
        hacen falta el estado Y la ventana de fechas, y esa regla es suya. Si el
        cliente la recalculara, ofreceria aplicar a una convocatoria publicada
        que todavia no abre y recibiria un 409.
      */}
      {convocatoria.recibeSolicitudes ? (
        <IniciarSolicitud convocatoria={convocatoria} />
      ) : (
        <p style={styles.noDisponible}>
          Esta convocatoria no está recibiendo solicitudes en este momento.
        </p>
      )}
    </li>
  );
};

/**
 * Inicia una solicitud a la convocatoria.
 *
 * Sin sesión, lleva al login. Si la convocatoria admite varias modalidades, el
 * estudiante elige una. Si ya tiene una solicitud en esta convocatoria, el
 * backend responde 409 con su número y se le lleva a esa en vez de mostrarle
 * un error: lo que quería era seguir con su solicitud.
 */
const IniciarSolicitud = ({ convocatoria }) => {
  const navigate = useNavigate();
  const modalidades = convocatoria.modalidades ?? [];
  const [tipo, setTipo] = useState(modalidades[0] ?? '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const iniciar = async () => {
    if (!haySesion()) {
      navigate('/login');
      return;
    }

    setError('');
    setEnviando(true);
    try {
      const solicitud = await crearSolicitud({ tipo, convocatoriaId: convocatoria.id });
      navigate(`/solicitudes/${solicitud.id}`);
    } catch (e) {
      if (e.solicitudExistente) {
        navigate(`/solicitudes/${e.solicitudExistente}`);
        return;
      }
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={styles.iniciar}>
      {modalidades.length > 1 && (
        <label style={styles.etiquetaSelector}>
          Modalidad
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={styles.selector}>
            {modalidades.map((m) => (
              <option key={m} value={m}>{nombreModalidad(m)}</option>
            ))}
          </select>
        </label>
      )}
      <button type="button" style={styles.botonAplicar} onClick={iniciar} disabled={enviando}>
        {enviando ? 'Creando…' : 'Iniciar solicitud'}
      </button>
      {error && <p style={styles.errorEnLinea} role="alert">{error}</p>}
    </div>
  );
};

const styles = {
  contenedor: { width: '100%', maxWidth: '900px', margin: '0 auto', padding: '1rem 0' },
  encabezado: { marginBottom: '1.5rem' },
  titulo: { margin: 0, color: theme.colors.secondary, fontSize: '1.6rem', fontFamily: theme.fonts.main },
  subtitulo: { margin: '0.35rem 0 0', color: theme.colors.textSecondary, fontSize: '0.92rem' },

  aviso: { color: theme.colors.textSecondary, fontSize: '0.92rem' },

  errorCaja: {
    backgroundColor: theme.colors.errorBg,
    border: `1px solid ${theme.colors.errorBorder}`,
    color: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    padding: '1rem',
  },
  errorTexto: { margin: '0.4rem 0 0', fontSize: '0.88rem' },

  vacioCaja: {
    backgroundColor: theme.colors.cardBg,
    border: `1px dashed ${theme.colors.border}`,
    borderRadius: theme.borderRadius.lg,
    padding: '2rem 1.5rem',
    textAlign: 'center',
  },
  vacioTitulo: { margin: 0, color: theme.colors.secondary, fontWeight: 600, fontSize: '1.05rem' },
  vacioTexto: { margin: '0.5rem auto 0', color: theme.colors.textSecondary, fontSize: '0.9rem', maxWidth: '46ch' },

  lista: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' },

  tarjeta: {
    backgroundColor: theme.colors.cardBg,
    border: `1px solid ${theme.colors.border}`,
    borderLeft: `4px solid ${theme.colors.primary}`,
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.card,
    padding: '1.1rem 1.25rem',
  },
  tarjetaCabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' },
  tarjetaTitulo: { margin: 0, fontSize: '1.08rem', color: theme.colors.secondary },
  insignia: { padding: '0.22rem 0.6rem', borderRadius: '999px', fontSize: '0.76rem', fontWeight: 600, whiteSpace: 'nowrap' },
  tarjetaDescripcion: { margin: '0.6rem 0 0', color: theme.colors.textSecondary, fontSize: '0.9rem', lineHeight: 1.5 },

  datos: { display: 'flex', gap: '1.75rem', flexWrap: 'wrap', margin: '0.9rem 0 0' },
  dato: { margin: 0 },
  datoEtiqueta: {
    margin: 0,
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: theme.colors.textSecondary,
  },
  datoValor: { margin: '0.15rem 0 0', fontSize: '0.88rem', color: theme.colors.textPrimary, fontWeight: 500 },

  botonAplicar: {
    backgroundColor: theme.colors.primary,
    color: '#ffffff',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    padding: '0.5rem 1.1rem',
    fontSize: '0.88rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: theme.fonts.main,
  },
  iniciar: { marginTop: '1rem', display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' },
  etiquetaSelector: { display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: theme.colors.textSecondary },
  selector: { padding: '0.45rem 0.6rem', borderRadius: theme.borderRadius.md, border: `1px solid ${theme.colors.border}`, fontSize: '0.88rem' },
  errorEnLinea: { margin: 0, width: '100%', fontSize: '0.84rem', color: theme.colors.error },
  noDisponible: { margin: '1rem 0 0', fontSize: '0.84rem', color: theme.colors.textSecondary, fontStyle: 'italic' },
};
