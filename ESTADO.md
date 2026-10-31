# Estado del proyecto

Verificado contra `develop` el **30/10/2026**, con los requerimientos nuevos
R1 (doble aprobación), R2 (notificaciones) y R3 (auditoría). Si una fila de este archivo
contradice al repositorio, el repositorio tiene razón y esta tabla está vencida:
corregirla es parte del punto 6 del DoD.

**Leyenda:** `LISTO` implementado y con pruebas · `PARCIAL` existe pero no está
conectado o le falta una parte · `STUB` archivo creado sin lógica · `FALTANTE`
ni archivo hay

**Resumen:** 34 endpoints · 522 pruebas en 28 archivos (backend) · 138 pruebas
en 12 archivos (frontend) · 91 verificaciones contra PostgreSQL en
`scripts/demo-api.sh`, que el CI corre en cada PR · los 6 patrones de diseño
implementados · una solicitud recorre la aplicación de punta a punta: estudiante,
administrador, evaluador y, si pasa de Q10,000, autoridad autorizadora

---

## Backend

### Infraestructura

| Módulo | Archivo(s) | Estado |
|---|---|---|
| Conexión a base de datos | `config/db.js` | LISTO |
| Transacciones | `config/transaccion.js` | LISTO. `conTransaccion` abre BEGIN/COMMIT con una conexión; `db()` la entrega a los repositorios sin cambiar sus firmas |
| Almacenamiento de documentos | `config/almacenamiento.js` | LISTO |
| Servidor y montaje de routers | `index.js` | LISTO |
| Esquema de base de datos | `db/schema.sql` | LISTO, idempotente, 8 tablas, con trigger de inmutabilidad en `auditoria` |
| Middleware de sesión | `middlewares/auth.middleware.js` | LISTO |
| Manejador de errores centralizado | `middlewares/error.middleware.js` | **STUB.** 2 líneas, nadie lo importa. Hoy cada controller traduce sus errores |

### Cuentas y acceso

| Módulo | Estado | Pruebas |
|---|---|---|
| Registro, login y perfil | LISTO | 26 |
| Recuperación de contraseña | **PARCIAL, con un defecto de seguridad.** No envía correo y no hay pantalla para restablecer; ver la tabla de deudas | 13 |
| Política de contraseñas | LISTO | 18 |
| Actualización de perfil | LISTO | 8 |

### Convocatorias

| Módulo | Estado | Pruebas |
|---|---|---|
| Ciclo de vida Borrador → Publicada → Cerrada | LISTO | 26 |
| Crear, editar, publicar, cerrar, listar | LISTO | 30 |

### Solicitudes

| Módulo | Estado | Pruebas |
|---|---|---|
| Ciclo de vida de 6 estados (con Pendiente de Autorización) | LISTO | 27 |
| Crear, consultar, enviar, evaluar, dictaminar | LISTO | 12 |
| Reglas del flujo del estudiante: expediente completo para enviar, una solicitud vigente por convocatoria, identidad al enviar | LISTO | 35 |
| Autorización por acción y por actor | LISTO | 17 |
| Bandeja de revisión (`GET /api/solicitudes/asignadas`) | LISTO | 12 |
| Asignación de evaluadores (`POST /api/solicitudes/:id/evaluadores`): solo administrador, solo en Enviada o En Evaluación | LISTO | 30 |
| Catálogo de modalidades por HTTP | LISTO | 7 |
| Manejo de errores del controller | LISTO | 8 |
| Doble aprobación de más de Q10,000 (R1): monto, autorización, registro de aprobaciones | LISTO | 44 |
| Validación de identidad contra RENAP al enviar | LISTO desde SCRUM-38. El estudiante escribe su CUI al enviar; se valida contra RENAP, el nombre de RENAP se compara con el de la cuenta y el CUI validado queda en `solicitudes.cui` | Incluidas en las 35 de arriba y en las de `structural.services` |

### Notificaciones y auditoría

| Módulo | Estado | Pruebas |
|---|---|---|
| Notificación al estudiante en cada cambio de estado (R2): se guarda el estado y después se avisa; un canal caído no deshace la transición | LISTO | 24 |
| Auditoría de operaciones relevantes (R3): en la misma transacción que la operación, lista blanca de campos, CUI enmascarado, solo administrador consulta | LISTO | 32 |
| Inmutabilidad de la auditoría: UPDATE, DELETE y TRUNCATE rechazados por la base | LISTO | En `demo-api.sh`, contra PostgreSQL |
| Transacciones | LISTO | 4 |

### Expedientes y documentos

| Módulo | Estado | Pruebas |
|---|---|---|
| Subida con lista blanca y límite de 5 MB | LISTO | 27 |
| Armado y revisión del expediente | LISTO | 15 |
| Descarga con control de acceso (incluye a la autoridad autorizadora, solo para lo que espera su decisión) | LISTO | 15 |
| Repositorio de expedientes | **STUB.** 2 líneas, nadie lo importa | — |

### Comités, evaluaciones y reportes

| Módulo | Estado |
|---|---|
| Crear comité, asignar evaluadores, repartir solicitudes | **PARCIAL.** La asignación manual de un evaluador a una solicitud ya tiene endpoint (ver Solicitudes); faltan los comités y el reparto |
| Criterios de evaluación y registro de puntajes | **FALTANTE** |
| Cupo, motivo de rechazo y ranqueo | **FALTANTE** |
| Reportes | **FALTANTE** |

### Patrones de diseño

Los seis están implementados, probados y mergeados. **Las rutas de este archivo
estuvieron equivocadas durante varios Sprints**: no existe
`src/patterns/behavioral/`; los patrones de comportamiento viven en
`src/patterns/state/` y `src/patterns/observer/`.

| Patrón | Categoría | Ubicación real | Estado | Pruebas |
|---|---|---|---|---|
| Factory Method | Creacional | `patterns/creational/SolicitudFactory.js` | LISTO | 17 + 10 de integración |
| Builder | Creacional | `patterns/creational/ExpedienteBuilder.js` | LISTO | ↑ |
| Adapter | Estructural | `patterns/structural/RenapAdapter.js` | LISTO, conectado al envío | 26 + 17 de integración |
| Proxy | Estructural | `patterns/structural/DocumentoProxy.js` | LISTO | ↑ |
| State (solicitud) | Comportamiento | `patterns/state/` | LISTO | 27 |
| State (convocatoria) | Comportamiento | `patterns/state/convocatoria/` | LISTO | 26 |
| Observer | Comportamiento | `patterns/observer/` | LISTO, conectado a las notificaciones | 17 + 24 de integración |

Justificación de cada uno: `docs/justificacion-patrones.md`.

---

## Frontend

| Módulo | Ruta | Estado |
|---|---|---|
| Login, registro y recuperación de contraseña | `/login`, `/registro`, `/forgot-password` | LISTO, conectado al backend real |
| Inicio con sesión | `/dashboard` | LISTO, con enlaces a convocatorias y solicitudes |
| Convocatorias disponibles | `/convocatorias` | LISTO: días restantes, mensaje si no hay ninguna, iniciar solicitud |
| Detalle de solicitud: expediente, subida de documentos, CUI y envío | `/solicitudes/:id` | LISTO |
| Mis solicitudes | `/solicitudes` | LISTO |
| Monto solicitado y aprobaciones registradas | `/solicitudes/:id` | LISTO |
| Bandeja del evaluador y de la autoridad autorizadora | `/evaluador` | LISTO |
| Asignación de evaluadores (administrador) | `/admin/asignaciones` | LISTO |
| Mis notificaciones | `/notificaciones` | LISTO |
| Auditoría (administrador) | `/admin/auditoria` | LISTO |
| Crear y publicar convocatorias (administrador) | — | **FALTANTE.** El backend existe; falta la pantalla |
| Pruebas del cliente | `src/__tests__/` | LISTO: 138 pruebas en 12 archivos, todas importan código de producción |

> Una solicitud ya recorre la aplicación de punta a punta. Lo que sigue sin
> pantalla es la administración de convocatorias: crearlas, publicarlas y
> cerrarlas solo se hace por la API.

---

## Deudas técnicas declaradas

| Qué | Dónde está documentado |
|---|---|
| Las pruebas unitarias no ejecutan SQL (el repositorio está mockeado). **Mitigado:** `demo-api.sh` corre 91 verificaciones contra PostgreSQL en el CI | ANEXO 5 §2.2 trade-off 3, ANEXO 7 §9 |
| ~~No hay Integración Continua~~ **Resuelto:** GitHub Actions (`backend` y `frontend`) es check obligatorio para fusionar | ANEXO 6 §6.1 |
| No hay entorno de Staging, y el punto 7 del DoD no se puede cumplir | ANEXO 6 §4.4 |
| `main` está 116 commits detrás de `develop` (30/10/2026) | ANEXO 6 §7.2 |
| `npm audit`: **0 vulnerabilidades** en backend y frontend desde `fix/npm-audit` (29/10/2026), con `npm audit fix` sin `--force` y sin cambios de versión mayor en dependencias directas. Antes: backend 1 crítica, 2 altas y 1 moderada; frontend 5 altas y 2 moderadas | ANEXO 6 §10 |
| ESLint solo en el frontend | ANEXO 6 §4.3 |
| JWT sin revocación. Un cambio de rol (por ejemplo, a `autorizador`) vale desde el siguiente inicio de sesión | ANEXO 5 §2.2 trade-off 5 |
| Los roles `evaluador`, `autorizador` y `administrador` se asignan por SQL; no hay pantalla ni endpoint | Manual Técnico §6 |
| **Crítico.** Con `NODE_ENV` distinto de `production` (el valor por defecto del `.env.example` es `development`), `POST /api/auth/forgot-password` devuelve el token de recuperación en la respuesta (`tokenDebug`). Cualquiera puede cambiar la contraseña de cualquier cuenta conociendo solo el correo, y saber qué correos están registrados. Verificado contra la base real el 27/10/2026 | **Corregido** en `fix/forgot-password-sin-token`: el service ya no devuelve el token, la respuesta es idéntica exista o no la cuenta y el token solo sale en la consola del servidor fuera de producción. Prueba de regresión en `password.controller.forgot.test.js` |

---

## Documentación entregada

| Documento | Archivo |
|---|---|
| Product Backlog desglosado | `docs/backlog-epics.md` |
| Justificación de patrones | `docs/justificacion-patrones.md` |
| Manual Técnico | `docs/manual-tecnico.md` |
| Análisis de impacto de los requerimientos nuevos | `docs/analisis-impacto-nuevos-requerimientos.md` |
| Manual de Usuario | `docs/manual-usuario.md` |
| ANEXO 1 — Acta de Constitución | `docs/anexo-1-acta-de-constitucion.md` |
| ANEXO 2 — Minuta de Sprint Review | `docs/anexo-2-minuta-sprint-review.md` |
| ANEXO 3 — Política de Trabajo | `docs/anexo-3-politica-de-trabajo.md` |
| ANEXO 4 — Visión del Producto y Backlog | `docs/anexo-4-vision-y-backlog.md` |
| ANEXO 5 — Documento de Diseño | `docs/anexo-5-documento-de-diseno.md` |
| ANEXO 6 — Plan de Calidad | `docs/anexo-6-plan-de-calidad.md` |
| ANEXO 7 — Plan de Pruebas | `docs/anexo-7-plan-de-pruebas.md` |

Pendientes: la Presentación Final, y en los ANEXOS 1 y 3 las decisiones
marcadas `‹DECIDIR›` y las firmas del equipo.
