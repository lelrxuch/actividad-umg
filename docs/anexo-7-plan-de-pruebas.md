# ANEXO 7 — Plan de Pruebas Ágil

## 1. Información General del Proyecto

| | |
|---|---|
| **Nombre del Proyecto** | Plataforma Nacional para la Gestión Integral de Becas |
| **Curso** | 0910-037 Análisis de Sistemas II — 8º Ciclo |
| **Catedrático / Product Owner / Scrum Master** | Ing. Mario Fuentes |
| **Responsable del Plan** | Marco Antonio Rolando Corado García (QA / Tester) |
| **Versión del Documento** | 1.1 |
| **Fecha de Actualización** | 27/10/2026 |

---

## 2. Propósito

Este documento describe la estrategia, el alcance y los métodos que el equipo
usa para verificar y validar la calidad del producto. No es un plan detallado
por funcionalidad: los planes de prueba de cada Historia de Usuario están en sus
Criterios de Aceptación. Este documento es la guía de alto nivel que explica
**cómo probamos** y, sobre todo, **cómo sabemos que una prueba sirve**.

El equipo adoptó un criterio más estricto que "las pruebas pasan". Una prueba
que pasa no demuestra nada por sí sola: puede estar verificando un *mock* de la
misma función que pretende probar, o afirmando algo que sería cierto incluso con
el código roto. Por eso este plan define la **verificación por mutación** como
parte del proceso, no como una práctica opcional (sección 6.3).

---

## 3. Objetivos

1. Detectar defectos lo antes posible en el ciclo (*shift-left*), no en una fase
   final de pruebas.
2. Verificar que cada Historia de Usuario cumple sus Criterios de Aceptación.
3. Asegurar que una funcionalidad nueva no rompe lo existente (regresión).
4. **Demostrar que cada prueba verifica algo real**, rompiendo a propósito el
   código que debería proteger.
5. Dar retroalimentación rápida: la suite completa del backend corre en menos de
   10 segundos, de modo que ejecutarla no es un costo que invite a saltarla.
6. Construir confianza en la calidad del incremento ante el Product Owner.

---

## 4. Alcance

### 4.1 Funcionalidades en alcance

Todo lo que entra al Product Backlog. A la fecha de esta versión, con cobertura
automatizada:

| Módulo | Qué se prueba |
|---|---|
| Autenticación y cuentas | Registro, login, perfil, validación de dominio institucional, política de contraseñas, hash bcrypt |
| Recuperación de contraseña | Generación del token, su vencimiento, su hash en base de datos, un solo uso |
| Convocatorias | Ciclo de vida Borrador → Publicada → Cerrada, campos exigidos para publicar, visibilidad según rol |
| Solicitudes | Ciclo de vida de cinco estados, transiciones válidas e inválidas, modalidades de beca |
| Autorización | Quién puede ver, enviar, evaluar y dictaminar cada solicitud |
| Expedientes y documentos | Subida, lista blanca de extensiones, límite de tamaño, nombre generado por el servidor, control de acceso a la descarga |
| Patrones de diseño | Los seis patrones, probados por separado y en su integración con los servicios |
| Manejo de errores | Que un error inesperado no filtre nombres de tabla ni de restricción al cliente |

### 4.2 Funcionalidades fuera de alcance

Se declara explícitamente, para que no se asuma cobertura que no existe:

- **Pruebas de carga y estrés.** El sistema no se ha probado con usuarios
  concurrentes. El curso no lo pide y el equipo no tiene entorno para medirlo.
- **Pruebas de extremo a extremo automatizadas en el navegador.** No hay
  Cypress ni Playwright en el repositorio. El frontend se prueba con 85 pruebas
  de componentes y servicios (ver 6.2), que reemplazan al backend por dobles. El
  flujo del estudiante se recorrió en un navegador real contra PostgreSQL al
  revisar los PR #35 y #36, pero ese recorrido no está automatizado.
- **Compatibilidad con navegadores obsoletos.** El frontend usa React 19 y Vite;
  no se prueba en Internet Explorer.
- **Infraestructura y red.** No se prueba el servidor ni la configuración de red
  subyacente.
- **Pruebas de accesibilidad formales (WCAG).** Pendiente.

---

## 5. Entorno y Configuración

### 5.1 Entorno de desarrollo (local)

Es el entorno donde hoy corre **todo** el proceso de pruebas.

| | |
|---|---|
| Sistemas operativos del equipo | Windows 10/11 y Linux. Dos integrantes trabajan en Windows |
| Runtime | Node.js 22, módulos ES |
| Base de datos | PostgreSQL 16, local o en contenedor Docker |
| Framework de pruebas | Vitest 5, única dependencia de desarrollo del backend |
| Pruebas manuales de API | Colección de Postman en `backend/tests/postman/becas-api.postman_collection.json` |
| Editor | Visual Studio Code |

La diferencia de sistema operativo **no es un detalle administrativo**: ya
produjo un defecto real. Una prueba que pasaba en Linux falló en Windows porque
`path.join` genera `exp\7\archivo.pdf` en Windows y `exp/7/archivo.pdf` en
Linux, y la ruta se guarda en base de datos. Se corrigió usando `path.posix` y
la prueba ahora verifica el separador explícitamente. Por eso el equipo
considera **requisito** que la suite se corra en ambos sistemas antes de cerrar
un Sprint, y no solo en la máquina de quien escribió el código.

### 5.2 Entorno de integración (Staging)

**No existe.** Es una carencia declarada, no un olvido.

El equipo decidió no montar un entorno compartido en la nube porque no hay
presupuesto ni tiempo de administración, y porque la Aceptación del Product
Owner se hace en la Sprint Review sobre una instalación local durante la
demostración. La consecuencia que se acepta es que **no se prueban las
condiciones de producción** (variables de entorno reales, HTTPS, latencia de
red, base de datos remota).

Mitigación: el `.env.example` documenta cada variable y la sección 4 del Manual
Técnico lista qué cambia en producción, de modo que la diferencia entre local y
producción esté escrita y no dependa de la memoria de alguien.

### 5.3 Integración Continua

**No existe.** No hay GitHub Actions ni ningún otro CI.

Hoy la suite se corre a mano antes de abrir un Pull Request y quien revisa la
corre de nuevo antes de aprobar. Esto depende de la disciplina de las personas y
es el punto más débil de este plan: nada impide mecánicamente que un PR con
pruebas rojas llegue a `develop`.

Es la mejora prioritaria identificada para el siguiente Sprint, y está
justificada: un workflow que ejecute `npm test` en cada push cuesta un archivo
de configuración y elimina la posibilidad de que el olvido de una persona rompa
`develop`.

### 5.4 Navegadores soportados

Google Chrome, Mozilla Firefox y Microsoft Edge, en su última versión.

---

## 6. Estrategia de Pruebas

La estrategia sigue la pirámide de pruebas: muchas unitarias, menos de
integración, pocas de sistema. El estado actual respeta esa forma.

```
                   ┌──────────────────┐
                   │  Nivel 3         │  solo manual: demo-api.sh y Postman
                   │  Sistema y       │  contra PostgreSQL real (15 pasos),
                   │  Aceptación      │  y la Sprint Review con el PO
                 ┌─┴──────────────────┴─┐
                 │  Nivel 2             │  285 pruebas
                 │  Integración         │  backend: 192 entre capas + 30 de controller
                 │                      │  frontend: 28 de servicios + 35 de pantallas
             ┌───┴──────────────────────┴───┐
             │  Nivel 1                     │  153 pruebas unitarias
             │  Unitarias                   │  backend 131 + frontend 22
             └──────────────────────────────┘

      Backend:  131 + 192 + 30 = 353, en 20 archivos.
      Frontend:  22 +  28 + 35 =  85, en 7 archivos.
```

La clasificación no es declarativa: sale de qué mockea cada archivo. Una prueba
sin ningún mock, que ejercita una sola unidad, es unitaria. Una que mockea solo
el repositorio, de modo que el servicio y los patrones corren de verdad, es de
integración entre capas. Una que mockea el servicio para ejercitar el controller
es de la capa de controller.

En el frontend se aplica el mismo criterio. Son unitarias las que no mockean nada
(`fechas.test.js`, `api.test.js`); de servicios, las que mockean solo el cliente
HTTP, de modo que el servicio real arma la petición e interpreta la respuesta; y
de pantallas, las que renderizan el componente real y mockean solo el servicio
que consume.

### 6.1 Niveles de prueba

#### Nivel 1 — Pruebas unitarias

- **Quién:** cada desarrollador, para el código que produce.
- **Cuándo:** mientras escribe el código. Es requisito del DoD.
- **Qué:** la pieza más pequeña aislada — una función de servicio, una clase de
  estado, un validador.
- **Herramienta:** Vitest.
- **Regla que el equipo aplica:** se mockea la **capa de datos**, nunca la
  lógica que se está probando. En las pruebas de servicios se mockea el
  repositorio y el servicio y los patrones se ejecutan de verdad. Mockear el
  objeto bajo prueba produce una prueba que no puede fallar.

#### Nivel 2 — Pruebas de integración

- **Quién:** los desarrolladores.
- **Cuándo:** después de las unitarias, para verificar la colaboración entre
  componentes.
- **Qué:** dos cosas distintas. La primera, la colaboración entre un servicio
  y los patrones que usa: se mockea **solo el repositorio**, así que el servicio
  y los patrones se ejecutan de verdad (192 pruebas). La segunda, la capa de
  controller: que un error de dominio llegue con su código HTTP, que el
  identificador del token se traduzca al del dominio, y que el catálogo de
  modalidades que viaja al frontend sea el mismo que declaran las clases de
  modalidad (30 pruebas, de las cuales 7 corren sin ningún mock).
- **Herramienta:** Vitest. Los controllers se invocan directamente con un doble
  de `res` que registra lo que respondieron; **no se levanta el servidor HTTP**
  en la suite automatizada. Eso se hace en el Nivel 3.
- **Limitación declarada:** ninguna prueba automatizada toca PostgreSQL. El
  repositorio siempre está mockeado, de modo que la suite verifica la lógica
  pero **no verifica el SQL**. Un error en una consulta, en un nombre de
  columna o en una restricción CHECK no lo atrapa `npm test`: lo atrapa el
  Nivel 3. Es la carencia más importante de la suite y está en la tabla de
  riesgos de la sección 9.

#### Nivel 3 — Pruebas de sistema y aceptación

- **Quién:** pruebas exploratorias por todo el equipo; la Aceptación formal la
  hace el Product Owner.
- **Cuándo:** cuando una Historia está lista para validación.
- **Qué:** flujos completos de extremo a extremo con el servidor levantado y
  **PostgreSQL real**. Es el único nivel donde se ejecuta SQL de verdad, y por
  eso es el único que puede atrapar un error de esquema o de consulta.
- **Herramientas:** el script `scripts/demo-api.sh`, un recorrido narrado de
  **15 pasos** que registra usuarios, crea una solicitud, sube un documento
  real, valida la identidad contra RENAP al enviar (sin CUI, con un CUI
  inexistente, con el de otra persona y con el propio), recorre el ciclo de vida
  completo hasta Aprobada, e intenta cada operación no autorizada verificando el
  código que devuelve; y la colección de Postman para exploración dirigida.
- **Es idempotente y se autoverifica.** Cada ejecución crea sus propios usuarios
  con un sufijo único, así que se puede repetir sin limpiar la base. Cada paso
  compara el código HTTP obtenido contra el esperado, imprime ✓ o ✗, y el script
  **termina con código de salida distinto de cero si algo falló**. Eso lo hace
  apto para un CI el día que exista: no hay que leer la salida para saber si
  pasó.
- **Limitación declarada:** hoy se corre a mano. Su ejecución depende de que
  alguien se acuerde antes de la Sprint Review.

#### Hallazgo del Nivel 3: el orden de las revisiones

Al escribir este recorrido se descubrió que un estudiante que pide un dictamen
sobre su propio Borrador recibe **403**, no 409. No es un defecto: la
autorización se revisa **antes** del estado, a propósito. Si se devolviera 409
("estado equivocado"), se le estaría informando que la acción le estaría
permitida en otro estado, lo cual es falso y además es información que no le
corresponde.

El 409 del patrón State solo aparece cuando quien pide la acción **sí tiene
derecho a ella** pero la pide en el estado equivocado: un evaluador asignado
dictaminando un Borrador. El recorrido verifica los dos casos por separado
(pasos 12 y 15) para que la distinción quede documentada y no se "corrija" por
error en el futuro.

### 6.2 Inventario de la suite automatizada

**Backend — 353 pruebas en 20 archivos:**

| Archivo | Pruebas | Qué cubre |
|---|---:|---|
| `solicitud.flujo-estudiante.test.js` | 32 | Expediente completo para enviar, una solicitud por convocatoria, identidad contra RENAP |
| `convocatoria.service.test.js` | 30 | Reglas de negocio de convocatorias |
| `auth.service.test.js` | 26 | Registro, login, dominios institucionales |
| `patterns/state.test.js` | 27 | Ciclo de vida de la solicitud |
| `documento.subida.test.js` | 27 | Lista blanca, tamaño, nombre en disco |
| `patterns/structural.test.js` | 26 | Adapter y Proxy |
| `convocatoria.state.test.js` | 26 | Ciclo de vida de la convocatoria y si recibe solicitudes |
| `patterns/creational.test.js` | 17 | Factory Method y Builder |
| `patterns/observer.test.js` | 17 | Notificación al estudiante |
| `solicitud.autorizacion.test.js` | 17 | Quién puede hacer qué |
| `password.validator.test.js` | 18 | Política de contraseñas |
| `expediente.documento.http.test.js` | 15 | Rutas de expedientes y documentos |
| `structural.services.test.js` | 17 | Integración de Adapter y Proxy, comparación de nombres con RENAP |
| `solicitud.service.test.js` | 12 | Integración de State y Observer |
| `creational.services.test.js` | 10 | Integración de Factory y Builder |
| `password.service.reset.test.js` | 8 | Token de recuperación |
| `solicitud.controller.errores.test.js` | 8 | Que un error no filtre información |
| `usuario.service.test.js` | 8 | Actualización de perfil |
| `solicitud.modalidades.http.test.js` | 7 | Modalidades por HTTP |
| `password.service.test.js` | 5 | Cambio de contraseña |

**Frontend — 85 pruebas en 7 archivos:**

| Archivo | Pruebas | Qué cubre |
|---|---:|---|
| `ConvocatoriasPage.test.jsx` | 20 | Días restantes, mensaje sin convocatorias, iniciar solicitud, redirección si ya existe una |
| `SolicitudPage.test.jsx` | 15 | Expediente, subida de documentos, CUI, envío, solo lectura fuera de Borrador |
| `fechas.test.js` | 15 | Días restantes sin desfase de zona horaria |
| `solicitudYDocumentoService.test.js` | 12 | Peticiones de solicitudes y documentos, errores con `faltantes` |
| `authService.test.js` | 9 | Registro, login y recuperación; propaga el mensaje del backend |
| `convocatoriaService.test.js` | 7 | Listado y detalle de convocatorias |
| `api.test.js` | 7 | Token de sesión en cada petición, aunque `localStorage` falle |

**Antecedente que conviene no olvidar.** Hasta el 22/10/2026 el frontend tenía
2 archivos con 19 pruebas que **no importaban un solo módulo de producción**: su
único `import` era de `vitest`, y cada aserción comparaba literales escritos
dentro de la propia prueba (`expect('Contraseña123' === 'Contraseña123')`). No
podían fallar ni aunque se borrara el frontend completo, y durante semanas se
contaron como cobertura. Se borraron y se reemplazaron por las de la tabla de
arriba, que sí importan el código real. Es la razón por la que la sección 6.3
insiste en que el número de pruebas no significa nada por sí solo.

### 6.3 Verificación por mutación

Es la práctica que distingue a este plan y la razón por la que el equipo confía
en sus números.

**El procedimiento:** se rompe a propósito el código de producción que una
prueba debería proteger, se corre la suite y se exige que **falle**. Si pasa, la
prueba no verifica lo que dice verificar y hay que rescribirla. Después se
restaura el código y se confirma que la suite vuelve a verde.

**Caso documentado.** Al corregir la Historia SCRUM-35 se encontró una elevación
de privilegios: cualquier usuario con sesión podía evaluar y dictaminar
**cualquier** solicitud por su id — un estudiante podía aprobar su propia beca.
Se escribió el módulo `solicitud.autorizacion.js` y se verificó así:

```bash
# Mutante: anular el control de acceso por completo.
# En backend/src/services/solicitud.autorizacion.js, poner `return;`
# como primera línea de la función autorizar().
cd backend && npm test
```

Resultado: **12 de 353 pruebas fallan**. El control de acceso está cubierto.

Esta técnica también encontró un hueco en nuestro propio trabajo. Al verificar
el manejo de errores del controller se revirtió `responderError` a una versión
que filtraba el mensaje crudo de PostgreSQL al cliente, y **ninguna prueba
falló**: se estaba exigiendo una protección que nadie verificaba. De ahí nació
`solicitud.controller.errores.test.js`.

La misma verificación se aplicó al frontend y a cada PR del flujo del
estudiante. Resultados registrados:

| Entrega | Mutantes | Atrapados | El que sobrevivió |
|---|---:|---:|---|
| Pantalla de convocatorias y pruebas del frontend (PR #34) | 10 | 10 | — |
| Flujo del estudiante, frontend (PR #35) | 12 | 12 | — |
| Reglas de envío y de una solicitud por convocatoria, backend (PR #35) | 7 | 7 | — |
| Validación de identidad contra RENAP (PR #36) | 12 | 11 | Que el `UPDATE` deje de guardar el CUI |

El único sobreviviente confirma el riesgo de la sección 9: ninguna prueba
automatizada ejecuta SQL. Ese caso se verificó contra PostgreSQL real.

Se aplicó la misma verificación a cada entrega de este proyecto: 4 mutantes en
la subida de documentos (SCRUM-42), 5 en convocatorias y 5 en la corrección de
autorización.

### 6.4 Tipos de prueba adicionales

**Pruebas de regresión.** La suite completa es la prueba de regresión y se corre
antes de cada Pull Request y antes de cada Sprint Review. Cuesta menos de 10
segundos en el backend, lo que hace que no haya excusa para no correrla. Caso
real: al cerrar el hueco de autorización, **10 pruebas existentes se rompieron**
porque pasaban actores sin derecho a la transición. Eso es exactamente lo que
debe hacer una suite de regresión: avisar que un cambio alteró el contrato.

**Pruebas de usabilidad exploratorias.** Todo el equipo usa la aplicación
buscando fallos y proponiendo mejoras. Caso real: en la revisión de SCRUM-21/28
se detectó que la pantalla redirigía inmediatamente tras un cambio de
contraseña, de modo que el mensaje de éxito nunca se alcanzaba a leer; y que la
etiqueta "Correo Institucional" se había cambiado a "Correo Electrónico", lo que
engaña al usuario porque el backend sí restringe el dominio.

**Pruebas de seguridad dirigidas.** No son exhaustivas, pero se prueban
explícitamente los vectores que aplican a este sistema: subir un archivo con
nombre `../../index.js` (travesía de directorios), subir `dpi.pdf.sh`
(extensión doble), operar sobre la solicitud de otro usuario, y pedir la
descarga de un documento ajeno.

---

## 7. Criterios de Entrada y Salida

### 7.1 Criterios de entrada

Una Historia entra a pruebas cuando:

1. El código está completo y la rama es `feature/SCRUM-XX-descripcion`.
2. Las pruebas unitarias de lo nuevo están escritas y pasan.
3. La suite completa pasa en la máquina de quien desarrolló.
4. Hay un Pull Request abierto hacia `develop` que describe qué cambió y por qué.

### 7.2 Criterios de salida

Una Historia sale de pruebas, y solo entonces se mueve a *Done*, cuando:

1. Cumple todos sus Criterios de Aceptación.
2. La suite completa pasa, **en Windows y en Linux**.
3. Al menos un mutante confirma que lo nuevo está cubierto de verdad.
4. Otro integrante aprobó el Pull Request.
5. No quedan nombres de tabla, de restricción ni mensajes crudos de PostgreSQL
   saliendo al cliente.
6. El Product Owner aceptó la funcionalidad en la Sprint Review.

---

## 8. Resultados Esperados (Deliverables)

Las pruebas no producen un documento final único, sino artefactos continuos:

| Artefacto | Dónde vive | Estado |
|---|---|---|
| Suite de pruebas automatizadas | `backend/src/__tests__/` y `frontend/src/__tests__/` | **353 + 85 pruebas**, todas contra código de producción |
| Colección de Postman | `backend/tests/postman/` | Existe |
| Script de recorrido end-to-end | `scripts/demo-api.sh` | 15 pasos, idempotente, con código de salida |
| Registro de defectos | Tablero de Jira, proyecto SCRUM, etiqueta Bug | En uso |
| Retroalimentación de revisiones | Comentarios en los Pull Requests de GitHub | En uso |
| Reporte de ejecución en CI | — | **No existe.** Ver 5.3 |
| Acta de aprobación del PO | Comentario en el ítem de Jira o en la minuta de Sprint Review | En uso |

### 8.1 Formato de un reporte de defecto

Cada defecto registrado en Jira incluye:

- Título descriptivo
- Pasos exactos para reproducirlo
- Resultado esperado contra resultado obtenido
- Capturas de pantalla o salida de consola, si aplica
- Severidad: **Crítico** (pérdida de datos o acceso indebido) · **Alto**
  (funcionalidad bloqueada) · **Medio** (hay forma de rodearlo) · **Bajo**
  (cosmético)

El defecto de elevación de privilegios de SCRUM-35 se clasificó **Crítico** y se
corrigió antes de continuar con funcionalidad nueva.

---

## 9. Riesgos del proceso de pruebas

Declarados para que el Product Owner los conozca y pueda priorizarlos:

| Riesgo | Impacto | Qué se hace hoy |
|---|---|---|
| No hay CI: un PR con pruebas rojas puede llegar a `develop` | Alto | Ejecución manual por quien desarrolla y por quien revisa |
| No hay Staging: las condiciones de producción no se prueban | Medio | Variables documentadas en el Manual Técnico |
| **Ninguna prueba automatizada ejecuta SQL.** Un error de consulta, de nombre de columna o de restricción solo lo atrapa el recorrido manual | Alto | `demo-api.sh` contra PostgreSQL real antes de cada Sprint Review |
| No se mide cobertura de código | Medio | La verificación por mutación cubre el caso crítico, pero no dice qué quedó sin probar |
| Las pruebas del frontend reemplazan al backend por dobles: no hay recorrido automatizado en navegador | Medio | Recorrido manual en navegador real al revisar cada PR del flujo |
| `npm audit` reporta 5 vulnerabilidades en el backend: 1 crítica, 2 altas y 2 moderadas | Alto | **Pendiente de atender** |

---

*Documento sujeto a control de versiones en el repositorio del proyecto.*
