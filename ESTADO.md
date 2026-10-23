# Estado del proyecto

Verificado contra `develop` el **22/10/2026**. Si una fila de este archivo
contradice al repositorio, el repositorio tiene razón y esta tabla está vencida:
corregirla es parte del punto 6 del DoD.

**Leyenda:** `LISTO` implementado y con pruebas · `PARCIAL` existe pero no está
conectado o le falta una parte · `STUB` archivo creado sin lógica · `FALTANTE`
ni archivo hay

**Resumen:** 26 endpoints · 314 pruebas en 19 archivos (backend) · los 6
patrones de diseño implementados · **el frontend no tiene pruebas reales**

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
| Recuperación de contraseña | LISTO | 13 |
| Política de contraseñas | LISTO | 18 |
| Actualización de perfil | LISTO | 8 |

### Convocatorias

| Módulo | Estado | Pruebas |
|---|---|---|
| Ciclo de vida Borrador → Publicada → Cerrada | LISTO | 21 |
| Crear, editar, publicar, cerrar, listar | LISTO | 30 |

### Solicitudes

| Módulo | Estado | Pruebas |
|---|---|---|
| Ciclo de vida de 5 estados | LISTO | 27 |
| Crear, consultar, enviar, evaluar, dictaminar | LISTO | 12 |
| Autorización por acción y por actor | LISTO | 17 |
| Catálogo de modalidades por HTTP | LISTO | 7 |
| Manejo de errores del controller | LISTO | 8 |
| Validación de identidad en el flujo de envío | **PARCIAL.** `services/identidad.service.js` está implementado y probado, pero **solo lo importa su prueba**: no está conectado al envío | — |

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
| Adapter | Estructural | `patterns/structural/RenapAdapter.js` | LISTO | 26 + 15 de integración |
| Proxy | Estructural | `patterns/structural/DocumentoProxy.js` | LISTO | ↑ |
| State (solicitud) | Comportamiento | `patterns/state/` | LISTO | 27 |
| State (convocatoria) | Comportamiento | `patterns/state/convocatoria/` | LISTO | 21 |
| Observer | Comportamiento | `patterns/observer/` | LISTO | 17 |

Justificación de cada uno: `docs/justificacion-patrones.md`.

---

## Frontend

| Módulo | Estado |
|---|---|
| Login, registro y recuperación de contraseña | LISTO, conectado al backend real |
| Pantalla de perfil | LISTO |
| Pruebas del cliente | **NO EXISTEN.** Los 2 archivos en `src/__tests__/` no importan código de producción: solo comparan literales escritos dentro de la prueba, así que no pueden fallar. Cobertura real: cero |
| Convocatorias, solicitudes, expedientes, bandeja del evaluador | **FALTANTE** |

> El cliente consume hoy **3 de los 26 endpoints**. Es la brecha más grande que
> le queda al proyecto.

---

## Deudas técnicas declaradas

| Qué | Dónde está documentado |
|---|---|
| Ninguna prueba automatizada ejecuta SQL: el repositorio siempre está mockeado | ANEXO 5 §2.2 trade-off 3, ANEXO 7 §9 |
| No hay Integración Continua | ANEXO 6 §6.1 |
| No hay entorno de Staging, y el punto 7 del DoD no se puede cumplir | ANEXO 6 §4.4 |
| `main` está 48 commits detrás de `develop` | ANEXO 6 §7.2 |
| `npm audit`: 4 vulnerabilidades en el backend, 1 crítica | ANEXO 6 §10 |
| ESLint solo en el frontend | ANEXO 6 §4.3 |
| JWT sin revocación | ANEXO 5 §2.2 trade-off 5 |
| Las 19 pruebas del frontend no importan código de producción y no pueden fallar | ANEXO 6 §4.5, ANEXO 7 §6.2 |

---

## Documentación entregada

| Documento | Archivo |
|---|---|
| Product Backlog desglosado | `docs/backlog-epics.md` |
| Justificación de patrones | `docs/justificacion-patrones.md` |
| Manual Técnico | `docs/manual-tecnico.md` |
| ANEXO 5 — Documento de Diseño | `docs/anexo-5-documento-de-diseno.md` |
| ANEXO 6 — Plan de Calidad | `docs/anexo-6-plan-de-calidad.md` |
| ANEXO 7 — Plan de Pruebas | `docs/anexo-7-plan-de-pruebas.md` |

Pendientes: ANEXO 1 (Acta de Constitución), ANEXO 2 (Minutas de Sprint Review),
ANEXO 3 (Política de Trabajo), ANEXO 4 (Visión del Producto), Manual de Usuario
y Presentación Final.
