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
