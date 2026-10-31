# Manual Técnico

**Proyecto:** Plataforma Nacional para la Gestión Integral de Becas
**Curso:** 0910-037 Análisis de Sistemas II — 8º Ciclo
**Catedrático:** Ing. Mario Fuentes
**Universidad Mariano Gálvez de Guatemala**

Este documento es para quien tenga que instalar, correr, mantener o extender el
sistema. No explica cómo usarlo desde el navegador: eso es el Manual de Usuario.

---

## 1. Requisitos

| Componente | Versión | Para qué |
|---|---|---|
| Node.js | 22 o superior | Backend y herramientas del frontend |
| PostgreSQL | 16 | Base de datos |
| npm | el que trae Node | Gestión de dependencias |
| Git | cualquiera reciente | Control de versiones |

El backend usa módulos ES (`"type": "module"` en `package.json`), no CommonJS.
Node 22 los soporta sin configuración extra.

---

## 2. Instalación

### 2.1 Clonar

```bash
git clone https://github.com/lelrxuch/actividad-umg.git
cd actividad-umg
```

### 2.2 Base de datos

El esquema es **idempotente**: se puede correr sobre una base vacía y sobre una
que ya tiene datos, cuantas veces sea necesario, sin errores y sin pérdida. Eso
permite re-aplicarlo después de cada cambio de esquema sin recrear la base.

Con PostgreSQL instalado localmente:

```bash
createdb becas_db
psql -d becas_db -f backend/db/schema.sql
```

Con Docker, si no se quiere instalar PostgreSQL en la máquina:

```bash
docker run -d --name becas-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=becas_db \
  -p 5432:5432 postgres:16

docker exec -i becas-pg psql -U postgres -d becas_db < backend/db/schema.sql
```

Si el puerto 5432 ya está ocupado por una instalación local, usar `-p 5433:5432`
y poner `DB_PORT=5433` en el `.env`.

Verificar que las cinco tablas existen:

```bash
psql -d becas_db -c "\dt"
```

Deben aparecer: `usuarios`, `convocatorias`, `solicitudes`, `documentos` y
`solicitud_evaluadores`.

### 2.3 Backend

```bash
cd backend
cp .env.example .env
npm install
```

Editar `.env`. Los valores que **hay que cambiar sí o sí**:

| Variable | Qué poner |
|---|---|
| `DB_NAME` | El nombre de la base que se creó (`becas_db`) |
| `DB_PASSWORD` | La contraseña real del usuario de PostgreSQL |
| `JWT_SECRET` | Cualquier cadena larga y aleatoria. **Nunca** la del ejemplo |

Las demás variables:

| Variable | Por defecto | Qué controla |
|---|---|---|
| `PORT` | 4000 | Puerto del backend |
| `DB_HOST` / `DB_PORT` / `DB_USER` | localhost / 5432 / postgres | Conexión a PostgreSQL |
| `JWT_EXPIRES_IN` | 1h | Vigencia del token de sesión |
| `RESET_TOKEN_EXPIRES_MIN` | 30 | Vigencia del token de recuperación de contraseña |
| `NODE_ENV` | development | En producción **siempre** `production` |
| `CORS_ORIGIN` | http://localhost:5173 | Origen del frontend al que se le permite llamar |
| `ALLOWED_EMAIL_DOMAINS` | miumg.edu.gt,mineduc.gob.gt,usac.edu.gt | Dominios de correo aceptados en registro y login |
| `UPLOADS_DIR` | `backend/uploads/` | Dónde se guardan los documentos subidos. Viene comentada en el `.env.example` |

`ALLOWED_EMAIL_DOMAINS` es **la única lista de dominios del proyecto**. El
frontend no valida dominios: muestra el mensaje de error que devuelve el
backend. Agregar o quitar una institución es editar esta línea, no tocar código.

Arrancar:

```bash
npm run dev     # con recarga automática
npm start       # sin recarga
```

Comprobar que levantó y que alcanza la base:

```bash
curl http://localhost:4000/health
```

Debe responder `{"status":"ok","db":"connected","timestamp":"..."}`. Si dice
`"db":"disconnected"`, el problema está en el `.env` o en que PostgreSQL no está
corriendo.

### 2.4 Frontend

```bash
cd frontend
npm install
npm run dev
```

Queda en `http://localhost:5173`. La URL del backend está en
`frontend/src/services/api.js`.

---

## 3. Estructura del proyecto

```
actividad-umg/
├── backend/
│   ├── db/
│   │   └── schema.sql              esquema completo, idempotente
│   ├── tests/postman/              colección de Postman
│   └── src/
│       ├── index.js                monta los routers y arranca el servidor
│       ├── config/                 conexión a base de datos, almacenamiento de archivos
│       ├── routes/                 qué URL llama a qué controller
│       ├── controllers/            traducen entre HTTP y los services
│       ├── services/               reglas de negocio
│       ├── repositories/           acceso a PostgreSQL, el único que escribe SQL
│       ├── middlewares/            autenticación por JWT
│       ├── validators/             reglas transversales (política de contraseñas)
│       ├── patterns/               los patrones de diseño implementados
│       └── __tests__/              pruebas automatizadas
└── frontend/
    └── src/
        ├── App.jsx                 rutas de la aplicación
        ├── pages/                  pantallas
        ├── services/               llamadas al backend
        ├── layouts/                estructura común
        └── styles/                 tema visual (paleta MINEDUC)
```

El flujo de una petición siempre va en el mismo sentido:

```
ruta  →  controller  →  service  →  repository  →  PostgreSQL
```

Ninguna capa salta a otra. Un controller no escribe SQL, un repository no
conoce HTTP. El porqué de esta separación está en el Documento de Arquitectura.

---

## 4. Variables de entorno en producción

Lo que cambia respecto a desarrollo:

- `NODE_ENV=production`. Algunas respuestas de diagnóstico se callan en
  producción.
- `JWT_SECRET` tiene que ser un valor generado al azar, largo, y distinto del de
  desarrollo. Si se filtra, cualquiera puede firmar tokens válidos.
- `CORS_ORIGIN` debe ser el dominio real del frontend, no `localhost`.
- `DB_PASSWORD` nunca va en el repositorio. El archivo `.env` está en
  `.gitignore` por esa razón.

---

## 5. Pruebas

```bash
cd backend  && npm test        # 408 pruebas en 23 archivos
cd frontend && npx vitest run  #  85 pruebas en  7 archivos
```

En el frontend hay que usar `npx vitest run` y no `npm test`: el script `test`
del `package.json` del frontend arranca en modo vigilancia y no termina solo.

### 5.1 Verificación por mutación

El equipo no da por buena una prueba solo porque pase. Para confirmar que una
prueba verifica algo, se rompe a propósito el código que debería proteger y se
comprueba que falla. Si no falla, la prueba no sirve.

Ejemplo, sobre el control de acceso a solicitudes:

```bash
# En backend/src/services/solicitud.autorizacion.js, poner un `return;`
# como primera línea de la función autorizar(). Después:
cd backend && npm test
```

Deben caer 10 pruebas. Si pasan todas, el control de acceso no está cubierto.

El detalle completo de la estrategia está en el Plan de Pruebas.

### 5.2 Integración continua

`.github/workflows/ci.yml` corre en cada pull request hacia `develop` o `main`
y en cada push a `develop`. Tiene dos jobs, en `ubuntu-latest` con Node 22:

| Job | Qué hace |
|---|---|
| `backend` | Levanta un PostgreSQL 16 (`becas_db`), aplica `db/schema.sql`, corre `npm test`, arranca el backend con las variables de `.env.example` y ejecuta `scripts/demo-api.sh` contra él |
| `frontend` | `npx vitest run`, `npx eslint src` y `npx vite build` |

`demo-api.sh` sale con el número de verificaciones fallidas, así que una sola
falla tumba el job. Es el único paso que ejecuta SQL de verdad: `npm test`
mockea el repositorio. Si falla, el log del backend queda al final del job.

Para reproducir una falla en local se corren los mismos comandos de la tabla.

---

## 6. La API

34 endpoints. Los marcados **público** no requieren token; los demás esperan la
cabecera `Authorization: Bearer <token>`.

### Autenticación

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/auth/register` | público |
| POST | `/api/auth/login` | público |
| GET | `/api/auth/perfil` | sesión |
| POST | `/api/auth/forgot-password` | público |
| POST | `/api/auth/reset-password` | público |
| PUT | `/api/usuarios/:id/perfil` | sesión |
| GET | `/api/usuarios/evaluadores` | administrador — `[{ id, nombre, email }]` de los evaluadores, por nombre |

### Convocatorias

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/convocatorias` | público — sin sesión de administrador devuelve solo las publicadas |
| GET | `/api/convocatorias/:id` | público |
| POST | `/api/convocatorias` | administrador |
| PATCH | `/api/convocatorias/:id` | administrador, solo en Borrador |
| POST | `/api/convocatorias/:id/publicar` | administrador |
| POST | `/api/convocatorias/:id/cerrar` | administrador |

### Solicitudes

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/solicitudes/tipos` | público |
| GET | `/api/solicitudes/tipos/:tipo/documentos` | público |
| POST | `/api/solicitudes` | estudiante |
| GET | `/api/solicitudes` | estudiante — las suyas |
| GET | `/api/solicitudes/asignadas` | evaluador — las que tiene asignadas; autorizador — las Pendiente de Autorización; administrador — todas las Enviadas, En Evaluación o Pendiente de Autorización |
| GET | `/api/solicitudes/:id` | dueño, evaluador asignado, administrador, o autorizador si está Pendiente de Autorización. Incluye `montoSolicitado`, `requiereDobleAprobacion` y `aprobaciones` |
| POST | `/api/solicitudes/:id/evaluadores` | administrador, solo en Enviada o En Evaluación |
| PATCH | `/api/solicitudes/:id/monto` | dueño, solo en Borrador — `{ monto }` en quetzales, mayor que 0, dos decimales como máximo |
| POST | `/api/solicitudes/:id/enviar` | dueño — 400 si no tiene monto |
| POST | `/api/solicitudes/:id/evaluar` | evaluador asignado |
| POST | `/api/solicitudes/:id/dictamen` | evaluador asignado — si el monto pasa de Q10,000 y aprueba, queda en Pendiente de Autorización |
| POST | `/api/solicitudes/:id/autorizacion` | autorizador, solo en Pendiente de Autorización — `{ aprobado }`; 403 si fue quien aprobó la evaluación |

**Doble aprobación.** Una solicitud de más de Q10,000 necesita dos aprobaciones:
la del evaluador (`dictamen`) y la de la autoridad autorizadora (`autorizacion`).
Q10,000 exactos siguen el flujo de una sola aprobación. El rol `autorizador` se
da en la base (`UPDATE usuarios SET rol='autorizador' ...`), igual que
`evaluador` y `administrador`. Cada aprobación y su registro en `aprobaciones` se
guardan en la misma transacción que el cambio de estado
(`config/transaccion.js`): si una falla, no queda ninguna.

### Expedientes y documentos

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/expedientes/revision` | sesión — informa qué falta, sin cerrar nada |
| POST | `/api/expedientes` | sesión |
| POST | `/api/documentos` | dueño de la solicitud o administrador |
| GET | `/api/documentos/solicitud/:solicitudId` | dueño, evaluador asignado o administrador |
| GET | `/api/documentos/:id/descargar` | lo decide `DocumentoProxy` |
| GET | `/api/documentos/:id/permiso` | sesión |

### Asignación de evaluadores

`POST /api/solicitudes/:id/evaluadores` con cuerpo `{ "evaluadorId": 77 }`. Los
ids de evaluador salen de `GET /api/usuarios/evaluadores`, que solo responde al
administrador (403 a cualquier otro rol, 401 sin sesión) y devuelve
`[{ id, nombre, email }]` ordenado por nombre, nunca `password_hash`.
Responde `201` con `{ solicitudId, evaluador: { id, nombre, email } }`. Las
comprobaciones van en este orden y la primera que falla decide la respuesta:

| Código | Cuándo |
|---|---|
| 403 | Quien pide no es administrador. Se revisa antes de buscar la solicitud, para no revelar con un 404 qué ids existen |
| 400 | `evaluadorId` falta o no es un entero positivo |
| 404 | La solicitud no existe |
| 400 | El usuario no existe o su rol no es `evaluador` |
| 409 | La solicitud no está en Enviada ni En Evaluación |
| 409 | El evaluador ya estaba asignado a esa solicitud |

Solo Enviada y En Evaluación admiten evaluadores porque un evaluador asignado
puede descargar el expediente: en Borrador lo vería antes de que el estudiante
lo envíe, y en Aprobada o Rechazada ganaría acceso a datos personales sin nada
que evaluar. La regla vive en los estados (`IEstadoSolicitud#admiteEvaluadores`,
prohibida por omisión), no en el service.

### Notificaciones

| Método | Ruta | Quién |
|---|---|---|
| GET | `/api/notificaciones` | sesión — los avisos del usuario del token, del más reciente al más viejo, con `noLeidas` |
| PATCH | `/api/notificaciones/:id/leida` | sesión — solo un aviso propio; uno ajeno o inexistente responde 404 |

Cada transición de una solicitud (enviar, evaluar, dictaminar) deja un aviso
para el **estudiante dueño**, no para quien hizo el cambio. Lo genera el patrón
Observer: `NotificacionRegistradaListener` se engancha a la solicitud en cada
transición, con el canal `app`.

El orden importa y está cubierto por pruebas: primero se guarda el estado nuevo
y **después** se notifica. Si guardar falla, no sale ningún aviso; si el aviso
falla (por ejemplo, la tabla no existe), la transición responde igual y el
estado ya quedó guardado. La falla queda en la consola del servidor:

```
[solicitud 42] el observer NotificacionRegistradaListener falló: …
```

Agregar un canal (correo, SMS) es crear otro `NotificacionRegistradaListener`
con su función `entregar`: la fila se registra antes de entregar, y queda
marcada como enviada o con el error.

### Auditoría

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/auditoria` | administrador — los registros, del más reciente al más viejo. Filtros opcionales: `?solicitudId=` y `?limite=` (1 a 500, 200 por defecto) |

Se audita, con usuario, operación, solicitud y fecha: cada cambio de estado
(anterior y nuevo), cada aprobación (etapa y resultado), el cambio de monto
(anterior y nuevo), la asignación de un evaluador, la subida de un documento y
la validación de identidad al enviar. Cada registro se escribe **en la misma
transacción** que la operación: si no se puede auditar, la operación se
deshace. `auditoria.service.js` guarda solo los campos de una lista blanca por
operación (nunca contraseñas ni tokens) y enmascara el CUI.

### Códigos de respuesta

El sistema usa los mismos significados en todos los módulos:

| Código | Significa |
|---|---|
| 400 | Los datos de la petición no sirven. Cuando falta algo, la respuesta incluye un arreglo `faltantes` |
| 401 | No hay sesión, o el token venció |
| 403 | Hay sesión, pero ese usuario no puede hacer eso |
| 404 | El recurso no existe |
| 409 | La operación contradice el estado actual. Es el error del patrón State |
| 413 | El archivo supera los 5 MB |
| 500 | Error inesperado. **El mensaje nunca sale al cliente**, solo al log |

Un error sin `status` se considera inesperado y su mensaje se reemplaza por uno
genérico, porque los errores de PostgreSQL traen nombres de tablas y de
restricciones.

---

## 7. Modelo de datos

Cinco tablas.

### usuarios
Cuentas del sistema. `rol` distingue `estudiante`, `evaluador` y
`administrador`. La contraseña se guarda como hash bcrypt en `password_hash`;
**nunca en texto plano**. `reset_token_hash` y `reset_token_expira` sostienen la
recuperación de contraseña.

### convocatorias
`estado` acepta `Borrador`, `Publicada` o `Cerrada`, con restricción CHECK.
`modalidades` es un arreglo de texto con los tipos de beca que admite. Hay un
CHECK que impide que `fecha_cierre` sea anterior a `fecha_apertura`.

### solicitudes
`estado` acepta `Borrador`, `Enviada`, `En Evaluación`, `Pendiente de
Autorización`, `Aprobada` o `Rechazada`. `monto_solicitado` (quetzales, nulo
hasta que el estudiante lo fije, CHECK mayor que 0) decide si hace falta la
segunda aprobación. `tipo` es la modalidad de beca. `convocatoria_id` es opcional, con
`ON DELETE SET NULL`: borrar una convocatoria no borra las solicitudes.

### documentos
Los papeles del expediente. `ruta_archivo` guarda una ruta **relativa** al
directorio de subidas, siempre con barras normales. Un índice único sobre
`(solicitud_id, tipo)` impide dos documentos del mismo tipo en una solicitud.

### solicitud_evaluadores
Qué evaluador revisa qué solicitud. Es la tabla que consulta `DocumentoProxy`
para decidir quién puede ver un expediente. Se llena con
`POST /api/solicitudes/:id/evaluadores`; la llave primaria
`(solicitud_id, evaluador_id)` es la que decide el 409 de "ya asignado".

### aprobaciones
Quién aprobó o rechazó, en qué etapa (`evaluacion` o `autorizacion`) y cuándo.
`UNIQUE (solicitud_id, etapa)`: una sola decisión por etapa. La regla de que
la misma persona no dé las dos se valida en `solicitud.autorizacion.js` con
esta tabla.

### auditoria
Quién (`usuario_id`), qué (`operacion`), sobre qué solicitud, cuándo
(`creado_en`) y qué cambió (`detalle`, JSONB: `{campo, antes, despues}` u otros
campos según la operación). **Inmutable:** los triggers `auditoria_sin_cambios`
y `auditoria_sin_truncate` rechazan UPDATE, DELETE y TRUNCATE, aunque los pida
la propia aplicación. Sin `ON DELETE CASCADE` hacia `solicitudes`: una solicitud
con auditoría no se puede borrar. El repositorio solo tiene INSERT y SELECT.

### notificaciones
Un aviso por cambio de estado y por canal: la solicitud, el destinatario (el
estudiante dueño), el estado anterior y el nuevo, el canal, el mensaje, si se
entregó o con qué error falló, y cuándo se leyó. La fila se crea **antes** de
intentar la entrega, para que un canal caído no pierda el evento.
`GET /api/notificaciones` trae los 50 más recientes; `noLeidas` cuenta todos
los no leídos con una consulta aparte.

### Cadenas que no se pueden tocar

Los valores de `solicitudes.estado`, `solicitudes.tipo` y `convocatorias.estado`
se comparan en el código por coincidencia **exacta** de cadena:

```
solicitudes.estado     Borrador · Enviada · En Evaluación · Aprobada · Rechazada
solicitudes.tipo       nivel-medio · universitaria · posgrado
convocatorias.estado   Borrador · Publicada · Cerrada
```

`En Evaluación` lleva espacio y tilde. `nivel-medio` lleva guion, no guion bajo.
Cambiar una letra rompe el patrón State y la restricción CHECK a la vez.

---

## 8. Almacenamiento de archivos

Los documentos subidos van al directorio que indica `UPLOADS_DIR`, o a
`backend/uploads/` si no se define. Ese directorio está en `.gitignore`: contiene
documentos de personas y no se versiona.

El nombre del archivo en disco **lo genera el servidor**. Del nombre que manda el
navegador solo se conserva la extensión, y únicamente si está en la lista blanca
(`.pdf`, `.jpg`, `.jpeg`, `.png`). Un nombre como `../../index.js` o
`dpi.pdf.sh` no puede escribir fuera del directorio ni dejar un ejecutable. El
nombre que el usuario ve se guarda aparte, en `documentos.nombre_archivo`, donde
no toca el sistema de archivos.

Límite de 5 MB por archivo, aplicado por `multer` mientras la petición llega, no
después de cargarla entera en memoria.

---

## 9. Problemas frecuentes

| Síntoma | Causa | Qué hacer |
|---|---|---|
| `/health` dice `db: disconnected` | Credenciales mal, o PostgreSQL apagado | Revisar el `.env`; `systemctl start postgresql` o `docker start becas-pg` |
| El navegador bloquea las llamadas | `CORS_ORIGIN` no coincide con la URL del frontend | Igualarlos; por defecto `http://localhost:5173` |
| `Cannot GET /api/...` | El servidor corre con código viejo | Matar el proceso y volver a arrancar |
| 401 en todo | Token vencido | Volver a iniciar sesión; dura lo que diga `JWT_EXPIRES_IN` |
| 403 sobre la propia solicitud | El id del token no se está traduciendo | El JWT guarda el id en `sub`; el dominio lo llama `id` |
| Las pruebas del frontend no terminan | `npm test` arranca en modo vigilancia | Usar `npx vitest run` |
| `address already in use` al levantar Docker | PostgreSQL local ocupa el 5432 | `-p 5433:5432` y `DB_PORT=5433` |

---

## 10. Convenciones del repositorio

- Una rama por historia, desde `develop`, nombrada `feature/SCRUM-XX-descripcion`
- Todo entra por Pull Request hacia `develop`. `main` solo recibe versiones estables
- Ningún PR se mergea sin que otra persona lo apruebe
- Archivos de rutas y servicios en punto: `usuario.routes.js`, no `usuarios.js`
- Las pruebas importan el código de producción; mockear lo que se está probando no cuenta

---

## 11. Datos de demostración

El script `scripts/sembrar-demo.sh` deja la base lista para la defensa, sin
tener que crear cuentas y convocatorias a mano.

### 11.1 Qué crea

- Una convocatoria **"Beca Demo Defensa"**: publicada, abierta desde el día
  anterior, con cierre a 90 días y las tres modalidades (`nivel-medio`,
  `universitaria`, `posgrado`).
- Una cuenta de **estudiante**, "Ana María López García", cuyo nombre coincide
  con el CUI de prueba `1234567890101`. El CUI se ingresa al enviar la solicitud,
  no al registrarse.
- Una cuenta de **evaluador** y una de **administrador**, con el rol puesto por
  SQL.

Las cuentas se crean mediante `POST /api/auth/register`, para que la contraseña
quede cifrada por el backend. Los roles de evaluador y administrador se asignan
por SQL, porque todavía no existe un endpoint para eso.

### 11.2 Cómo correrlo

Requisitos: backend levantado, `schema.sql` aplicado y `psql` disponible en el
PATH. En Windows se corre desde Git Bash.

```bash
export DB_NAME=becas_db DB_USER=postgres DB_PASSWORD=<clave de PostgreSQL>
bash scripts/sembrar-demo.sh
```

El script apunta por defecto a `http://localhost:4000`, igual que el backend. Si
el backend corre en otro puerto, definir `API_URL`. Variables opcionales:
`API_URL`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`, `DB_PASSWORD`,
`PASS_DEMO` y `CONV_DIAS_CIERRE`.

### 11.3 Se puede repetir

El script se puede correr todas las veces que haga falta sin duplicar nada. Si
una cuenta ya existe se omite, y si la convocatoria ya existe se reabre y se
alarga su cierre. Conviene correrlo de nuevo unos días antes de la defensa.

### 11.4 Cuentas de demostración

Al terminar, el script imprime estas cuentas:

| Rol | Correo | Contraseña |
|---|---|---|
| Estudiante | `ana.lopez@miumg.edu.gt` | `Demo12345!` |
| Evaluador | `evaluador.demo@miumg.edu.gt` | `Demo12345!` |
| Administrador | `admin.demo@miumg.edu.gt` | `Demo12345!` |

Son cuentas de demostración y no deben usarse fuera de un entorno de pruebas.

---

*Última actualización: 22 de octubre de 2026*

## Datos de demostración

El script `scripts/sembrar-demo.sh` deja la base lista para la defensa.

### Qué crea

- Una convocatoria **"Beca Demo Defensa"**: publicada, abierta desde ayer, con cierre a 90 días y las tres modalidades (`nivel-medio`, `universitaria`, `posgrado`).
- Una cuenta de **estudiante**, "Ana María López García", cuyo nombre coincide con el CUI de prueba `1234567890101`. El CUI se ingresa al enviar la solicitud, no al registrarse.
- Una cuenta de **evaluador** y una de **administrador**, con el rol puesto por SQL.

Las cuentas se crean mediante `POST /api/auth/register`, para que la contraseña quede cifrada por el backend.

### Cómo correrlo

Requisitos: backend levantado, `schema.sql` aplicado y `psql` disponible en el PATH.

```bash
export API_URL=http://localhost:4000
export DB_NAME=becas_db DB_USER=postgres DB_PASSWORD=<clave de PostgreSQL>
bash scripts/sembrar-demo.sh
```

Si el backend corre en el puerto `4000`, no hace falta definir `API_URL`: es el valor por defecto. Variables opcionales: `API_URL`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`, `DB_PASSWORD`, `PASS_DEMO`, `CONV_DIAS_CIERRE`.

En Windows se corre desde Git Bash.

### Se puede repetir

El script se puede correr todas las veces que haga falta sin duplicar nada. Si una cuenta ya existe se omite, y si la convocatoria ya existe se reabre y se alarga su cierre. Conviene correrlo de nuevo unos días antes de la defensa.

### Cuentas de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| Estudiante | `ana.lopez@miumg.edu.gt` | `Demo12345!` |
| Evaluador | `evaluador.demo@miumg.edu.gt` | `Demo12345!` |
| Administrador | `admin.demo@miumg.edu.gt` | `Demo12345!` |

Son cuentas de demostración y no deben usarse fuera de un entorno de pruebas.
