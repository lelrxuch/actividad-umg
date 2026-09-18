-- Esquema de base de datos: sis_db
-- Ejecutar una vez, sobre una base de datos vacia

CREATE TABLE usuarios (
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

CREATE TABLE solicitudes (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER NOT NULL REFERENCES usuarios(id),
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);