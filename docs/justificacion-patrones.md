# Justificación Técnica de Patrones de Diseño

**Proyecto:** Plataforma Nacional para la Gestión Integral de Becas
**Curso:** 0910-037 Análisis de Sistemas II — 8º Ciclo
**Catedrático:** Ing. Mario Fuentes
**Universidad Mariano Gálvez de Guatemala**

Anexo 5 — Documento de Diseño de Sistema Evolutivo, sección de patrones.

---

## Resumen

El sistema implementa seis patrones de diseño, dos de cada categoría. Ninguno se incorporó por cumplir un requisito formal: cada uno resuelve un problema de diseño concreto que apareció durante el desarrollo.

| Categoría | Patrón | Implementación | Ubicación |
|---|---|---|---|
| Creacional | Factory Method | `SolicitudFactory` | `backend/src/patterns/creational/` |
| Creacional | Builder | `ExpedienteBuilder` | `backend/src/patterns/creational/` |
| Estructural | Adapter | `RenapAdapter` | `backend/src/patterns/structural/` |
| Estructural | Proxy | `DocumentoProxy` | `backend/src/patterns/structural/` |
| Comportamiento | State | `IEstadoSolicitud` + estados concretos | `backend/src/patterns/state/` |
| Comportamiento | Observer | `EmailNotificationListener` | `backend/src/patterns/observer/` |

Todos están integrados en la capa de servicios y cubiertos por pruebas unitarias verificadas mediante pruebas de mutación.

---

## 1. State — Máquina de estados de la solicitud

### ¿Qué problema resuelve?

Una solicitud de beca atraviesa una secuencia de estados: Borrador → Enviada → En Evaluación → Aprobada o Rechazada. No todas las transiciones son válidas. No se puede evaluar una solicitud que sigue en borrador, no se puede dictaminar una que nadie ha evaluado, y una solicitud ya aprobada no puede retroceder.

Sin un patrón que encapsule este comportamiento, la validación de transiciones se dispersa en condicionales repetidos dentro de cada método de la clase `Solicitud`, y cada estado nuevo obliga a modificar todos ellos.

### ¿Qué alternativas existían?

**Enum con condicionales.** Guardar el estado como un valor simple y evaluarlo con `switch` en cada operación. Es lo más inmediato de escribir, pero la lógica de qué transición es válida queda repartida por toda la clase. Con cinco estados y tres acciones son quince combinaciones que el desarrollador debe sostener mentalmente, y la clase queda abierta a modificación cada vez que el flujo cambia, violando el principio Open/Closed.

**Tabla de transiciones.** Declarar en una estructura central qué transiciones son permitidas y consultarla antes de cada cambio. Centraliza las reglas, que es una ventaja real frente a la alternativa anterior. El problema es que la tabla y el código quedan desacoplados: nada obliga a que una operación nueva la consulte, y si alguien la omite, la regla simplemente no se aplica.

### ¿Por qué se seleccionó?

Porque resuelve ambos problemas a la vez. El comportamiento queda encapsulado dentro de cada estado, no fuera de él, y la estructura del patrón hace imposible omitir una validación.

La decisión de diseño central fue **bloquear por omisión**: la clase base `IEstadoSolicitud` lanza `TransicionInvalidaError` en los tres métodos, y cada estado concreto sobrescribe únicamente la acción que habilita. No hay que enumerar lo prohibido, solo lo permitido. Si una transición no se declara, ya está bloqueada.

Se agregaron `EstadoAprobada` y `EstadoRechazada` como estados finales porque `dictaminar()` necesita un destino; sin ellos la máquina de estados quedaría abierta.

### ¿Qué ventajas aporta?

- **Extensibilidad:** agregar un estado nuevo significa crear una clase, sin modificar ningún archivo existente.
- **Verificabilidad:** la clase `Solicitud` no contiene ningún `switch` sobre el estado, lo que evidencia que el comportamiento está correctamente delegado.
- **Testeabilidad:** cada estado se prueba de forma aislada.
- **Persistencia:** la función `crearEstadoDesdeNombre()` traduce el estado almacenado en base de datos al objeto correspondiente, de modo que el patrón opera igual con datos recuperados.

Las pruebas de mutación confirmaron la cobertura: permitir el reenvío de una solicitud ya enviada hizo fallar una prueba, y persistir antes de validar la transición hizo fallar otra.

---

## 2. Observer — Notificación de cambios de estado

### ¿Qué problema resuelve?

Cuando una solicitud cambia de estado, el estudiante debe ser notificado. A futuro podrían sumarse otros interesados: el comité evaluador, un registro de auditoría, un panel de administración. Acoplar el envío de correo directamente a la lógica de transición obligaría a modificar la clase `Solicitud` cada vez que aparezca un nuevo destinatario.

### ¿Qué alternativas existían?

**Llamada directa al servicio de correo.** Invocar el envío desde `cambiarEstado()`. Es lo más simple, pero acopla el dominio a un mecanismo de notificación específico y obliga a modificar la clase por cada canal nuevo.

**Sistema de eventos global (event bus).** Publicar eventos en un bus central al que cualquier componente pueda suscribirse. Es más flexible, pero introduce indirección difícil de rastrear y complejidad de infraestructura desproporcionada para el alcance del proyecto.

### ¿Por qué se seleccionó?

Observer da el desacoplamiento necesario sin la infraestructura de un bus de eventos. La clase `Solicitud` actúa como sujeto: mantiene la lista de observadores y los notifica desde `cambiarEstado()`, lo que garantiza que **la notificación solo se emite si la transición fue aceptada**.

El transporte de correo se inyecta por constructor en `EmailNotificationListener`, de modo que conectar un servicio real de envío más adelante no requiere modificar esa clase.

### ¿Qué ventajas aporta?

- **Desacoplamiento:** el dominio no conoce los canales de notificación concretos.
- **Extensibilidad:** agregar un observador nuevo no toca la clase `Solicitud`.
- **Robustez:** si un observador falla, el error se registra y el proceso continúa. Que el servicio de correo esté caído no puede impedir que una beca quede aprobada.

---

## 3. Factory Method — Creación de solicitudes por tipo de beca

### ¿Qué problema resuelve?

El Ministerio administra becas de nivel medio, universitario y de posgrado, y cada modalidad exige documentación distinta. El código que crea una solicitud no debería conocer las clases concretas de cada tipo ni contener la lógica de qué requiere cada una.

### ¿Qué alternativas existían?

**Condicional en el punto de creación.** Un `switch` sobre el tipo que instancie la clase correspondiente. El problema es que ese condicional tiende a replicarse: aparece uno al crear, otro al validar requisitos, otro al generar reportes.

**Objeto de configuración.** Una sola clase `Solicitud` con un campo `tipo` y un mapa externo de requisitos. Evita la jerarquía de clases, pero dispersa el comportamiento del tipo entre la clase y la configuración, y no permite que cada modalidad tenga lógica propia.

### ¿Por qué se seleccionó?

`SolicitudFactory.crearSolicitud(tipo)` es el único lugar del sistema que nombra las clases concretas. El mapa de modalidades se construye a partir del getter `tipo` de cada clase, por lo que la clave de registro y el nombre de la modalidad no pueden desincronizarse.

Posgrado y universitaria se diferencian por `nivelTituloRequerido` (licenciatura frente a diversificado) en lugar de agregar un documento adicional artificial: exigen los mismos tres papeles, pero no sirve el mismo título. Es una regla de dominio real y le da al Builder algo sustantivo que validar.

### ¿Qué ventajas aporta?

- **Un solo punto de cambio:** agregar una beca técnica requiere una clase nueva y una entrada en el registro; ningún archivo cliente se modifica.
- **Ausencia de condicionales:** `solicitud.service.js` no contiene ningún `switch` sobre el tipo de beca.
- **Validación temprana:** la modalidad se valida antes de escribir en base de datos, de modo que un tipo inválido no deja una solicitud huérfana.

---

## 4. Builder — Construcción del expediente

### ¿Qué problema resuelve?

El expediente de una solicitud se arma con varios documentos que el estudiante sube en cualquier orden y a lo largo de varias sesiones. Algunos son obligatorios según la modalidad y otros opcionales. Un constructor que reciba todos los documentos de una vez sería inviable: obligaría a tenerlos todos antes de empezar y produciría una firma con numerosos parámetros posicionales.

### ¿Qué alternativas existían?

**Constructor con objeto de parámetros.** Pasar un objeto con todos los documentos. Resuelve la legibilidad de la firma, pero sigue exigiendo que el expediente se arme completo en un solo momento, y la validación de completitud queda fuera del objeto.

**Setters sobre un objeto mutable.** Crear el expediente vacío e ir asignando documentos. Permite la construcción incremental, pero deja al objeto en estado inválido durante todo el proceso y no hay un punto único donde verificar que quedó completo.

### ¿Por qué se seleccionó?

Builder permite la construcción incremental y, sobre todo, concentra la validación en un único punto: `build()`. Hasta que no se invoca, no existe un expediente; cuando se invoca, o se obtiene uno válido o se obtiene un error.

Los métodos `agregarDNI()`, `agregarTitulo()` y `agregarCarta()` son encadenables, y `build()` valida contra los requisitos que publica el tipo de beca y devuelve el expediente congelado, de modo que no pueda modificarse después de validado.

`ExpedienteIncompletoError` (400) enumera **todos** los documentos faltantes, no solo el primero, para que el estudiante no tenga que descubrirlos de uno en uno.

### ¿Qué ventajas aporta?

- **Un único punto de validación:** no existe camino en el código que produzca un expediente incompleto.
- **Inmutabilidad:** el expediente devuelto está congelado.
- **Construcción flexible:** el orden y el momento de carga de cada documento no afectan al resultado.
- **Mensajes útiles:** el error lista el conjunto completo de faltantes.

---

## 5. Adapter — Validación de identidad contra RENAP

### ¿Qué problema resuelve?

El registro de un estudiante requiere validar su identidad contra el Registro Nacional de las Personas usando su CUI. La interfaz de ese servicio externo no corresponde con lo que el dominio espera: recibe `consultarCiudadano({numeroDocumento})`, devuelve un `codigoRespuesta` en texto, el nombre repartido en cuatro campos y la fecha en formato `DD/MM/AAAA`.

Si el sistema consumiera esa interfaz directamente, cualquier cambio en la API externa se propagaría por todo el código que la usa.

### ¿Qué alternativas existían?

**Consumo directo del cliente externo.** Llamar a RENAP desde el servicio de registro. Es lo más corto, pero acopla el dominio a un formato que no controlamos y obliga a repetir la traducción en cada punto de uso.

**Función de utilidad que traduzca.** Una función suelta que convierta la respuesta. Evita parte de la duplicación, pero no define un contrato: nada impide que alguien llame al cliente externo sin pasar por ella, y no hay una interfaz que el dominio pueda exigir.

### ¿Por qué se seleccionó?

Adapter establece un contrato explícito, `IValidacionIdentidad`, que el dominio consume sin saber qué hay del otro lado. `RenapAdapter` implementa ese contrato y concentra toda la traducción: normaliza la entrada (limpia separadores y valida los trece dígitos **antes** de salir a la red), traduce la respuesta y traduce los errores.

La parte de mayor valor es la traducción de errores. RENAP devuelve el caso "no encontrado" dentro de una respuesta exitosa, con un código en el cuerpo. El adaptador lo convierte en un **error 400 no reintentable**, mientras que una caída de red se convierte en un **503 reintentable**. Esa distinción, que el servicio externo no hace, es precisamente lo que permite al sistema decidir si vale la pena reintentar.

El adaptador se consume desde `identidad.service.js`, que valida en la frontera, delega al adaptador y traduce el resultado a una decisión de dominio. La comparación del nombre declarado ignora acentos y mayúsculas, para no rechazar a quien escriba "José" en lugar de "JOSE".

### ¿Qué ventajas aporta?

- **Aislamiento:** un cambio en la API de RENAP afecta a un solo archivo.
- **Sustituibilidad:** cambiar de proveedor de validación implica escribir otro adaptador que implemente la misma interfaz.
- **Testeabilidad:** el cliente externo se simula, de modo que el flujo se prueba sin red.
- **Semántica de errores:** el sistema distingue entre un fallo del dato y un fallo del servicio.

---

## 6. Proxy — Control de acceso a documentos

### ¿Qué problema resuelve?

Los documentos de un expediente contienen datos personales. Solo deben poder descargarlos el propio estudiante, los evaluadores asignados a esa solicitud y los administradores del Ministerio. Además, los archivos no deberían leerse del almacenamiento hasta que realmente se soliciten.

Incorporar la verificación de permisos dentro del objeto que lee el archivo mezclaría dos responsabilidades distintas y haría que cada punto de acceso tuviera que recordar validar.

### ¿Qué alternativas existían?

**Verificación en el middleware de rutas.** Comprobar permisos antes de llegar al controlador. Funciona para acceso vía HTTP, pero deja desprotegido cualquier acceso interno: un servicio que lea un documento desde otro flujo esquiva el control por completo.

**Verificación dentro del objeto de documento.** Que `DocumentoReal` reciba el usuario y valide antes de leer. Centraliza el control, pero convierte a una clase de acceso a archivos en una clase que también conoce roles y reglas de autorización, violando la responsabilidad única.

### ¿Por qué se seleccionó?

Proxy permite interponer el control de acceso sin que el objeto real sepa de su existencia. `DocumentoReal` solo lee el archivo y es deliberadamente ignorante de roles. `DocumentoProxy` implementa la misma interfaz `IDocumento`, verifica permisos y delega únicamente si la verificación pasa.

Dos decisiones refuerzan la garantía:

Si el permiso falla, **el objeto real ni siquiera se instancia** — verificado en pruebas comprobando que el lector de archivos nunca se invoca. Esto cubre tanto el control de acceso como la carga diferida.

`documento.service.js` nunca construye un `DocumentoReal` directamente, por lo que no existe camino en el código que lea un archivo sin pasar por el control de acceso.

Adicionalmente, el mensaje de `AccesoDenegadoError` no revela de quién es el documento ni su nombre de archivo. Un error de autorización no debe filtrar aquello que protege.

### ¿Qué ventajas aporta?

- **Responsabilidad única:** la lectura de archivos y el control de acceso quedan separados.
- **Garantía estructural:** no hay forma de acceder al documento real sin pasar por el proxy.
- **Carga diferida:** el archivo no se lee si el acceso se deniega.
- **No divulgación:** el error de permiso no expone información del recurso protegido.

---

## Verificación de las implementaciones

Cada patrón está cubierto por pruebas unitarias que **importan y ejecutan el código de producción**, no lógica redeclarada dentro de la propia prueba.

Adicionalmente se aplicó **prueba de mutación** a los seis: se introdujeron fallos deliberados en el código y se verificó que las pruebas los detectaran. Una prueba que pasa en verde con el código roto no aporta confianza, sino una falsa sensación de ella.

| Patrón | Mutaciones introducidas | Detectadas |
|---|---|---|
| State | 3 | 3 |
| Observer | 1 | 1 |
| Factory Method | 2 | 2 |
| Builder | 3 | 3 |
| Adapter | 3 | 3 |
| Proxy | 3 | 3 |

En todos los casos el código se restauró tras la verificación.

---

## Pendientes de infraestructura

Los patrones operan a nivel de dominio y están cubiertos por pruebas, pero la persistencia de algunos de sus datos requiere cambios de esquema aún no aplicados:

- La tabla `solicitudes` no tiene columna `tipo`, por lo que la modalidad de beca se devuelve en la respuesta pero no se almacena.
- Las tablas `expedientes`, `documentos` y `solicitud_evaluadores` no existen.
- No hay almacenamiento de archivos configurado. `DocumentoReal` recibe el lector por inyección y falla de forma explícita si no se configura, en lugar de devolver contenido simulado.

Los repositorios correspondientes contienen las consultas definitivas y quedan operativos en cuanto el esquema se complete.
