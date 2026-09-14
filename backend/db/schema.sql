-- Esquema de base de datos: sis_db
-- Ejecutar una vez, sobre una base de datos vacia

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'estudiante',
    reset_token_hash VARCHAR(255),
    reset_token_expira TIMESTAMP,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);
