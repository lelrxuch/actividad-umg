# ANEXO 6 — Plan de Aseguramiento de Calidad (QAP) Ágil

## 1. Información General del Proyecto

| | |
|---|---|
| **Nombre del Proyecto** | Plataforma Nacional para la Gestión Integral de Becas |
| **Curso** | 0910-037 Análisis de Sistemas II — 8º Ciclo |
| **Catedrático / Product Owner / Scrum Master** | Ing. Mario Fuentes |
| **Responsable de Calidad** | Todo el Equipo Scrum |
| **Redacción del plan** | Marco Antonio Rolando Corado García (QA / Tester) |
| **Versión del Documento** | 1.0 |
| **Fecha de Actualización** | 22/10/2026 |

---

## 2. Propósito y Alcance

### 2.1 Propósito

Este documento define las actividades, estándares y responsabilidades que el
equipo adopta para que cada incremento entregado al final de un Sprint sea de
alta calidad y cumpla lo que el Product Owner espera.

El enfoque es **preventivo y continuo**, no una fase final de pruebas. La calidad
se construye; no se añade al final. Eso tiene una consecuencia concreta en cómo
trabajamos: cuando se encontró un defecto crítico de seguridad en SCRUM-35, se
**detuvo el desarrollo de funcionalidad nueva** hasta corregirlo, en vez de
anotarlo para después.

### 2.2 Alcance

Aplica a todos los artefactos y procesos del proyecto, desde la redacción de una
Historia de Usuario hasta el software funcionando. Cubre el ciclo completo de
cada Sprint.

### 2.3 Qué distingue a este plan

Dos cosas, y conviene decirlas de entrada porque gobiernan todo lo demás:

**Primera: una prueba que pasa no es evidencia de calidad.** El equipo exige que
cada prueba demuestre que verifica algo, rompiendo a propósito el código que
debería proteger (verificación por mutación). Esta exigencia ya encontró un hueco
en nuestro propio trabajo: se revirtió el manejo de errores del controller a una
versión que filtraba mensajes crudos de PostgreSQL al cliente y **ninguna prueba
falló**. Se estaba exigiendo una protección que nadie verificaba.

**Segunda: este plan declara lo que no cumplimos.** Las secciones 4.4 y 9
enumeran los puntos donde el proceso real no alcanza lo que este documento
pide. Un plan de calidad que solo describe el ideal no sirve para mejorar nada.

---

## 3. Descripción de Todos los Productos (Work Products)

La calidad se mide y se aplica sobre estos productos.

### 3.1 Documentación

| Producto | Criterio de calidad | Estado |
|---|---|---|
| Visión del Producto y Product Backlog | Claridad, consistencia, completitud | Backlog con 7 Epics desglosados en Historias |
| Historias de Usuario y Criterios de Aceptación | Claros, concisos y **testeables** (INVEST) | En uso en Jira |
| Documento de Diseño (ANEXO 5) | Coherencia con la arquitectura y utilidad para desarrollar | Entregado, con diagramas validados |
| Plan de Pruebas (ANEXO 7) | Que describa el proceso real, no el ideal | Entregado |
| Manual Técnico | Que alguien ajeno al proyecto pueda instalarlo siguiéndolo | Entregado y **verificado siguiéndolo al pie de la letra** |

Sobre el último punto: el Manual Técnico no se declaró terminado hasta que se
siguió desde cero en una máquina limpia. Hacerlo encontró dos defectos reales —
`.env.example` apuntaba a una base de datos que no existe, y una variable de
entorno usada por el código no estaba documentada en ninguna parte. **Un manual
que nadie siguió no es un manual verificado.**

### 3.2 Código fuente

| Producto | Criterio de calidad |
|---|---|
| Código de la aplicación | Limpio, mantenible, legible, con las capas respetadas |
| Scripts de base de datos | Versionados e **idempotentes**: `schema.sql` se puede re-aplicar sobre una base con datos sin error y sin pérdida |
| Código de pruebas | Que exista, que cubra la lógica de negocio y que **falle cuando el código se rompe**. Las 19 pruebas del frontend no cumplen este criterio: no importan código de producción (ver §4.5) |

### 3.3 Incremento del producto

Software funcional al final de cada Sprint: usable, estable y que cumpla el DoD.

---

## 4. Normas y Prácticas Aplicables

### 4.1 Convenciones de nomenclatura

Estas no son preferencias: están en uso y se verifican en revisión de código.

| Qué | Convención | Ejemplo real del repositorio |
|---|---|---|
| Ramas de funcionalidad | `feature/SCRUM-XX-descripcion-corta` | `feature/SCRUM-42-subida-documentos` |
| Ramas de corrección | `fix/SCRUM-XX-descripcion` | `fix/SCRUM-35-autorizacion-solicitudes` |
| Ramas de documentación | `docs/descripcion` | `docs/anexo-5-diseno` |
| Archivos de capa | Nombre en punto: `recurso.capa.js` | `solicitud.controller.js`, `convocatoria.repository.js` |
| Variables y funciones | `camelCase` | `faltantesParaPublicar` |
| Clases | `PascalCase` | `ExpedienteBuilder`, `DocumentoProxy` |
| Interfaces del dominio | Prefijo `I` | `IEstadoSolicitud`, `IValidacionIdentidad` |
| Constantes de módulo | `MAYUSCULAS_CON_GUION_BAJO` | `EXTENSIONES_ADMITIDAS` |

El idioma del código es **español**, igual que el dominio. Una variable que se
llama `faltantes` y un error que dice `El expediente está incompleto` se leen
igual en el código y en la conversación con el Product Owner.

### 4.2 Estándar de documentación del código

**Todo módulo y toda función pública llevan un comentario que explica el
propósito, los parámetros y el valor de retorno.** A eso el equipo le agregó una
regla propia:

> **Cuando una decisión no es obvia, el comentario explica *por qué*, no *qué*.**

Un comentario que dice *"valida el archivo"* sobre una función llamada
`validarArchivo` no aporta nada. Los comentarios que el equipo considera
obligatorios son los que explican una decisión que alguien podría deshacer sin
darse cuenta. Ejemplos en uso:

- Por qué `multer` guarda en memoria y no en disco: con disco, un rechazo del
  service dejaría archivos basura, porque `multer` escribe **antes** de que el
  service revise algo.
- Por qué la ruta de archivos se arma con `path.posix` y no con `path.join`:
  `path.join` produce `exp\7\x.pdf` en Windows, y esa ruta se guarda en base de
  datos.
- Por qué el mismo mensaje responde a una contraseña incorrecta y a un correo
  inexistente: distinguirlos permitiría averiguar qué correos están registrados.

Esta regla se adoptó por experiencia directa: en una revisión se encontró que
alguien había borrado un bloque de documentación que explicaba la relación entre
dos patrones, probablemente por considerarlo ruido.

### 4.3 Guía de estilo y análisis estático

| Herramienta | Alcance | Estado |
|---|---|---|
| ESLint | Frontend (`frontend/eslint.config.js`) | **Configurado y en uso** |
| ESLint | Backend | **No existe.** Carencia declarada |

La inconsistencia es real y está reconocida: el backend, que es donde vive toda
la lógica de negocio y las 314 pruebas, **no tiene análisis estático**. Es una
de las mejoras pendientes de la sección 9.

### 4.4 Definición de "Hecho" (DoD)

El DoD es el estándar de calidad principal. Ninguna Historia se considera
completa si no lo cumple entero.

| | Punto del DoD | ¿Se cumple? |
|---|---|---|
| 1 | El código está en la rama `develop` del repositorio | **Sí.** Todo entra por Pull Request |
| 2 | Se crearon y pasan todas las pruebas unitarias correspondientes | **Solo en el backend:** 314 pruebas. **En el frontend NO se cumple**: los 2 archivos de prueba que existen no importan código de producción y no pueden fallar. Cobertura real del frontend: cero |
| 3 | El código fue revisado y aprobado por al menos otro miembro | **Sí.** Ningún PR se mergea sin aprobación |
| 4 | La funcionalidad cumple todos los Criterios de Aceptación | **Sí**, verificado en la Sprint Review |
| 5 | No se introdujeron nuevos defectos | **Parcial.** La suite de regresión lo cubre, pero nada lo verifica mecánicamente: no hay CI |
| 6 | La documentación técnica fue creada o actualizada | **Parcial.** Ver el defecto de `ESTADO.md` más abajo |
| 7 | La funcionalidad fue desplegada en el entorno de pruebas/staging y verificada por el Product Owner | **No se puede cumplir.** Ver abajo |

#### El punto 7 del DoD no se puede cumplir, y hay que resolverlo

**No existe un entorno de Staging.** El equipo decidió no montar uno: no hay
presupuesto ni tiempo de administración, y la aceptación del Product Owner se
hace sobre una instalación local durante la Sprint Review.

Eso deja un punto del DoD que **ninguna Historia ha cumplido nunca**, y un DoD
que no se cumple deja de ser un estándar y se vuelve decorativo. Hay dos salidas
y la decisión le corresponde al Product Owner:

- **(a)** Montar un entorno de Staging, con lo que el punto se cumple como está
  escrito.
- **(b)** Enmendar el punto 7 para que diga lo que de verdad hacemos: *"la
  funcionalidad fue demostrada al Product Owner sobre una instalación verificada
  durante la Sprint Review"*.

El equipo recomienda **(b)** para lo que resta del curso, y dejar **(a)**
registrada como mejora. Lo que no es aceptable es mantener escrito un punto que
nadie cumple.

#### Las 19 pruebas del frontend no verifican nada

Se descubrió al revisar los archivos para redactar este plan, y obliga a
corregir el punto 2 de la tabla anterior.

Los dos archivos de prueba del frontend —`usuarioService.test.js` y
`passwordService.test.js`— **no importan un solo módulo de producción**. Su
único `import` es de `vitest`, y cada aserción compara literales escritos
dentro de la propia prueba:

```js
const password = 'Contraseña123';
const confirmPassword = 'Contraseña123';
expect(password === confirmPassword).toBe(true);
```

Eso afirma que `'Contraseña123' === 'Contraseña123'`. **No puede fallar nunca**,
ni aunque se borre el frontend completo.

Es precisamente el error contra el que existe la sección 2.3 de este plan: se
contaron 19 pruebas como evidencia de calidad sin comprobar que verificaran
algo. **La cobertura real del frontend es cero**, y el total honesto del
proyecto es 314 pruebas, no 333.

Entra como la mejora de mayor prioridad del frontend: escribir pruebas que
importen `services/authService.js` y las pantallas, y demostrar con un mutante
que fallan.

#### Dos incumplimientos más, declarados

**`main` está 48 commits detrás de `develop`.** La sección 7 de este plan dice
que `main` representa siempre una versión estable y potencialmente desplegable.
Hoy `main` no representa nada: es una foto vieja del proyecto. O se promueve
`develop` a `main` al cerrar cada Sprint, o la regla está escrita de más.

**`ESTADO.md` contradecía al repositorio.** El archivo en la raíz declaraba los
seis patrones de diseño como `FALTANTE`, cuando los seis están implementados,
probados y mergeados, y además apuntaba a rutas que **no existen**
(`src/patterns/behavioral/`). Es un defecto de calidad sobre un producto de
documentación, igual de real que un defecto de código. Un documento de estado
que miente es peor que no tenerlo, porque alguien lo va a creer.

Se corrigió junto con este plan, verificando archivo por archivo, y al hacerlo
aparecieron dos cosas que nadie tenía registradas: `middlewares/error.middleware.js`
y `repositories/expediente.repository.js` son archivos de dos líneas marcados
`[FALTANTE]` que **nadie importa**, y `services/identidad.service.js` está
implementado y probado pero **solo lo importa su prueba**, de modo que la
validación de identidad contra RENAP no está conectada al flujo de envío.

---

## 5. Acciones y Tareas de Calidad

Se realizan de forma continua durante cada Sprint.

### 5.1 Revisión de código (obligatoria)

**Toda pieza de código nueva es revisada y aprobada por al menos otro miembro
del equipo antes de integrarse a `develop`.** Se usa la funcionalidad de Pull
Requests de GitHub. `main` está protegida.

Lo que se revisa, en este orden:

1. **¿Las capas se respetan?** Un controller que escribe SQL, o un repository que
   decide una regla, se devuelve sin discusión.
2. **¿Existen pruebas y verifican algo?** Un PR sin pruebas no se aprueba. Un PR
   con pruebas que pasan con el código roto tampoco.
3. **¿Se filtra información al cliente?** Un mensaje de error inesperado no debe
   llevar nombres de tabla ni de restricción.
4. **¿Quién puede ejecutar esto?** Toda operación que modifica datos ajenos tiene
   que decir explícitamente quién puede hacerla.
5. **¿El comentario explica el por qué** donde la decisión no es obvia?

El punto 4 se agregó **después** de SCRUM-35, porque ese PR se aprobó y se
mergeó con una elevación de privilegios dentro. La lección quedó en el proceso:
"hay sesión" no es lo mismo que "tiene derecho a esto".

### 5.2 Pruebas

| Actividad | Quién | Cuándo |
|---|---|---|
| Pruebas unitarias | Cada desarrollador, de su propio código | Mientras escribe |
| Pruebas de integración | Los desarrolladores | Después de las unitarias |
| **Verificación por mutación** | Quien escribió la prueba, y quien revisa el PR | Antes de aprobar |
| Recorrido de extremo a extremo | Cualquiera del equipo | Antes de la Sprint Review |
| Pruebas exploratorias de usabilidad | Todo el equipo | Durante el Sprint |
| Aceptación (UAT) | El Product Owner | Al cerrar una Historia |

El detalle completo está en el ANEXO 7. Lo que importa aquí es que **la
verificación por mutación es parte de la revisión de código**, no una actividad
aparte: quien revisa un PR puede exigir el mutante que demuestra que la prueba
nueva sirve.

### 5.3 Revisión de documentación

Los documentos clave —visión, diseño, planes— se revisan por el equipo igual que
el código: entran por Pull Request y necesitan aprobación. Por eso la
documentación de este proyecto vive en `docs/` en formato Markdown y no en
archivos binarios: **un `.docx` no se puede diferenciar en un Pull Request.**

Los diagramas, por la misma razón, se escriben en Mermaid y no se pegan como
imagen: un `.png` no muestra qué cambió entre dos versiones.

### 5.4 Auditorías de proceso

La **Sprint Retrospective** es la herramienta principal de auditoría. En cada
una se analiza:

- ¿Qué salió bien en términos de calidad?
- ¿Qué problemas de calidad encontramos, y cómo se nos pasaron?
- ¿Qué cambio concreto en el proceso evita que vuelvan a pasar?

Las acciones de mejora quedan registradas y se les da seguimiento en el Sprint
siguiente. Dos cambios de proceso que salieron de este mecanismo y ya están en
uso: el punto 4 de la lista de revisión de código (sección 5.1) y la exigencia de
correr la suite en Windows y en Linux antes de cerrar una Historia.

---

## 6. Herramientas y Métodos

| Área | Herramienta | Estado |
|---|---|---|
| Gestión del proyecto | Jira, proyecto SCRUM | En uso |
| Control de versiones | Git, repositorio en GitHub | En uso |
| Revisión de código | Pull Requests de GitHub | En uso |
| Framework de pruebas | Vitest, en backend y frontend | En uso |
| Pruebas manuales de API | Colección de Postman | En uso |
| Recorrido de extremo a extremo | `scripts/demo-api.sh` | En uso, con código de salida |
| Análisis estático | ESLint | **Solo frontend** |
| Integración Continua | — | **No existe** |
| Medición de cobertura | — | **No existe** |

### 6.1 Por qué la ausencia de CI es el problema más importante de este plan

Todo lo que este documento describe —la suite, la verificación por mutación, el
recorrido de extremo a extremo— **depende de que una persona se acuerde de
ejecutarlo.** No hay nada que impida mecánicamente que un Pull Request con
pruebas rojas llegue a `develop`.

El costo de arreglarlo es un archivo de configuración que ejecute `npm test` en
cada push. El beneficio es que el punto 5 del DoD pasa de *parcial* a *sí*. Es la
mejora de mejor relación costo/beneficio que tiene el proyecto, y está
registrada como prioritaria.

---

## 7. Procedimientos para la Administración de Configuración

### 7.1 Control de versiones

Todo el código fuente, los scripts de base de datos y la documentación técnica
están bajo control de versiones en Git. Nada que haga falta para construir o
entender el sistema vive fuera del repositorio.

Lo que **no** se versiona, a propósito:

| Qué | Por qué |
|---|---|
| `backend/.env` | Contiene credenciales. Se versiona `.env.example`, documentado |
| `backend/uploads/` | Contiene documentos de personas reales |
| `node_modules/` | Se reconstruye desde `package-lock.json` |

### 7.2 Estrategia de ramas

GitFlow simplificado:

```
main        versiones estables y potencialmente desplegables (protegida)
  ↑
develop     integración; es la rama por defecto del repositorio
  ↑
feature/*   una rama por Historia de Usuario
fix/*       una rama por corrección
docs/*      una rama por documento
```

Reglas:

1. Toda rama nace de `develop` y vuelve a `develop` por Pull Request.
2. Ningún PR se mergea sin la aprobación de otro miembro.
3. `main` está protegida y solo recibe promociones de `develop`.

**Incumplimiento declarado:** la regla 3 no se está aplicando. `main` lleva 48
commits de atraso, de modo que no representa una versión desplegable de nada.
Ver sección 4.4.

### 7.3 Gestión de entornos

| Entorno | Propósito | Estado |
|---|---|---|
| Local | Desarrollo y pruebas | En uso por los cinco integrantes, en Windows y en Linux |
| Staging | Integración y aceptación del PO | **No existe.** Ver 4.4 |
| Producción | — | Fuera del alcance del curso |

Que dos integrantes trabajen en Windows y los demás en Linux **no es un detalle
administrativo**: ya produjo un defecto real que pasaba en Linux y fallaba en
Windows, por el separador de rutas. Por eso el equipo exige correr la suite en
ambos sistemas antes de cerrar un Sprint. La heterogeneidad del equipo funciona
aquí como una prueba de portabilidad gratuita.

### 7.4 Identidades de Git

El historial contenía **14 identidades distintas para 5 personas**, porque cada
quien configuró su `user.name` y `user.email` de forma diferente y GitHub agrega
además una identidad `noreply` por cuenta. Con eso, `git shortlog` repartía los
commits de una misma persona en hasta cuatro líneas y la participación
individual se leía mal.

Se agregó un archivo **`.mailmap`** en la raíz que normaliza las identidades.
Ahora `git shortlog -sne` devuelve una línea por persona.

> **Advertencia sobre el conteo de commits.** El número de commits **no** es una
> medida de contribución y no debe usarse como tal. Un commit puede ser una
> corrección de una letra o un módulo entero con sus pruebas; un integrante
> puede haber hecho trabajo de diseño, revisión de código o pruebas manuales que
> no produce commits a su nombre. El `.mailmap` existe para que la atribución sea
> **correcta**, no para que se convierta en un ranking.

---

## 8. Métodos para Unificar y Mantener los Registros

| Registro | Dónde vive | Cómo se mantiene |
|---|---|---|
| Defectos | Jira, proyecto SCRUM, etiqueta `Bug` | Se priorizan como cualquier Historia, por el Product Owner |
| Retroalimentación de revisiones | Comentarios en los Pull Requests | Queda en el historial del PR |
| Decisiones de diseño | En el documento que corresponda, bajo control de versiones | Por Pull Request |
| Minutas de retrospectiva | Con las acciones de mejora del Sprint siguiente | Pendiente de formalizar |
| Aceptación del Product Owner | Comentario en el ítem de Jira o en la minuta de Sprint Review | En uso |

### 8.1 Clasificación de defectos

| Severidad | Criterio | Ejemplo real |
|---|---|---|
| **Crítico** | Pérdida de datos o acceso indebido a información ajena | SCRUM-35: un estudiante podía aprobar su propia beca |
| **Alto** | Funcionalidad bloqueada sin forma de rodearla | `.env.example` apuntaba a una base inexistente: nadie podía arrancar siguiendo el ejemplo |
| **Medio** | Hay forma de rodearlo | El mensaje de éxito no se alcanzaba a leer por una redirección inmediata |
| **Bajo** | Cosmético | — |

Un defecto **Crítico** detiene el desarrollo de funcionalidad nueva. No se
anota para después. Así se manejó SCRUM-35.

### 8.2 Contenido mínimo de un reporte de defecto

- Título descriptivo
- Pasos exactos para reproducirlo
- Resultado esperado contra resultado obtenido
- Capturas o salida de consola, si aplica
- Severidad

---

## 9. Roles y Responsabilidades

La calidad es responsabilidad compartida.

### 9.1 Product Owner (Ing. Mario Fuentes)

- Asegurar que las Historias y sus Criterios de Aceptación sean claros y
  testeables.
- Realizar las Pruebas de Aceptación.
- Priorizar la resolución de defectos en el Product Backlog.
- **Decidir sobre el punto 7 del DoD** (sección 4.4).

### 9.2 Scrum Master (Ing. Mario Fuentes)

- Asegurar que el equipo siga las prácticas de este plan.
- Facilitar las Sprint Retrospectives.
- Eliminar impedimentos que afecten la capacidad de producir trabajo de calidad.

> **Observación de proceso.** En este proyecto el catedrático ejerce a la vez
> como Product Owner y como Scrum Master. Scrum los separa a propósito, porque
> el PO empuja alcance y el SM protege al equipo, y una misma persona en los dos
> papeles no tiene con quién negociar esa tensión. Se registra como una
> condición del contexto académico, no como un defecto del equipo.

### 9.3 Equipo de Desarrollo

| Integrante | Rol declarado | Responsabilidad de calidad |
|---|---|---|
| Cristopher Isaí Contreras Salazar | Arquitecto de Infraestructura | Que las capas se respeten; arquitectura y componentes |
| Jonatan Santiago | Desarrollador Backend | Pruebas de su código; esquema de base de datos |
| José Daniel Pereira Cabrera | Desarrollador Backend | Pruebas de su código |
| Brayan David Sujuy Hernández | Desarrollador Frontend | Pruebas del cliente; usabilidad |
| Marco Antonio Rolando Corado García | QA / Tester | Este plan y el ANEXO 7; verificación por mutación |

Todos, sin excepción:

- Construir un incremento que cumpla el DoD.
- Escribir pruebas del código que producen, y demostrar que esas pruebas fallan
  cuando el código se rompe.
- Revisar el código de los demás de forma constructiva.
- Correr la suite completa antes de abrir un Pull Request.

---

## 10. Mejoras registradas, en orden de prioridad

| # | Mejora | Por qué | Costo |
|---:|---|---|---|
| 1 | **Integración Continua** que ejecute `npm test` en cada push | Hoy todo el proceso depende de la memoria de las personas. Pasaría el punto 5 del DoD de *parcial* a *sí* | Un archivo de configuración |
| 2 | **Resolver el punto 7 del DoD** | Un punto que nadie cumple vuelve decorativo al DoD entero | Una decisión del PO |
| 3 | **Promover `develop` a `main`** al cerrar cada Sprint | `main` lleva 48 commits de atraso y no representa nada | Un merge por Sprint |
| ~~4~~ | ~~**Corregir `ESTADO.md`**~~ | Declaraba los seis patrones como faltantes, con rutas que no existen. **Corregido junto con este plan**, y verificado archivo por archivo contra el repositorio | Hecho |
| 5 | **Atender `npm audit`** | 4 vulnerabilidades en el backend, 1 crítica | Pendiente de evaluar el impacto |
| 6 | **ESLint en el backend** | Es donde vive toda la lógica y no tiene análisis estático | Un archivo de configuración |
| 7 | **Medición de cobertura** | La verificación por mutación demuestra que lo probado sirve, pero no dice qué quedó sin probar | Configuración de Vitest |
| 8 | **Pruebas automatizadas contra PostgreSQL real** | Hoy ninguna prueba ejecuta SQL: el repositorio siempre está mockeado | Alto. Requiere base de datos en el entorno de pruebas |

### 10.1 Mejora que se adelanta a la lista: pruebas reales en el frontend

Entra por encima de las ocho anteriores porque hoy **el frontend no está
verificado en absoluto** y eso no se sabía. Ver §4.5.

---

*Documento sujeto a control de versiones en el repositorio del proyecto.*
