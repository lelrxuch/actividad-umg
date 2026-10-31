# ANEXO 4 — Visión del Producto y Product Backlog

## 1. Información General del Proyecto

| | |
|---|---|
| **Nombre del Proyecto** | Plataforma Nacional para la Gestión Integral de Becas |
| **Curso** | 0910-037 Análisis de Sistemas II — 8º Ciclo |
| **Product Owner** | Ing. Mario Fuentes |
| **Scrum Master** | Ing. Mario Fuentes |
| **Equipo de Desarrollo** | Cristopher Isaí Contreras Salazar · Jonatan Santiago · José Daniel Pereira Cabrera · Brayan David Sujuy Hernández · Marco Antonio Rolando Corado García |
| **Versión del Documento** | 1.0 |
| **Fecha de Actualización** | 22/10/2026 |

---

## 2. Visión del Producto

> **Para** los estudiantes de Guatemala que aspiran a una beca pública y para el
> personal del Ministerio de Educación que debe adjudicarlas,
>
> **quienes** hoy dependen de convocatorias que se enteran por cartelera o por
> terceros, de expedientes en papel que se entregan en persona y de un proceso de
> adjudicación cuyo criterio el solicitante no llega a conocer,
>
> **la Plataforma Nacional para la Gestión Integral de Becas**
>
> **es** una plataforma web
>
> **que** centraliza el ciclo completo de una beca —convocatoria, solicitud,
> expediente, evaluación por comité y resolución— dejando constancia verificable
> de cada paso y de quién lo dio.
>
> **A diferencia de** la gestión en papel y de los procesos que viven en hojas de
> cálculo repartidas entre oficinas,
>
> **nuestro producto** hace que el estado de una solicitud sea consultable por su
> dueño en cualquier momento, que un expediente solo lo pueda abrir quien tiene
> derecho a hacerlo, y que una resolución no se pueda revertir en silencio.

### 2.1 Qué significa cada parte de esa visión, en concreto

Para que la visión sirva de guía y no sea una frase de portada, estas son las
decisiones que el equipo tomó **porque** la visión las exige:

| Promesa de la visión | Qué se construyó para cumplirla |
|---|---|
| "el estado es consultable por su dueño en cualquier momento" | Cada consulta devuelve el estado **y las acciones que ese estado admite**, de modo que el estudiante no tiene que interpretar nada |
| "un expediente solo lo abre quien tiene derecho" | El control de acceso vive en el dominio, no en el middleware: la decisión depende de la asignación concreta, no solo del rol |
| "una resolución no se puede revertir en silencio" | `Aprobada` y `Rechazada` son estados finales: no admiten ninguna acción posterior |
| "constancia de quién dio cada paso" | Toda transición exige un actor identificado y con derecho a pedirla. Sin actor, no se autoriza nada |

---

## 3. Stakeholders y User Personas

### 3.1 Stakeholders identificados

| Stakeholder | Interés en el sistema |
|---|---|
| **Ministerio de Educación (MINEDUC)** | Adjudicar el presupuesto de becas con un proceso auditable |
| **Estudiantes solicitantes** | Saber que su solicitud fue recibida, evaluada y resuelta |
| **Comités de evaluación** | Revisar expedientes completos sin tener que perseguir documentos |
| **Instituciones educativas** | Que sus estudiantes puedan aplicar sin trámites presenciales |
| **Unidad de auditoría del Ministerio** | Verificar que cada resolución tiene sustento y responsable |
| **Catedrático del curso** | Evaluar la aplicación de Scrum, la arquitectura y los patrones de diseño |

### 3.2 User Personas

#### Persona 1 — "Ana, la estudiante del interior"

| | |
|---|---|
| **Rol** | Estudiante de último año de diversificado, aspirante a beca universitaria |
| **Contexto** | 18 años, vive en un municipio a tres horas de la cabecera departamental. Accede a internet desde el teléfono y desde una computadora compartida en el instituto |
| **Necesidades y metas** | Enterarse de una convocatoria **mientras está abierta** · Saber exactamente qué papeles le piden antes de gastar un viaje · Confirmar que su expediente quedó completo · Saber en qué va su solicitud sin tener que preguntarle a alguien |
| **Frustraciones** | *"Me enteré de la beca cuando ya había cerrado."* · *"Fui a entregar papeles y me dijeron que faltaba uno que nadie me había dicho."* · *"Entregué y nunca supe si la recibieron."* |
| **Consecuencia en el diseño** | La revisión de expediente es consultable **sin cerrar nada**, y dice **exactamente** qué documento falta, no solo que falta algo. El catálogo de documentos por modalidad es público, sin necesidad de sesión |

#### Persona 2 — "Don Julio, el evaluador del comité"

| | |
|---|---|
| **Rol** | Técnico del Ministerio, integrante de un comité de evaluación |
| **Contexto** | 47 años, trabaja desde una oficina departamental. Evalúa expedientes además de sus otras funciones, en temporadas de mucha carga |
| **Necesidades y metas** | Ver solo los expedientes que le tocan · Abrir los documentos sin pedirlos por correo · Registrar su dictamen sin que se pueda modificar después |
| **Frustraciones** | *"Me mandan carpetas que no son mías."* · *"Reviso un expediente y resulta que estaba incompleto."* |
| **Consecuencia en el diseño** | Un evaluador **no asignado** a una solicitud recibe 403 y el archivo nunca se lee del disco. Una solicitud solo llega a evaluación si su expediente está completo |

#### Persona 3 — "Licda. Marta, la administradora de becas"

| | |
|---|---|
| **Rol** | Coordinadora del programa de becas en MINEDUC |
| **Contexto** | 39 años, responsable de publicar convocatorias, conformar comités y firmar adjudicaciones. Rinde cuentas ante auditoría |
| **Necesidades y metas** | Preparar una convocatoria sin que se publique a medio hacer · No adjudicar por encima del cupo autorizado · Poder mostrar, ante auditoría, quién evaluó qué y con qué resultado |
| **Frustraciones** | *"Se publicó una convocatoria con la fecha mal y hubo que desdecirse."* · *"Me preguntan por qué se aprobó una y no tengo dónde verlo."* |
| **Consecuencia en el diseño** | Una convocatoria **nace en `Borrador`** y no es visible al público hasta que se publica · Al publicar, el sistema exige los campos obligatorios y **dice cuáles faltan** · Una convocatoria publicada ya no se edita |

---

## 4. Product Backlog

Backlog real del proyecto, con los identificadores del tablero de Jira. El estado
está verificado contra `develop` al 22/10/2026.

**Leyenda:** 🟢 terminada · 🟡 parcial · ⚪ pendiente

### Epics

| Epic | Nombre | Estado |
|---|---|---|
| **EPIC-00** | Gestión de Cuentas de Usuario | 🟢 Terminado |
| **EPIC-01** | Convocatorias | 🟢 Backend terminado, falta pantalla |
| **EPIC-02** | Solicitudes | 🟡 Envío con validación de identidad terminado; falta SCRUM-37 |
| **EPIC-03** | Documentación y Expedientes | 🟢 Backend terminado |
| **EPIC-04** | Comités de Evaluación | ⚪ Pendiente |
| **EPIC-05** | Evaluaciones | ⚪ Pendiente |
| **EPIC-06** | Aprobación y Rechazo | 🟡 El ciclo de estados existe; faltan cupo, motivo y ranqueo |
| **EPIC-07** | Reportes | ⚪ Pendiente |

### 4.1 EPIC-00 — Gestión de Cuentas de Usuario

**SCRUM-19 — Registro e inicio de sesión** · 🟢 · Prioridad **Alta**

> Como aspirante a beca, quiero registrarme con mi correo institucional para
> poder acceder a la plataforma.

Criterios de aceptación:
- El sistema solo acepta correos de los dominios institucionales configurados, y
  el mensaje de rechazo **enumera cuáles acepta**
- La contraseña se almacena como hash bcrypt, **nunca en texto plano**
- Si el correo ya existe, se recibe un error claro con código 409
- El rol se asigna del lado del servidor: un cliente no puede registrarse como
  administrador enviando el campo

**SCRUM-29 — Política de contraseñas y recuperación** · 🟢 · Prioridad **Alta**

> Como usuario que olvidó su contraseña, quiero recuperar el acceso sin tener que
> pedírselo a nadie.

Criterios de aceptación:
- La contraseña debe cumplir la política de fuerza definida
- En base de datos se guarda **el hash del token** de recuperación, no el token
- El token vence según configuración y **sirve una sola vez**
- Una contraseña incorrecta y un correo inexistente devuelven **el mismo
  mensaje**, para no revelar qué correos están registrados

**SCRUM-21 / SCRUM-28 — Conectar el frontend al backend real** · 🟢 · Prioridad **Alta**

> Como usuario, quiero iniciar sesión desde la aplicación web y no desde una
> herramienta de API.

Criterios de aceptación:
- El login consume el backend real, no datos simulados
- El mensaje de error que se muestra es el que devuelve el backend
- Un mensaje de éxito debe ser legible antes de cualquier redirección

### 4.2 EPIC-01 — Convocatorias

**SCRUM-32 — Crear convocatoria** · 🟢 · Prioridad **Alta**

> Como administradora de becas, quiero registrar una convocatoria con sus fechas,
> modalidades y cupo para poder prepararla antes de hacerla pública.

Criterios de aceptación:
- No se permite fecha de cierre anterior a la de apertura
- No se permite cupo menor o igual a cero
- La convocatoria **nace en `Borrador`** y no es visible al público
- Solo un administrador puede crearla

**SCRUM-33 — Publicar y cerrar convocatoria** · 🟢 · Prioridad **Alta**

> Como administradora, quiero publicar una convocatoria cuando esté lista y
> cerrarla cuando venza el plazo.

Criterios de aceptación:
- Una convocatoria en `Borrador` **no acepta solicitudes**
- Al publicar, si faltan campos obligatorios el sistema **dice cuáles**
- Una convocatoria publicada **ya no se puede editar**
- Una convocatoria `Cerrada` no acepta solicitudes nuevas, **pero conserva las
  que ya existían**
- Solo un administrador puede publicar o cerrar

**SCRUM-34 — Listar convocatorias (API)** · 🟢 · Prioridad **Alta**

> Como aspirante, quiero ver las convocatorias abiertas para saber a qué puedo
> aplicar.

Criterios de aceptación:
- Sin sesión de administrador se devuelven **solo las publicadas**
- El filtrado ocurre en el servidor, no en el cliente

**SCRUM-35 — Pantalla de convocatorias disponibles** · ⚪ · Prioridad **Alta**

> Como aspirante, quiero ver las convocatorias abiertas en la aplicación web.

Criterios de aceptación:
- Muestra los días restantes para el cierre
- Si no hay convocatorias abiertas, muestra un mensaje, **no una tabla vacía**

### 4.3 EPIC-02 — Solicitudes

**SCRUM-36 — Crear solicitud desde una convocatoria** · 🟢 · Prioridad **Alta**

> Como aspirante, quiero iniciar mi solicitud a una convocatoria abierta.

Criterios de aceptación:
- No se puede crear una solicitud a una convocatoria `Cerrada` o en `Borrador`
- La modalidad de beca es obligatoria y determina los documentos que se exigirán
- La solicitud **nace en `Borrador`**
- Un estudiante no puede tener dos solicitudes activas en la misma convocatoria

**SCRUM-37 — Guardar datos del solicitante** · 🟡 · Prioridad **Media**

> Como aspirante, quiero guardar mis datos mientras preparo la solicitud, sin
> enviarla todavía.

Criterios de aceptación:
- Los datos se pueden modificar mientras la solicitud esté en `Borrador`
- Una vez enviada, quedan en solo lectura

**SCRUM-38 — Validar identidad contra RENAP** · 🟢 · Prioridad **Media**

> Como administradora, quiero que el CUI del solicitante se verifique contra el
> registro nacional para no adjudicar a una identidad inexistente.

Criterios de aceptación:
- Un CUI no encontrado **bloquea el envío** con error 400
- Una falla del servicio externo devuelve 503 y **permite reintentar**
- El cambio de proveedor de validación no debe requerir tocar la lógica de
  negocio

**Hueco que no estaba documentado.** Esta historia figuraba como "solo falta
conectar el adaptador", pero el sistema **no guardaba el CUI del estudiante en
ninguna tabla**: ni `usuarios` ni el registro ni la aplicación lo pedían, así
que al enviar no había ningún CUI que validar.

Cómo quedó:
- El CUI se pide **al enviar** (`POST /api/solicitudes/:id/enviar` con
  `{ cui }`) y la pantalla de la solicitud tiene el campo.
- Además de que el CUI exista, el nombre de RENAP se compara con el del dueño
  de la solicitud, para que nadie envíe con el CUI de otra persona. La
  comparación no exige el nombre legal completo: cada palabra del nombre
  registrado tiene que aparecer en el de RENAP, con un mínimo de dos ("Ana
  López" coincide con "ANA MARIA LOPEZ GARCIA"; "Ana" sola, no).
- El CUI validado se guarda en `solicitudes.cui` (nullable), en el mismo UPDATE
  que el estado. No toca a los usuarios existentes y deja constancia de con qué
  CUI se envió cada solicitud.
- RENAP es la **última** comprobación del envío, por ser la única llamada
  externa: quién (403), estado (409), expediente (400) y luego identidad (400 o
  503). Si RENAP falla, el estado no cambia.

**SCRUM-39 — Enviar solicitud** · 🟢 · Prioridad **Alta**

> Como aspirante, quiero enviar mi solicitud cuando mi expediente esté completo.

Criterios de aceptación:
- **Solo el dueño** puede enviar su solicitud
- No se puede enviar si el expediente está incompleto
- Una vez enviada, los datos quedan en solo lectura
- Un intento de transición inválida devuelve 409
- Exige un CUI válido y del dueño (SCRUM-38), como última comprobación

**SCRUM-40 — Consultar estado de mi solicitud** · 🟢 · Prioridad **Alta**

> Como aspirante, quiero consultar en qué va mi solicitud sin preguntarle a nadie.

Criterios de aceptación:
- Devuelve el estado **y las acciones que ese estado admite**
- Un estado final devuelve una lista de acciones vacía
- Un tercero sin relación con la solicitud recibe 403

### 4.4 EPIC-03 — Documentación y Expedientes

**SCRUM-41 — Documentos requeridos por modalidad** · 🟢 · Prioridad **Alta**

> Como aspirante, quiero saber qué documentos me piden **antes** de empezar.

Criterios de aceptación:
- Consultable **sin sesión**
- El catálogo sale de las clases de modalidad, no de una lista escrita a mano,
  para que no puedan desincronizarse
- Una modalidad inexistente devuelve 400 enumerando las válidas

**SCRUM-42 — Subir documento** · 🟢 · Prioridad **Alta**

> Como aspirante, quiero subir mis documentos desde la plataforma.

Criterios de aceptación:
- Solo PDF, JPG y PNG
- Tamaño máximo 5 MB, aplicado **mientras la petición llega**
- Se rechaza la subida si la solicitud ya no está en `Borrador`
- No se puede subir a una solicitud ajena
- El nombre del archivo en disco **lo genera el servidor**
- No se permiten dos documentos del mismo tipo en una solicitud

**SCRUM-43 — Armar y validar expediente** · 🟢 · Prioridad **Alta**

> Como aspirante, quiero saber si mi expediente está completo antes de enviarlo.

Criterios de aceptación:
- La revisión informa **exactamente qué falta**
- Es consultable **sin cerrar nada**
- El armado formal de un expediente incompleto falla con 400

**SCRUM-44 — Descargar documento con control de acceso** · 🟢 · Prioridad **Crítica**

> Como evaluador asignado, quiero abrir los documentos del expediente que me
> toca, y que nadie más pueda abrirlos.

Criterios de aceptación:
- Pueden descargar: el dueño, un evaluador **asignado a esa solicitud**, y un
  administrador
- Un usuario sin permiso recibe 403 **y el archivo real nunca se lee del disco**
- La decisión no depende solo del rol, sino de la asignación concreta

### 4.5 EPIC-04 — Comités de Evaluación · ⚪ Pendiente

**SCRUM-45 — Crear comité** · Prioridad **Alta**
**SCRUM-46 — Asignar evaluadores al comité** · Prioridad **Alta**
**SCRUM-47 — Repartir solicitudes al comité** · Prioridad **Alta**

Criterios de aceptación acordados:
- Un comité necesita **al menos dos** evaluadores para poder recibir solicitudes
- Un evaluador no puede estar dos veces en el mismo comité
- **Un evaluador no puede recibir su propia solicitud** si además es estudiante

### 4.6 EPIC-05 — Evaluaciones · ⚪ Pendiente

**SCRUM-48 — Definir criterios de evaluación** · Prioridad **Media**
**SCRUM-49 — Registrar evaluación** · Prioridad **Alta**
**SCRUM-50 — Calcular puntaje final** · Prioridad **Alta**
**SCRUM-51 — Bandeja del evaluador** · Prioridad **Media**

Criterios de aceptación acordados:
- Puntaje entre 0 y 100 por criterio
- No se puede evaluar una solicitud que no le fue asignada *(ya implementado en
  la capa de autorización)*
- No se puede evaluar dos veces la misma solicitud
- No se calcula el puntaje final mientras falte algún evaluador asignado
- **El cálculo es del lado del servidor, nunca del frontend**

### 4.7 EPIC-06 — Aprobación y Rechazo · 🟡

**SCRUM-52 — Ranquear solicitudes por puntaje** · ⚪ · Prioridad **Alta**
**SCRUM-53 — Aprobar o rechazar solicitud** · 🟡 · Prioridad **Crítica**
**SCRUM-54 — Notificar al estudiante** · 🟡 · Prioridad **Media**
**SCRUM-55 — Resolución visible al estudiante** · ⚪ · Prioridad **Alta**

Criterios de aceptación:
- **No se puede aprobar más allá del cupo** de la convocatoria *(pendiente)*
- Un rechazo **exige motivo escrito** *(pendiente)*
- La decisión es **irreversible** *(ya garantizado: `Aprobada` y `Rechazada` son
  estados finales)*
- Si el envío de la notificación falla, **se registra y la transición se
  mantiene**: un aviso no puede deshacer un cambio de estado ya persistido
  *(implementado el 30/10/2026: antes se avisaba antes de guardar y ningún
  flujo conectaba el aviso; ver el análisis de impacto de los requerimientos
  nuevos)*
- Solo un evaluador asignado o un administrador puede dictaminar *(ya
  implementado)*

### 4.8 EPIC-07 — Reportes · ⚪ Pendiente

**SCRUM-56 — Reporte de solicitudes por convocatoria** · Prioridad **Media**
**SCRUM-57 — Reporte de becas otorgadas** · Prioridad **Media**
**SCRUM-58 — Exportar a PDF** · Prioridad **Baja**

Depende de que EPIC-04 a EPIC-06 existan con datos reales dentro. Es el último de
la cadena.

### 4.9 Nota sobre las estimaciones

Las estimaciones en Story Points se asignan en la Sprint Planning y no se
registran en este documento, para que no queden dos fuentes de verdad: **el
tablero de Jira es la fuente**. Este anexo registra el alcance y los criterios de
aceptación, que es lo que no cambia de un Sprint a otro.

---

## 5. Requisitos No Funcionales (NFR)

Cada requisito indica si está **verificado** (hay evidencia reproducible),
**parcial** o **aspiracional** (acordado, sin medir). Marcar como verificado algo
que nadie midió haría inservible esta tabla.

### 5.1 Seguridad

| # | Requisito | Estado | Evidencia |
|---|---|---|---|
| S-1 | Las contraseñas se almacenan con hash, nunca en texto plano | **Verificado** | Hash bcrypt en `password_hash`; 26 pruebas sobre el módulo de autenticación |
| S-2 | El sistema es inmune a inyección SQL | **Verificado** | Las 21 consultas del proyecto usan parámetros `$1`. La única interpolación en una plantilla SQL es una constante de nombres de columna definida en el módulo, nunca datos del usuario |
| S-3 | Un usuario no puede leer ni modificar datos de otro | **Verificado** | 17 pruebas de autorización; reproducido de extremo a extremo contra PostgreSQL real: dueño 200, tercero 403 |
| S-4 | Un error inesperado no revela estructura interna | **Verificado** | 8 pruebas confirman que un error sin `status` responde con mensaje genérico y no filtra nombres de tabla ni de restricción |
| S-5 | El token de recuperación de contraseña no es reutilizable y vence | **Verificado** | 13 pruebas; en base de datos se guarda su hash |
| S-6 | Un archivo subido no puede escribir fuera de su directorio ni quedar ejecutable | **Verificado** | Nombre generado por el servidor y lista blanca de extensiones; probado con `../../index.js` y `dpi.pdf.sh` |
| S-7 | La sesión de un usuario comprometido se puede cerrar de inmediato | **No se cumple** | JWT sin revocación: un token vale hasta que vence. Declarado como trade-off en el ANEXO 5 |
| S-8 | Las dependencias no tienen vulnerabilidades conocidas | **No se cumple** | `npm audit`: 4 vulnerabilidades en el backend, 1 crítica. Pendiente |

### 5.2 Rendimiento

| # | Requisito | Estado | Nota |
|---|---|---|---|
| R-1 | Las páginas cargan en menos de 3 segundos | **Aspiracional** | Sin medición |
| R-2 | El sistema soporta 100 usuarios concurrentes sin degradación | **Aspiracional** | Sin medición. Declarado **fuera de alcance** en el Plan de Pruebas: no hay entorno para medirlo |
| R-3 | La suite de pruebas corre en menos de 30 segundos | **Verificado** | 6,2 segundos para 314 pruebas. Importa porque una suite lenta se deja de correr |
| R-4 | Un archivo que excede el límite se rechaza sin cargarse completo en memoria | **Verificado** | El límite se aplica mientras la petición llega |

### 5.3 Usabilidad

| # | Requisito | Estado |
|---|---|---|
| U-1 | Un aspirante puede saber qué documentos le piden **sin registrarse** | **Verificado**: el catálogo por modalidad es público |
| U-2 | Un mensaje de error dice qué hacer, no solo que algo falló | **Verificado**: un expediente incompleto devuelve la lista de lo que falta; una modalidad inválida enumera las válidas |
| U-3 | El cliente no necesita conocer el ciclo de vida para saber qué botones habilitar | **Verificado**: cada consulta devuelve las acciones permitidas |
| U-4 | Un mensaje de éxito es legible antes de cualquier redirección | **Verificado** tras la corrección de SCRUM-21/28 |
| U-5 | La aplicación es usable desde un teléfono | **Aspiracional**: Ana accede principalmente desde el teléfono, y eso no se ha probado |

### 5.4 Compatibilidad y portabilidad

| # | Requisito | Estado |
|---|---|---|
| C-1 | Funciona en las últimas versiones de Chrome, Firefox y Edge | **Aspiracional**: no se prueba en navegadores de forma sistemática |
| C-2 | El backend corre igual en Windows y en Linux | **Verificado**, y a la fuerza: un defecto real pasaba en Linux y fallaba en Windows por el separador de rutas. Hoy la suite se exige en ambos sistemas antes de cerrar un Sprint |
| C-3 | El esquema se puede re-aplicar sobre una base con datos sin pérdida | **Verificado**: `schema.sql` es idempotente, comprobado en ejecuciones consecutivas |

### 5.5 Mantenibilidad y auditabilidad

| # | Requisito | Estado |
|---|---|---|
| M-1 | Una regla de negocio se puede probar sin levantar servidor ni base de datos | **Verificado**: 126 pruebas no usan ningún mock porque el dominio no tiene dependencias externas |
| M-5 | El código del cliente está cubierto por pruebas | **No se cumple**: los 2 archivos de prueba del frontend no importan código de producción y no pueden fallar. Cobertura real: cero |
| M-2 | Cambiar el proveedor de validación de identidad no obliga a tocar la lógica de negocio | **Verificado por necesidad**: el proyecto avanza sin credenciales de RENAP |
| M-3 | Toda transición de estado queda asociada a un actor con derecho a pedirla | **Verificado**: sin actor identificable no se autoriza nada (falla cerrado) |
| M-4 | Un error de consulta SQL se detecta automáticamente | **No se cumple**: ninguna prueba automatizada ejecuta SQL. Es la deuda técnica más seria del proyecto |

### 5.6 Disponibilidad

| # | Requisito | Estado |
|---|---|---|
| D-1 | Disponibilidad del 99,5% en horario lectivo | **Fuera de alcance** del curso: no hay entorno desplegado |
| D-2 | El sistema informa si puede alcanzar su base de datos | **Verificado**: `GET /health` responde `connected` o `disconnected` |

---

## 6. Definición de "Hecho" (Definition of Done)

Acuerdo compartido sobre qué significa que una Historia está completa. Se aplica
a **cada** Historia, sin excepciones.

- [ ] **1.** El código está integrado en la rama `develop` del repositorio.
- [ ] **2.** Se crearon y pasan todas las pruebas unitarias correspondientes.
- [ ] **3.** El código fue revisado y aprobado por al menos otro miembro del
      equipo (Code Review).
- [ ] **4.** La funcionalidad cumple todos los Criterios de Aceptación de la
      Historia.
- [ ] **5.** No se introdujeron nuevos defectos: la suite completa pasa, en
      Windows y en Linux. *(Hoy esto solo cubre el backend: el frontend no
      tiene pruebas reales.)*
- [ ] **6.** La documentación técnica necesaria fue creada o actualizada.
- [ ] **7.** La funcionalidad fue desplegada en el entorno de pruebas/staging y
      verificada por el Product Owner.

### 6.1 Condiciones que el equipo agregó al DoD

No estaban en el DoD inicial y se incorporaron por experiencia directa:

- [ ] **8.** Existe al menos un **mutante** que demuestra que las pruebas nuevas
      verifican algo: se rompe a propósito el código que deberían proteger y se
      confirma que fallan.
- [ ] **9.** Toda operación que modifica o expone datos ajenos declara
      explícitamente **quién** puede ejecutarla.

El punto 9 se agregó después de SCRUM-35, donde un Pull Request se aprobó y se
mergeó con una elevación de privilegios dentro: cualquier usuario con sesión
podía dictaminar cualquier solicitud, de modo que un estudiante podía aprobar su
propia beca. La lección quedó en el proceso y no solo en el arreglo: **"hay
sesión" no es lo mismo que "tiene derecho a esto"**.

### 6.2 El punto 7 requiere una decisión del Product Owner

**No existe un entorno de Staging**, de modo que ninguna Historia ha cumplido
nunca el punto 7. Un DoD con un punto que nadie cumple deja de ser un estándar.

Las dos salidas, detalladas en el ANEXO 6 §4.4:

- **(a)** Montar un entorno de Staging.
- **(b)** Enmendar el punto 7: *"la funcionalidad fue demostrada al Product Owner
  sobre una instalación verificada durante la Sprint Review"*.

El equipo recomienda **(b)** para lo que resta del curso, dejando **(a)**
registrada como mejora. La decisión le corresponde al Product Owner.

---

*Documento sujeto a control de versiones en el repositorio del proyecto.*
