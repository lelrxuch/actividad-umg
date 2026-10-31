-- Esquema de base de datos: becas_db
-- Este archivo es IDEMPOTENTE: se puede correr sobre una base vacia y sobre una
-- que ya existe, cuantas veces sea necesario, sin errores y sin perder datos.
--
-- Los valores de `solicitudes.tipo` y `solicitudes.estado` se comparan en el
-- codigo por coincidencia exacta de cadena:
--   tipo   -> backend/src/patterns/creational/SolicitudFactory.js
--   estado -> backend/src/patterns/state/index.js (crearEstadoDesdeNombre)
-- Cambiar una tilde, un espacio o una mayuscula rompe el patron State.

-- ---------------------------------------------------------------------------
-- usuarios
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'estudiante',
    telefono VARCHAR(20),
    correo_alterno VARCHAR(255),
    reset_token_hash VARCHAR(255),
    reset_token_expira TIMESTAMP,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- solicitudes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS solicitudes (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER NOT NULL REFERENCES usuarios(id),
    estado VARCHAR(50) NOT NULL DEFAULT 'Borrador',
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Modalidad de beca que produce SolicitudFactory. Nullable a proposito: las
-- filas existentes no tienen modalidad y no hay forma de deducirla.
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS tipo VARCHAR(30);

-- CUI con que se envio la solicitud, ya validado contra RENAP (SCRUM-38).
-- Nullable: los borradores y las solicitudes enviadas antes de SCRUM-38 no
-- tienen. Vive aqui y no en `usuarios` para no tocar a los usuarios existentes
-- y dejar constancia de con que CUI se envio cada una.
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS cui CHAR(13);

-- 'pendiente' era el DEFAULT antes del patron State y ya no existe en el codigo.
-- Se migra ANTES de agregar el CHECK para que no falle en bases con datos.
UPDATE solicitudes SET estado = 'Borrador' WHERE estado = 'pendiente';

-- Si la tabla ya existia, el DEFAULT viejo sigue en el catalogo: se reemplaza.
ALTER TABLE solicitudes ALTER COLUMN estado SET DEFAULT 'Borrador';

-- ADD CONSTRAINT no acepta IF NOT EXISTS: se consulta pg_constraint.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'solicitudes_tipo_check'
           AND conrelid = 'solicitudes'::regclass
    ) THEN
        ALTER TABLE solicitudes ADD CONSTRAINT solicitudes_tipo_check
            CHECK (tipo IS NULL OR tipo IN ('nivel-medio', 'universitaria', 'posgrado'));
    END IF;

    -- 'Pendiente de Autorización' entró con la doble aprobación (30/10/2026).
    -- Una base creada antes tiene el CHECK sin ese valor: se reemplaza.
    IF EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'solicitudes_estado_check'
           AND conrelid = 'solicitudes'::regclass
           AND pg_get_constraintdef(oid) NOT LIKE '%Pendiente de Autorizaci%'
    ) THEN
        ALTER TABLE solicitudes DROP CONSTRAINT solicitudes_estado_check;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'solicitudes_estado_check'
           AND conrelid = 'solicitudes'::regclass
    ) THEN
        ALTER TABLE solicitudes ADD CONSTRAINT solicitudes_estado_check
            CHECK (estado IN ('Borrador', 'Enviada', 'En Evaluación',
                              'Pendiente de Autorización', 'Aprobada', 'Rechazada'));
    END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- documentos
-- Columnas segun la cabecera de backend/src/repositories/documento.repository.js
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documentos (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    estudiante_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- solicitud_evaluadores
-- La llave primaria compuesta impide asignar dos veces el mismo evaluador a la
-- misma solicitud.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS solicitud_evaluadores (
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    evaluador_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    PRIMARY KEY (solicitud_id, evaluador_id)
);

-- La tabla `expedientes` NO se crea: expediente.service.js arma el expediente en
-- memoria y expediente.repository.js es un stub. Se define en SCRUM-43.
-- ---------------------------------------------------------------------------
-- Un solo documento de cada tipo por solicitud (SCRUM-42).
--
-- El expediente se valida contando tipos: dos filas 'titulo' en la misma
-- solicitud harian que ExpedienteBuilder lo diera por completo con un papel
-- repetido y otro ausente. La regla se aplica en la base y no solo en el
-- service, porque la base es el unico punto por el que pasan todas las
-- escrituras.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_documentos_solicitud_tipo
    ON documentos (solicitud_id, tipo);

-- ---------------------------------------------------------------------------
-- convocatorias (SCRUM-32, SCRUM-33)
--
-- Los valores de `estado` se comparan en el codigo por coincidencia exacta de
-- cadena, igual que en `solicitudes`:
--   backend/src/patterns/state/convocatoria/index.js (crearEstadoDesdeNombre)
-- Cambiar una tilde, un espacio o una mayuscula rompe el patron State.
--
-- `modalidades` es un arreglo de los tipos de beca que la convocatoria admite,
-- con los mismos valores que `solicitudes.tipo`. No lleva CHECK porque la lista
-- valida la decide SolicitudFactory y duplicarla aqui la dejaria desincronizada;
-- la validacion vive en convocatoria.service, que le pregunta a la fabrica.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS convocatorias (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_apertura DATE,
    fecha_cierre DATE,
    modalidades TEXT[] NOT NULL DEFAULT '{}',
    estado VARCHAR(30) NOT NULL DEFAULT 'Borrador',
    creada_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'convocatorias_estado_check'
           AND conrelid = 'convocatorias'::regclass
    ) THEN
        ALTER TABLE convocatorias ADD CONSTRAINT convocatorias_estado_check
            CHECK (estado IN ('Borrador', 'Publicada', 'Cerrada'));
    END IF;
END $$;

-- El cierre nunca puede ser anterior a la apertura. Se aplica en la base y no
-- solo en el service porque una convocatoria con fechas invertidas no se podria
-- cerrar ni interpretar despues.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'convocatorias_fechas_check'
           AND conrelid = 'convocatorias'::regclass
    ) THEN
        ALTER TABLE convocatorias ADD CONSTRAINT convocatorias_fechas_check
            CHECK (fecha_apertura IS NULL
                OR fecha_cierre IS NULL
                OR fecha_cierre >= fecha_apertura);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- La solicitud puede pertenecer a una convocatoria.
--
-- Nullable a proposito: las solicitudes que ya existen no tienen convocatoria,
-- y el flujo de crear una solicitud sin convocatoria sigue funcionando. Cuando
-- viene, convocatoria.service comprueba que este publicada, dentro de fechas y
-- que admita la modalidad pedida.
--
-- ON DELETE SET NULL y no CASCADE: borrar una convocatoria no puede borrar las
-- solicitudes de los estudiantes.
-- ---------------------------------------------------------------------------
ALTER TABLE solicitudes
    ADD COLUMN IF NOT EXISTS convocatoria_id INTEGER
    REFERENCES convocatorias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_solicitudes_convocatoria
    ON solicitudes (convocatoria_id);

-- ---------------------------------------------------------------------------
-- Notificaciones al estudiante por cambio de estado (requerimiento nuevo del
-- Product Owner, 30/10/2026).
--
-- Cada fila es UN aviso por UN canal: registra el evento que lo originó (el
-- cambio de estado anterior → nuevo), a quién va dirigido, y si se entregó o
-- con qué error falló. La fila se crea ANTES de intentar la entrega, así que un
-- canal caído deja rastro en vez de perder el evento.
--
-- La notificación se genera después de guardar el cambio de estado, nunca
-- antes: un aviso que falla no puede deshacer una transición ya persistida.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificaciones (
    id              SERIAL PRIMARY KEY,
    solicitud_id    INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    destinatario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(30) NOT NULL,
    estado_nuevo    VARCHAR(30) NOT NULL,
    canal           VARCHAR(20) NOT NULL,
    mensaje         TEXT NOT NULL,
    enviada         BOOLEAN NOT NULL DEFAULT false,
    error           TEXT,
    leida_en        TIMESTAMPTZ,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_destinatario
    ON notificaciones (destinatario_id, creado_en DESC);

-- ---------------------------------------------------------------------------
-- Doble aprobación de las solicitudes de mayor monto (requerimiento nuevo del
-- Product Owner, 30/10/2026).
--
-- monto_solicitado: nullable porque las solicitudes que ya existían no lo
-- tienen. Las nuevas no se pueden enviar sin él (solicitud.service).
--
-- aprobaciones: quién decidió cada etapa, cuándo y con qué resultado. El
-- UNIQUE (solicitud_id, etapa) impide en la base una segunda decisión sobre la
-- misma etapa, aunque lleguen dos peticiones a la vez. Que las dos etapas las
-- decidan personas distintas no cabe en un CHECK (compara dos filas): lo
-- verifica solicitud.autorizacion.
-- ---------------------------------------------------------------------------
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS monto_solicitado NUMERIC(12, 2);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'solicitudes_monto_check'
           AND conrelid = 'solicitudes'::regclass
    ) THEN
        ALTER TABLE solicitudes ADD CONSTRAINT solicitudes_monto_check
            CHECK (monto_solicitado IS NULL OR monto_solicitado > 0);
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS aprobaciones (
    id           SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    usuario_id   INTEGER NOT NULL REFERENCES usuarios(id),
    etapa        VARCHAR(20) NOT NULL CHECK (etapa IN ('evaluacion', 'autorizacion')),
    resultado    VARCHAR(20) NOT NULL CHECK (resultado IN ('aprobada', 'rechazada')),
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (solicitud_id, etapa)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Auditoría de operaciones relevantes (requerimiento nuevo R3, 30/10/2026).
-- Quién hizo qué, sobre qué solicitud, cuándo, y qué dato cambió.
--
-- Se escribe en la MISMA transacción que la operación que audita: o quedan las
-- dos o ninguna. Sin ON DELETE CASCADE: una solicitud con rastro de auditoría
-- no se puede borrar, así que el rastro no desaparece con ella.
CREATE TABLE IF NOT EXISTS auditoria (
    id           BIGSERIAL PRIMARY KEY,
    usuario_id   INTEGER NOT NULL REFERENCES usuarios(id),
    operacion    VARCHAR(40) NOT NULL,
    solicitud_id INTEGER REFERENCES solicitudes(id),
    detalle      JSONB NOT NULL DEFAULT '{}'::jsonb,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_solicitud ON auditoria (solicitud_id, id);

-- Inmutable: nadie, ni la propia aplicación, puede cambiar ni borrar un
-- registro. La protección vive en la base: un defecto futuro del backend no
-- la salta.
CREATE OR REPLACE FUNCTION auditoria_inmutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'La auditoría no se modifica ni se elimina';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auditoria_sin_cambios ON auditoria;
CREATE TRIGGER auditoria_sin_cambios
    BEFORE UPDATE OR DELETE ON auditoria
    FOR EACH ROW EXECUTE FUNCTION auditoria_inmutable();

-- TRUNCATE no dispara triggers por fila: se bloquea aparte.
DROP TRIGGER IF EXISTS auditoria_sin_truncate ON auditoria;
CREATE TRIGGER auditoria_sin_truncate
    BEFORE TRUNCATE ON auditoria
    FOR EACH STATEMENT EXECUTE FUNCTION auditoria_inmutable();
