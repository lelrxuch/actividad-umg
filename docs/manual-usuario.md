# Manual de Usuario

**Plataforma Nacional para la Gestión Integral de Becas**
0910-037 Análisis de Sistemas II — 8º Ciclo · Universidad Mariano Gálvez de Guatemala

| | |
|---|---|
| **Dirigido a** | Estudiantes que solicitan una beca (secciones 1 a 11) y evaluadores del Ministerio (sección 12) |
| **Versión del documento** | 1.1 |
| **Fecha** | 29/10/2026 |

Este manual explica cómo usar la plataforma desde el navegador. Para instalarla
o configurarla, consulte el **Manual Técnico** (`docs/manual-tecnico.md`).

Las pantallas de este manual son capturas reales de la aplicación funcionando
contra su base de datos, no maquetas.

---

## Contenido

1. [Antes de empezar](#1-antes-de-empezar)
2. [Crear una cuenta](#2-crear-una-cuenta)
3. [Iniciar sesión](#3-iniciar-sesión)
4. [Ver las convocatorias](#4-ver-las-convocatorias)
5. [Iniciar una solicitud](#5-iniciar-una-solicitud)
6. [Armar el expediente](#6-armar-el-expediente)
7. [Enviar la solicitud](#7-enviar-la-solicitud)
8. [Después de enviar](#8-después-de-enviar)
9. [Mis solicitudes](#9-mis-solicitudes)
10. [Recuperar la contraseña](#10-recuperar-la-contraseña)
11. [Mensajes frecuentes y qué hacer](#11-mensajes-frecuentes-y-qué-hacer)
12. [Para evaluadores: revisar y dictaminar](#12-para-evaluadores-revisar-y-dictaminar)
13. [Alcance de esta versión](#13-alcance-de-esta-versión)

---

## 1. Antes de empezar

Necesita:

- **Un correo institucional.** La plataforma solo acepta cuentas de los dominios
  autorizados por el Ministerio: `@miumg.edu.gt`, `@mineduc.gob.gt` y
  `@usac.edu.gt`. Un correo personal (Gmail, Hotmail, etc.) no se acepta.
- **Su CUI**, el número de 13 dígitos de su DPI. Se pide al enviar la solicitud.
- **Sus documentos en PDF, JPG o PNG**, de hasta 5 MB cada uno. Qué documentos
  necesita depende de la modalidad de beca (sección 6).
- **Un navegador actualizado**: Google Chrome, Mozilla Firefox o Microsoft Edge.

> **Consejo:** puede ver qué documentos pide cada modalidad **sin crear una
> cuenta**, entrando a **Convocatorias** en el menú superior. Así puede
> reunirlos antes de empezar.

---

## 2. Crear una cuenta

1. En la pantalla de inicio de sesión, elija **Crear una cuenta aquí** (o
   entre a `/registro`).
2. Complete el formulario:
   - **Nombre Completo.** Escríbalo **como aparece en su DPI**, con al menos un
     nombre y un apellido. Al enviar una solicitud, la plataforma compara este
     nombre con el del Registro Nacional de las Personas (RENAP); si no
     coincide, no podrá enviar (sección 7). No hace falta escribir el nombre
     legal completo, pero cada palabra que escriba tiene que estar en él.
   - **Correo Institucional.**
   - **Contraseña**: mínimo 8 caracteres, con al menos una mayúscula y un
     número.
   - **Confirmar Contraseña**: la misma otra vez.
3. Presione **Registrarse**.

![Formulario de registro completado](manual-usuario/img/01-registro.png)

Si todo está correcto, aparece **¡Registro exitoso!** y la plataforma lo lleva
al inicio de sesión.

![Registro exitoso](manual-usuario/img/02-registro-exitoso.png)

---

## 3. Iniciar sesión

1. Escriba su correo institucional y su contraseña.
2. Presione **Acceder al Sistema**.

![Inicio de sesión](manual-usuario/img/03-inicio-sesion.png)

Llegará a la página de inicio, con su nombre, su correo y dos accesos:
**Convocatorias abiertas** y **Mis solicitudes**. Desde aquí también puede
**Cerrar sesión**.

![Página de inicio](manual-usuario/img/04-inicio.png)

> Si escribe mal el correo o la contraseña, verá **Credenciales inválidas**. El
> mensaje es el mismo en los dos casos a propósito: así nadie puede averiguar
> qué correos están registrados.

> La sesión dura una hora. Si después de ese tiempo aparece el mensaje **Token
> inválido o expirado**, presione **Cerrar sesión** en su página de inicio y
> vuelva a entrar.

---

## 4. Ver las convocatorias

Entre a **Convocatorias** en el menú superior, o a **Convocatorias abiertas**
desde su página de inicio. Esta página se puede ver **sin iniciar sesión**.

Cada convocatoria muestra su nombre, una descripción, las fechas de apertura y
cierre, las modalidades de beca que admite y una etiqueta con su situación:

| Etiqueta | Qué significa | ¿Puede aplicar? |
|---|---|---|
| **Cierran en N días** (verde) | Está abierta y recibe solicitudes | Sí: aparece **Iniciar solicitud** |
| **Abre en N días** (naranja) | Ya se publicó, pero todavía no abre | No, todavía no |
| **Periodo vencido** (rojo) | Ya cerró | No |

![Convocatorias disponibles](manual-usuario/img/05-convocatorias.png)

Solo aparecen las convocatorias que el Ministerio ya publicó. Si no hay
ninguna, la página lo dice con un mensaje.

---

## 5. Iniciar una solicitud

1. En la convocatoria que le interesa, presione **Iniciar solicitud**.
   - Si no ha iniciado sesión, la plataforma lo lleva primero al inicio de
     sesión.
   - Si la convocatoria admite varias modalidades (por ejemplo, Posgrado y
     Universitaria), elija la suya en **Modalidad** antes de presionar el botón.
2. La plataforma crea su solicitud en estado **Borrador** y lo lleva a ella.

![Solicitud recién creada](manual-usuario/img/06-solicitud-nueva.png)

**Solo puede tener una solicitud por convocatoria.** Si ya tiene una y vuelve a
presionar **Iniciar solicitud**, la plataforma lo lleva a la que ya tiene en vez
de crear otra. La única excepción es si su solicitud anterior fue **Rechazada**:
en ese caso sí puede volver a aplicar.

---

## 6. Armar el expediente

El **expediente** es el conjunto de documentos de su solicitud. La plataforma le
muestra **exactamente** cuáles le pide su modalidad:

| Documento | Nivel medio | Universitaria | Posgrado |
|---|:---:|:---:|:---:|
| Documento Personal de Identificación (DPI) | ✓ | ✓ | ✓ |
| Título del nivel anterior | — | ✓ | ✓ |
| Carta de recomendación | ✓ | ✓ | ✓ |

Para subir un documento:

1. Junto al documento que dice **Pendiente**, presione **Subir archivo**.
2. Elija el archivo en su computadora o teléfono.
3. Cuando termine de subir, el documento pasa a **Subido:** con el nombre del
   archivo.

![Expediente con dos de tres documentos subidos](manual-usuario/img/07-expediente-parcial.png)

**Formatos aceptados:** PDF, JPG o PNG, de hasta 5 MB. Si el archivo no cumple,
el motivo aparece debajo del documento y no se guarda nada.

> Mientras la solicitud esté en **Borrador** puede subir los documentos en
> varias sesiones: lo que ya subió queda guardado. Un documento ya subido no se
> puede reemplazar desde esta versión de la plataforma.

---

## 7. Enviar la solicitud

Cuando tenga todos los documentos:

1. Escriba su **CUI** en el campo **CUI (número de su DPI)**. Puede escribirlo
   con o sin espacios: `1234 56789 0101` o `1234567890101`.
2. Presione **Enviar a evaluación**.

![Expediente completo, listo para enviar](manual-usuario/img/10-listo-para-enviar.png)

El botón **Enviar a evaluación** queda desactivado mientras el campo del CUI
esté vacío.

### Qué revisa la plataforma al enviar, y en qué orden

1. **Que el expediente esté completo.** Si falta algo, le dice exactamente qué
   y marca en rojo los documentos pendientes. La solicitud sigue en Borrador.

   ![Intento de envío con el expediente incompleto](manual-usuario/img/08-envio-incompleto.png)

2. **Que el CUI sea suyo.** La plataforma consulta el CUI en RENAP y compara el
   nombre registrado ahí con el de su cuenta. Si el CUI no existe, tiene un
   formato inválido o pertenece a otra persona, no se envía y la solicitud
   sigue en Borrador.

   Si el CUI no existe o es de otra persona, el mensaje es el mismo en los dos
   casos: *No se pudo verificar su identidad con el CUI ingresado.* Es a
   propósito: si la plataforma dijera cuál de los dos pasó, cualquiera podría
   averiguar qué CUI existen y a nombre de quién.

   ![CUI que no se pudo verificar](manual-usuario/img/09-cui-no-corresponde.png)

Si todo está bien, la solicitud pasa a **Enviada** y aparece la confirmación
**Su solicitud fue enviada.**

![Solicitud enviada](manual-usuario/img/11-enviada.png)

> **Revise todo antes de enviar.** Una vez enviada, la solicitud y su
> expediente quedan en **solo lectura**: ya no puede subir ni cambiar
> documentos.

---

## 8. Después de enviar

Su solicitud avanza por estos estados. Puede consultar en cuál está en cualquier
momento, desde **Mis solicitudes**.

| Estado | Qué significa |
|---|---|
| **Borrador** | La está preparando. Solo usted la ve |
| **Enviada** | La recibió el Ministerio y espera que un evaluador la tome |
| **En Evaluación** | Un evaluador asignado la está revisando |
| **Aprobada** | Le otorgaron la beca |
| **Rechazada** | No le otorgaron la beca |

**Aprobada** y **Rechazada** son definitivas: una resolución no se puede cambiar
después.

Solo pueden ver su expediente usted, los evaluadores asignados a su solicitud y
el personal administrador del Ministerio. Ningún otro estudiante puede abrirlo.

---

## 9. Mis solicitudes

Desde **Mis solicitudes** ve todas las suyas, con su número, su modalidad y su
estado. Haga clic en cualquiera para abrir el detalle.

![Mis solicitudes](manual-usuario/img/12-mis-solicitudes.png)

---

## 10. Recuperar la contraseña

> **Esta función está incompleta en la versión actual.** Lea esta sección antes
> de usarla.

La pantalla **Recuperar Contraseña** (enlace **¿Olvidaste tu contraseña?** en
el inicio de sesión) permite pedir la recuperación escribiendo su correo
institucional.

![Recuperar contraseña](manual-usuario/img/13-recuperar-contrasena.png)

Lo que **todavía no funciona**:

- **No se envía ningún correo.** La plataforma no tiene configurado un servidor
  de correo, así que el enlace de recuperación no le llega.
- **No hay una pantalla para escribir la contraseña nueva.** El paso final de
  la recuperación existe en el sistema, pero no desde la aplicación.

**Mientras tanto:** si olvidó su contraseña, comuníquese con el personal
administrador de la plataforma.

---

## 11. Mensajes frecuentes y qué hacer

| Mensaje | Qué pasó | Qué hacer |
|---|---|---|
| *Solo se aceptan correos institucionales: …* | Usó un correo que no es de un dominio autorizado | Regístrese con su correo institucional |
| *Ya existe una cuenta registrada con ese correo.* | Ese correo ya tiene cuenta | Inicie sesión, o recupere su contraseña (sección 10) |
| *La contraseña debe contener al menos 8 caracteres, una mayúscula y un número.* | La contraseña es débil | Use una que cumpla las tres condiciones |
| *Credenciales inválidas.* | El correo o la contraseña no son correctos | Revise los dos; el mensaje no dice cuál falló, a propósito |
| *El expediente está incompleto. Falta: …* | Le falta subir algún documento | Suba los que aparecen en rojo y vuelva a enviar |
| *El archivo supera el límite de 5 MB.* | El archivo es muy grande | Reduzca su tamaño, por ejemplo escaneando a menor resolución |
| *… el CUI debe tener exactamente 13 dígitos* | El CUI está incompleto o tiene caracteres de más | Escriba los 13 dígitos de su DPI |
| *No se pudo verificar su identidad con el CUI ingresado. …* | El CUI no existe en RENAP, es de otra persona, o el nombre de su cuenta no coincide con el de su DPI. La plataforma no dice cuál, a propósito (sección 7) | Revise que escribió bien su CUI. Si es el suyo, el nombre de su cuenta no coincide con el de RENAP |
| *El servicio de RENAP no está disponible: …* | El servicio de RENAP no respondió | Su solicitud no cambió. Intente de nuevo más tarde |
| *Token inválido o expirado* | Su sesión venció (dura una hora) | Cierre sesión y vuelva a entrar |
| *No tiene acceso a esta solicitud.* | Intentó abrir una solicitud que no es suya | Entre a **Mis solicitudes** y abra las suyas |
| *La convocatoria … está fuera de su periodo de recepción.* | La convocatoria todavía no abre o ya cerró | Revise sus fechas en **Convocatorias** |

---

## 12. Para evaluadores: revisar y dictaminar

Esta sección es para el personal del Ministerio con rol de **evaluador**. Un
evaluador solo ve y resuelve las solicitudes que el administrador le asignó.

### 12.1 Su cuenta de evaluador

El evaluador se registra igual que cualquier usuario (sección 2), con su correo
institucional. El rol de evaluador **no se elige al registrarse**: lo asigna el
administrador técnico del sistema. Hasta que se lo asignen, su cuenta funciona como la
de un estudiante.

Al iniciar sesión (sección 3), la pantalla de inicio muestra su rol y el enlace
**Bandeja del evaluador**.

![Inicio de sesión de un evaluador, con el enlace a su bandeja](manual-usuario/img/14-inicio-evaluador.png)

### 12.2 La bandeja del evaluador

Elija **Bandeja del evaluador**. Ahí aparecen, de la más antigua a la más
reciente, todas las solicitudes que le asignaron, en cualquier estado.

Si todavía no le asignaron ninguna, la bandeja lo indica:

![Bandeja sin solicitudes asignadas](manual-usuario/img/15-bandeja-vacia.png)

Cada solicitud aparece como una tarjeta con su número, su estado, la modalidad
de beca y el número de identificación del estudiante. Los botones de cada
tarjeta dependen del estado de la solicitud: la plataforma solo muestra las
acciones que se pueden hacer en ese momento.

| Estado de la solicitud | Botones que ve |
|---|---|
| **Enviada** | **Iniciar Evaluación** |
| **En Evaluación** | **Aprobar** y **Rechazar** |
| **Aprobada** o **Rechazada** | Ninguno: *Sin acciones pendientes* |

<!-- PENDIENTE (Marco): cuando la bandeja muestre los documentos del expediente
     (tarea 4 de Brayan), agregar aquí "12.3 Revisar el expediente", con captura
     de la lista de documentos y de la descarga, y renumerar 12.3 y 12.4. -->

### 12.3 Iniciar la evaluación

Una solicitud recién asignada está en **Enviada**. Presione **Iniciar
Evaluación** para tomarla.

![Solicitud asignada, en estado Enviada](manual-usuario/img/16-bandeja-enviada.png)

La solicitud pasa a **En Evaluación**, aparece la confirmación *Solicitud #…
pasada a "En Evaluación"* y la tarjeta cambia a los botones del dictamen. El
estudiante ve el nuevo estado en **Mis solicitudes**.

![Solicitud en evaluación, con los botones del dictamen](manual-usuario/img/17-en-evaluacion.png)

### 12.4 Dictaminar: aprobar o rechazar

Cuando termine de revisar la solicitud, presione **Aprobar** o **Rechazar**.

> **El dictamen es definitivo y se aplica con un solo clic.** La plataforma no
> pide confirmación, y una solicitud **Aprobada** o **Rechazada** ya no se
> puede cambiar (sección 8). Asegúrese de presionar el botón correcto.

La plataforma confirma *Solicitud #… dictaminada como APROBADA* (o
*RECHAZADA*) y la tarjeta queda sin acciones pendientes.

![Solicitud aprobada](manual-usuario/img/18-aprobada.png)

El estudiante ve la resolución en **Mis solicitudes**:

![La resolución vista por el estudiante](manual-usuario/img/19-estudiante-aprobada.png)

### 12.5 Qué puede y qué no puede hacer un evaluador

- Solo ve las solicitudes que **le asignaron**. Si intenta abrir otra, la
  plataforma responde *No tiene acceso a esta solicitud.*
- Solo puede iniciar la evaluación de una solicitud **Enviada** y solo puede
  dictaminar una que esté **En Evaluación**. La plataforma rechaza cualquier
  otro orden.
- No puede modificar el expediente del estudiante ni subir documentos.

### 12.6 Mensajes para evaluadores

| Mensaje | Qué pasó | Qué hacer |
|---|---|---|
| *No hay solicitudes asignadas para evaluar.* | Todavía no le asignaron ninguna | Espere a que el administrador le asigne una |
| *Solo evaluadores y administradores tienen bandeja de revisión.* | Su cuenta no tiene el rol de evaluador | Pida al administrador que le asigne el rol |
| *No está asignado como evaluador de esta solicitud.* | La solicitud no es de las suyas | Revise que trabaja con su cuenta, o pida la asignación |
| *Token inválido o expirado* | Su sesión venció (dura una hora) | Cierre sesión y vuelva a entrar |

<!-- PENDIENTE (Marco): cuando exista la pantalla de asignación (tarea 5 de
     Brayan), agregar aquí "## 13. Para administradores: asignar evaluadores",
     con capturas, y pasar "Alcance de esta versión" a la sección 14. -->

---

## 13. Alcance de esta versión

**Lo que cubre este manual.** El recorrido completo del **estudiante**: crear la
cuenta, ver convocatorias, iniciar una solicitud, armar el expediente, enviarlo
con validación de identidad y consultar su estado. Y el del **evaluador**: ver
las solicitudes asignadas, iniciar la evaluación y dictaminar.

**Lo que todavía no tiene pantallas**, y por eso no se describe aquí:

- **Evaluadores:** la bandeja todavía no muestra los documentos del expediente,
  ni permite escribir observaciones en el dictamen. La tarjeta identifica al
  estudiante por su número, no por su nombre.
- **Administradores:** asignar evaluadores a una solicitud y crear, publicar y
  cerrar convocatorias. La lógica existe en el sistema y se usa por la API;
  falta la interfaz. Por eso, en esta versión, la asignación de un evaluador la
  hace el administrador técnico, no desde el navegador.
- **Comités, evaluación con puntajes, cupos y reportes:** fuera del alcance de
  esta entrega.
- **Recuperación de contraseña:** incompleta (sección 10).

**Validación de identidad en el entorno de prueba.** En esta versión, la
consulta a RENAP usa un **padrón simulado**, porque el proyecto no tiene acceso
al servicio real. Solo reconoce dos ciudadanos de demostración:

| CUI | Nombre en el padrón simulado |
|---|---|
| `1234567890101` | ANA MARIA LOPEZ GARCIA |
| `2345678901202` | CARLOS PEREZ |

Para probar el envío completo, registre una cuenta con uno de esos nombres (por
ejemplo, *Ana López* o *Ana María López García*) y use el CUI correspondiente.

---

*Documento sujeto a control de versiones en el repositorio del proyecto.*
