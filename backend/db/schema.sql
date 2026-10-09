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