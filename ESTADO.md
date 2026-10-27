# Estado del proyecto

Verificado contra `develop` el **27/10/2026**. Si una fila de este archivo
contradice al repositorio, el repositorio tiene razón y esta tabla está vencida:
corregirla es parte del punto 6 del DoD.

**Leyenda:** `LISTO` implementado y con pruebas · `PARCIAL` existe pero no está
conectado o le falta una parte · `STUB` archivo creado sin lógica · `FALTANTE`
ni archivo hay

**Resumen:** 26 endpoints · 353 pruebas en 20 archivos (backend) · 85 pruebas
en 7 archivos (frontend) · los 6 patrones de diseño implementados · el flujo
completo del estudiante funciona desde la aplicación

---

## Backend

### Infraestructura

| Módulo | Archivo(s) | Estado |
|---|---|---|
| Conexión a base de datos | `config/db.js` | LISTO |
| Almacenamiento de documentos | `config/almacenamiento.js` | LISTO |
| Servidor y montaje de routers | `index.js` | LISTO |
| Esquema de base de datos | `db/schema.sql` | LISTO, idempotente, 5 tablas |
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
| Ciclo de vida de 5 estados | LISTO | 27 |
| Crear, consultar, enviar, evaluar, dictaminar | LISTO | 12 |
| Reglas del flujo del estudiante: expediente completo para enviar, una solicitud vigente por convocatoria, identidad al enviar | LISTO | 32 |
| Autorización por acción y por actor | LISTO | 17 |
| Catálogo de modalidades por HTTP | LISTO | 7 |
| Manejo de errores del controller | LISTO | 8 |
| Validación de identidad contra RENAP al enviar | LISTO desde SCRUM-38. El estudiante escribe su CUI al enviar; se valida contra RENAP, el nombre de RENAP se compara con el de la cuenta y el CUI validado queda en `solicitudes.cui` | Incluidas en las 32 de arriba y en las de `structural.services` |

### Expedientes y documentos

| Módulo | Estado | Pruebas |
|---|---|---|
| Subida con lista blanca y límite de 5 MB | LISTO | 27 |
| Armado y revisión del expediente | LISTO | 15 |
| Descarga con control de acceso | LISTO | 15 |
| Repositorio de expedientes | **STUB.** 2 líneas, nadie lo importa | — |

### Comités, evaluaciones y reportes

| Módulo | Estado |
|---|---|
| Crear comité, asignar evaluadores, repartir solicitudes | **FALTANTE.** La tabla `solicitud_evaluadores` existe; hoy la asignación se siembra por SQL |
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
| Observer | Comportamiento | `patterns/observer/` | LISTO | 17 |

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
| Bandeja del evaluador | — | **FALTANTE.** El backend existe; falta la pantalla |
| Crear y publicar convocatorias (administrador) | — | **FALTANTE.** El backend existe; falta la pantalla |
| Pruebas del cliente | `src/__tests__/` | LISTO: 85 pruebas en 7 archivos, todas importan código de producción |

> Las pantallas usan hoy **10 de los 26 endpoints**: todo el flujo del
> estudiante. Lo que falta para que una solicitud recorra la aplicación de punta
> a punta es la bandeja del evaluador.

---

## Deudas técnicas declaradas

| Qué | Dónde está documentado |
|---|---|
| Ninguna prueba automatizada ejecuta SQL: el repositorio siempre está mockeado | ANEXO 5 §2.2 trade-off 3, ANEXO 7 §9 |
| No hay Integración Continua | ANEXO 6 §6.1 |
| No hay entorno de Staging, y el punto 7 del DoD no se puede cumplir | ANEXO 6 §4.4 |
| `main` está 69 commits detrás de `develop` | ANEXO 6 §7.2 |
| `npm audit`: 5 vulnerabilidades en el backend (1 crítica, 2 altas, 2 moderadas) | ANEXO 6 §10 |
| ESLint solo en el frontend | ANEXO 6 §4.3 |
| JWT sin revocación | ANEXO 5 §2.2 trade-off 5 |
| **Crítico.** Con `NODE_ENV` distinto de `production` (el valor por defecto del `.env.example` es `development`), `POST /api/auth/forgot-password` devuelve el token de recuperación en la respuesta (`tokenDebug`). Cualquiera puede cambiar la contraseña de cualquier cuenta conociendo solo el correo, y saber qué correos están registrados. Verificado contra la base real el 27/10/2026 | Pendiente de corregir |

---

## Documentación entregada

| Documento | Archivo |
|---|---|
| Product Backlog desglosado | `docs/backlog-epics.md` |
| Justificación de patrones | `docs/justificacion-patrones.md` |
| Manual Técnico | `docs/manual-tecnico.md` |
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
