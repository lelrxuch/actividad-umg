#!/bin/bash
# setup-backend.sh
# Crea la estructura base del backend (arquitectura en capas)
# Ejecutar UNA SOLA VEZ, parado en la raíz del repo, ya estando en tu rama de feature.
#
# Uso:
#   chmod +x setup-backend.sh
#   ./setup-backend.sh

set -e

echo "==> Creando carpetas..."
mkdir -p src/config
mkdir -p src/middlewares
mkdir -p src/routes
mkdir -p src/controllers
mkdir -p src/services
mkdir -p src/repositories
mkdir -p src/patterns/creational
mkdir -p src/patterns/structural
mkdir -p src/patterns/behavioral/estados

# Crea un archivo con un encabezado estándar de estado + descripción
crear_stub() {
  local ruta="$1"
  local estado="$2"
  local descripcion="$3"
  cat > "$ruta" <<EOF
// [$estado]
// $descripcion
EOF
}

echo "==> Config y entrypoints..."
crear_stub "src/config/db.js"   "POR COMENZAR" "Conexión a PostgreSQL con pg (pool de conexiones)"
crear_stub "src/config/env.js"  "POR COMENZAR" "Carga y validación de variables de entorno (dotenv)"
crear_stub "src/app.js"         "POR COMENZAR" "Configuración de Express: middlewares globales y montaje de rutas"
crear_stub "src/server.js"      "POR COMENZAR" "Arranque del servidor HTTP (listen)"

echo "==> Middlewares..."
crear_stub "src/middlewares/auth.middleware.js"  "FALTANTE" "Verificación de JWT en rutas protegidas"
crear_stub "src/middlewares/error.middleware.js" "FALTANTE" "Manejador de errores centralizado"

echo "==> Rutas..."
crear_stub "src/routes/auth.routes.js"       "POR COMENZAR" "Rutas de login / registro (NO es esta tarea)"
crear_stub "src/routes/password.routes.js"   "EN PROGRESO"  "Rutas de recuperación de contraseña"
crear_stub "src/routes/solicitud.routes.js"  "FALTANTE"     "Rutas del módulo Solicitudes"
crear_stub "src/routes/expediente.routes.js" "FALTANTE"     "Rutas del módulo Expedientes"
crear_stub "src/routes/documento.routes.js"  "FALTANTE"     "Rutas del módulo Documentos"

echo "==> Controllers..."
crear_stub "src/controllers/auth.controller.js"       "POR COMENZAR" "Controller de login / registro (NO es esta tarea)"
crear_stub "src/controllers/password.controller.js"   "EN PROGRESO"  "Controller de recuperación de contraseña"
crear_stub "src/controllers/solicitud.controller.js"  "FALTANTE"     "Controller del módulo Solicitudes"
crear_stub "src/controllers/expediente.controller.js" "FALTANTE"     "Controller del módulo Expedientes"
crear_stub "src/controllers/documento.controller.js"  "FALTANTE"     "Controller del módulo Documentos"

echo "==> Services..."
crear_stub "src/services/auth.service.js"       "POR COMENZAR" "Lógica de login (NO es esta tarea)"
crear_stub "src/services/password.service.js"   "EN PROGRESO"  "Lógica de recuperación de contraseña (generar/validar token, cambiar hash)"
crear_stub "src/services/solicitud.service.js"  "FALTANTE"     "Lógica de negocio de Solicitudes"
crear_stub "src/services/expediente.service.js" "FALTANTE"     "Lógica de negocio de Expedientes"
crear_stub "src/services/documento.service.js"  "FALTANTE"     "Lógica de negocio de Documentos"

echo "==> Repositories..."
crear_stub "src/repositories/usuario.repository.js"    "POR COMENZAR" "Acceso a datos de Usuario (necesario para recuperar contraseña)"
crear_stub "src/repositories/solicitud.repository.js"  "FALTANTE"     "Acceso a datos de Solicitud"
crear_stub "src/repositories/expediente.repository.js" "FALTANTE"     "Acceso a datos de Expediente"
crear_stub "src/repositories/documento.repository.js"  "FALTANTE"     "Acceso a datos de Documento"

echo "==> Patrones de diseño..."
crear_stub "src/patterns/creational/SolicitudFactory.js"              "FALTANTE" "Factory Method para crear Solicitudes"
crear_stub "src/patterns/creational/ExpedienteBuilder.js"             "FALTANTE" "Builder para construir Expedientes paso a paso"
crear_stub "src/patterns/structural/RenapAdapter.js"                  "FALTANTE" "Adapter para integración con RENAP"
crear_stub "src/patterns/structural/DocumentoProxy.js"                "FALTANTE" "Proxy de acceso a Documentos"
crear_stub "src/patterns/behavioral/EmailNotificationListener.js"     "FALTANTE" "Observer para notificaciones por correo"
crear_stub "src/patterns/behavioral/estados/IEstadoSolicitud.js"      "FALTANTE" "Interfaz State para los estados de una Solicitud"

echo "==> .gitignore..."
cat > .gitignore <<'EOF'
node_modules/
.env
*.log
dist/
EOF

echo "==> .env.example..."
cat > .env.example <<'EOF'
PORT=3000
DATABASE_URL=postgres://usuario:password@localhost:5432/nombre_bd
JWT_SECRET=cambia_este_valor
JWT_EXPIRES_IN=1h
RESET_TOKEN_EXPIRES_MIN=30
EOF

echo "==> ESTADO.md (tablero de estado)..."
cat > ESTADO.md <<'EOF'
# Estado del Backend

Leyenda: POR COMENZAR (archivo creado, sin lógica) · EN PROGRESO · FALTANTE (ni siquiera hay stub) · LISTO

| Módulo                     | Archivo(s)                                              | Estado         |
|-----------------------------|----------------------------------------------------------|----------------|
| Config (DB, env)            | src/config/db.js, src/config/env.js                      | POR COMENZAR   |
| App / Server                | src/app.js, src/server.js                                 | POR COMENZAR   |
| Auth - Login                | src/routes,controllers,services/auth.*                    | POR COMENZAR   |
| Auth - Recuperar contraseña | src/routes,controllers,services/password.*                | EN PROGRESO    |
| Repository Usuario          | src/repositories/usuario.repository.js                    | POR COMENZAR   |
| Solicitudes                 | routes,controllers,services,repository de Solicitud       | FALTANTE       |
| Expedientes                 | routes,controllers,services,repository de Expediente      | FALTANTE       |
| Documentos                  | routes,controllers,services,repository de Documento       | FALTANTE       |
| Builder - ExpedienteBuilder | src/patterns/creational/ExpedienteBuilder.js               | FALTANTE       |
| Factory - SolicitudFactory  | src/patterns/creational/SolicitudFactory.js                 | FALTANTE       |
| Adapter - RenapAdapter      | src/patterns/structural/RenapAdapter.js                    | FALTANTE       |
| Proxy - DocumentoProxy      | src/patterns/structural/DocumentoProxy.js                  | FALTANTE       |
| Observer - EmailNotification| src/patterns/behavioral/EmailNotificationListener.js       | FALTANTE       |
| State - IEstadoSolicitud    | src/patterns/behavioral/estados/IEstadoSolicitud.js         | FALTANTE       |
EOF

echo "==> Inicializando package.json e instalando dependencias..."
npm init -y > /dev/null
npm install express pg bcryptjs jsonwebtoken dotenv
npm install --save-dev nodemon eslint

echo ""
echo "==> Listo. Estructura creada, dependencias instaladas."
echo "==> Revisa ESTADO.md y haz commit de estos cambios."