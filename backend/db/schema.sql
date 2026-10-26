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

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'solicitudes_estado_check'
           AND conrelid = 'solicitudes'::regclass
    ) THEN
        ALTER TABLE solicitudes ADD CONSTRAINT solicitudes_estado_check
            CHECK (estado IN ('Borrador', 'Enviada', 'En Evaluación', 'Aprobada', 'Rechazada'));
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
