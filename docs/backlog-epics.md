# Desglose de los 7 Epics pendientes

Proyecto Becas · Análisis de Sistemas II · UMG
Para el planning del Sprint 2

---

## Lo primero que hay que entender

Los 6 patrones que ya están mergeados **no son un anexo aparte del sistema**. Son el
motor de tres de los Epics pendientes. Lo que falta no es la lógica, es el CRUD, los
endpoints y las pantallas que la usen.

| Lo que ya existe en `backend/src/patterns/` | A qué Epic pertenece |
|---|---|
| State (Borrador → Enviada → EnEvaluacion → Aprobada/Rechazada) | **Solicitudes** — es el ciclo de vida completo |
| Factory (nivel_medio / universitaria / posgrado) | **Solicitudes** — las tres modalidades |
| Builder (`ExpedienteBuilder`) | **Documentación** — armado del expediente |
| Proxy (`DocumentoProxy`) | **Documentación** — control de acceso a documentos |
| Adapter (RENAP) | **Solicitudes** — validación de identidad del solicitante |
| Observer (`EmailNotificationListener`) | **Aprobación/Rechazo** — notificar al estudiante |

Esto cambia la estimación: Solicitudes y Documentación están a medio camino sin que
nos hayamos dado cuenta. Lo que no está empezado de verdad es Convocatorias,
Comités y Reportes.

---

## Orden obligatorio

No es preferencia, es dependencia de datos. No se puede invertir.

```
Convocatorias
     ↓
Solicitudes ──────┐
     ↓            │
Documentación     │
     ↓            │
Comités ──────────┤
     ↓            │
Evaluaciones ←────┘
     ↓
Aprobación / Rechazo
     ↓
Reportes
```

Una solicitud se hace **a** una convocatoria. Un expediente pertenece **a** una
solicitud. Una evaluación la hace un miembro de **un comité** sobre **un expediente**.
Reportes necesita que exista todo lo anterior con datos reales dentro.

**Convocatorias es el cuello de botella de todo el proyecto.** Mientras no exista,
nadie puede crear una solicitud, y sin solicitudes no hay nada que demostrar.

---

## EPIC 1 — Convocatorias

Publicación de los períodos en que MINEDUC abre becas. Es el punto de entrada del
sistema entero.

**SCRUM-32 — Crear convocatoria**
Un administrador registra una convocatoria con nombre, descripción, tipo de beca,
fecha de apertura, fecha de cierre y cupo máximo.
- No se permite fecha de cierre anterior a la de apertura
- No se permite cupo menor o igual a cero
- La convocatoria nace en estado `Borrador`, no visible al público

**SCRUM-33 — Publicar y cerrar convocatoria**
Transición de `Borrador` → `Publicada` → `Cerrada`.
- Una convocatoria en `Borrador` no acepta solicitudes
- Una convocatoria `Cerrada` no acepta solicitudes nuevas, pero conserva las que ya
  estaban enviadas
- Solo un administrador puede publicar

**SCRUM-34 — Listar convocatorias abiertas (API)**
Endpoint público que devuelve solo las convocatorias `Publicada` cuya fecha de cierre
no ha pasado.

**SCRUM-35 — Pantalla de convocatorias disponibles**
Vista del estudiante con las convocatorias abiertas y un botón para aplicar.
- Muestra días restantes para el cierre
- Si no hay convocatorias abiertas, muestra un mensaje, no una tabla vacía

---

## EPIC 2 — Solicitudes

Ciclo de vida de la postulación. **Aquí ya está hecho el patrón State y el Factory.**
Falta persistirlo y exponerlo.

**SCRUM-36 — Crear solicitud desde una convocatoria**
El estudiante crea una solicitud en estado `Borrador` asociada a una convocatoria
abierta. Usa `SolicitudFactory` según el tipo de beca de la convocatoria.
- No se puede crear una solicitud a una convocatoria `Cerrada` o en `Borrador`
- Un estudiante no puede tener dos solicitudes activas en la misma convocatoria
- Depende de la migración del esquema (columna `tipo` + tabla `solicitudes`)

**SCRUM-37 — Guardar datos del solicitante**
Formulario con datos personales, académicos y socioeconómicos. Se puede guardar
incompleto mientras esté en `Borrador`.

**SCRUM-38 — Validar identidad contra RENAP**
Al enviar la solicitud, validar el DPI con `RenapAdapter`.
- Un DPI no encontrado bloquea el envío con error 400
- Una falla de red devuelve 503 y permite reintentar
- **El Adapter ya está implementado**, solo hay que conectarlo al flujo de envío

**SCRUM-39 — Enviar solicitud**
Transición `Borrador` → `Enviada` usando el patrón State.
- No se puede enviar si el expediente está incompleto
- Una vez enviada, los datos quedan en solo lectura
- Un intento de transición inválida devuelve `TransicionInvalidaError` con 409

**SCRUM-40 — Consultar estado de mi solicitud**
El estudiante ve en qué estado está y el historial de cambios con fecha.

---

## EPIC 3 — Documentación

Carga y custodia de los documentos de respaldo. **El Builder y el Proxy ya existen.**

**SCRUM-41 — Definir documentos requeridos por modalidad**
Cada tipo de solicitud exige una lista distinta de documentos. Posgrado pide título de
licenciatura; nivel medio pide certificado de diversificado.
- Depende de la tabla `documentos` y de la migración del esquema

**SCRUM-42 — Subir documento**
El estudiante carga un archivo contra un requisito de su expediente.
- Solo PDF, JPG y PNG
- Tamaño máximo 5 MB
- Rechazar la subida si la solicitud ya no está en `Borrador`

**SCRUM-43 — Armar y validar expediente**
Usar `ExpedienteBuilder` para verificar que no falte ningún documento obligatorio.
- Un expediente incompleto lanza `ExpedienteIncompletoError`
- El resultado se consulta antes de permitir el envío (SCRUM-39)

**SCRUM-44 — Descargar documento con control de acceso**
Usar `DocumentoProxy`. Solo el dueño de la solicitud y los evaluadores asignados
pueden descargar.
- Un usuario sin permiso recibe 403 y **el archivo real nunca se lee del disco**
- Eso último es la evidencia de uso del Proxy para la nota

---

## EPIC 4 — Comités

Los grupos de evaluadores. Es un Epic corto pero bloquea Evaluaciones.

**SCRUM-45 — Crear comité**
Un administrador crea un comité con nombre y lo asocia a una convocatoria.

**SCRUM-46 — Asignar evaluadores al comité**
Agregar y quitar usuarios con rol evaluador.
- Un comité necesita al menos dos evaluadores para poder recibir solicitudes
- Un evaluador no puede estar dos veces en el mismo comité

**SCRUM-47 — Repartir solicitudes al comité**
Al cerrar una convocatoria, distribuir las solicitudes `Enviada` entre los evaluadores
del comité y pasarlas a `EnEvaluacion`.
- Depende de la tabla `solicitud_evaluadores`
- Un evaluador no puede recibir su propia solicitud si además es estudiante

---

## EPIC 5 — Evaluaciones

El puntaje que decide quién gana la beca.

**SCRUM-48 — Definir criterios de evaluación**
Lista de criterios con su peso: promedio académico, situación socioeconómica,
pertinencia de la carrera. Los pesos deben sumar 100.

**SCRUM-49 — Registrar evaluación**
El evaluador ve el expediente y asigna un puntaje por criterio más un comentario.
- Puntaje entre 0 y 100 por criterio
- No puede evaluar una solicitud que no le fue asignada
- No puede evaluar dos veces la misma solicitud

**SCRUM-50 — Calcular puntaje final**
Promedio ponderado de todas las evaluaciones de la solicitud.
- No calcula mientras falte algún evaluador asignado
- El cálculo es del lado del servidor, nunca del frontend

**SCRUM-51 — Bandeja del evaluador**
Vista con las solicitudes que le tocan, cuáles ya evaluó y cuáles no.

---

## EPIC 6 — Aprobación / Rechazo

La decisión final. **Aquí entra el Observer.**

**SCRUM-52 — Ranquear solicitudes por puntaje**
Ordenar las solicitudes evaluadas de una convocatoria de mayor a menor puntaje final,
mostrando el cupo disponible.

**SCRUM-53 — Aprobar o rechazar solicitud**
Transición `EnEvaluacion` → `Aprobada` o `Rechazada` usando el patrón State.
- No se puede aprobar más allá del cupo de la convocatoria
- Un rechazo exige motivo escrito
- La decisión es irreversible

**SCRUM-54 — Notificar al estudiante**
Disparar `EmailNotificationListener` al cambiar de estado.
- La notificación no bloquea la transición: si el envío falla, se registra en log y la
  solicitud queda aprobada igual
- **Ese comportamiento ya está implementado en el Observer**, hay que conectarlo

**SCRUM-55 — Resolución visible al estudiante**
El estudiante ve si fue aprobado o rechazado, con el motivo si aplica.

---

## EPIC 7 — Reportes

Último, porque necesita datos reales en la base.

**SCRUM-56 — Reporte de solicitudes por convocatoria**
Totales por estado: enviadas, en evaluación, aprobadas, rechazadas.

**SCRUM-57 — Reporte de becas otorgadas**
Listado de aprobados con modalidad, puntaje y establecimiento de origen.

**SCRUM-58 — Exportar a PDF**
Cualquiera de los dos reportes anteriores, descargable.

---

## Recorte mínimo viable

Si se acaba el tiempo, esto es lo que **no se puede cortar** porque sin ello no hay
sistema que demostrar:

```
SCRUM-32  Crear convocatoria
SCRUM-33  Publicar convocatoria
SCRUM-36  Crear solicitud
SCRUM-39  Enviar solicitud
SCRUM-42  Subir documento
SCRUM-43  Validar expediente
SCRUM-47  Repartir al comité
SCRUM-49  Registrar evaluación
SCRUM-53  Aprobar / rechazar
SCRUM-56  Reporte por convocatoria
```

Son diez historias. Ese es el camino completo de una beca, de punta a punta: se
publica la convocatoria, el estudiante aplica, sube papeles, lo evalúan, lo aprueban
y sale en el reporte. Con eso se demuestra el sistema.

Lo que sí se puede recortar sin que se note: SCRUM-34, 35, 40, 41, 44, 45, 48, 50,
51, 52, 55, 57, 58.

Pero ojo con **SCRUM-44**: si se corta, se pierde la evidencia de uso del Proxy, y los
patrones valen más que las pantallas en la nota. Ese conviene dejarlo aunque sea
mínimo.

---

## Reparto sugerido

| Quién | Qué le toca |
|---|---|
| **Jonatan / Santiago** | La migración del esquema PRIMERO. Bloquea los Epics 2, 3, 4 y 5 completos. Después, el modelo de datos de convocatorias y comités. |
| **Daniel** | Cerrar PR #6 primero. Después Epic 1 backend (convocatorias) y Epic 2 (solicitudes), que es donde ya conoce el código. |
| **Brayan** | Epic 1 frontend (SCRUM-35), después los formularios de Epic 2 y la subida de archivos de Epic 3. Depende de que el contrato de API se acuerde. |
| **Marco** | Pruebas de los endpoints nuevos con el mismo estándar de mutación que usamos en los patrones. Además Epic 5 (evaluaciones), que es puro cálculo y se presta a pruebas. |
| **Cris** | Coordinación, revisión de PR, Epic 6 (aprobación/rechazo), que es donde se conecta el Observer, y Epic 7. |

---

## Regla para este sprint

Los patrones se **conectan**, no se reescriben. Si alguien necesita lógica de estados,
de armado de expediente o de acceso a documentos, importa lo que ya está en
`backend/src/patterns/`. Nadie crea su propia versión.

Si una IA le propone a alguien reimplementar un patrón porque "es más simple", la
respuesta es no. Esa evidencia de integración es lo que el curso califica.
