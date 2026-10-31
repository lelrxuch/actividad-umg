# Despliegue en Render

Publica la base de datos, el backend y el frontend en el plan gratis de Render,
a partir de `render.yaml` en la raíz del repositorio.

| Parte | Servicio de Render | Límite del plan gratis |
|---|---|---|
| Base de datos | PostgreSQL | Vence a los 30 días |
| Backend | Web Service (Node 22) | Se duerme tras 15 minutos sin uso; la primera petición después tarda cerca de 1 minuto |
| Frontend | Static Site | Ninguno relevante |

Los documentos subidos se guardan en el disco del backend, que en el plan
gratis no es permanente: se borran cada vez que el servicio se reinicia o se
vuelve a desplegar. Las solicitudes quedan en la base, pero sus archivos no.

## 1. Crear el Blueprint

1. En https://dashboard.render.com, **New → Blueprint**.
2. Conectar la cuenta de GitHub y elegir `lelrxuch/actividad-umg` y la rama.
3. Render lee `render.yaml` y pide dos valores (`sync: false`):
   - `VITE_API_URL` = `https://becas-api.onrender.com/api`
   - `CORS_ORIGIN` = `https://becas-web.onrender.com`
4. **Apply**. Crear los tres servicios tarda de 5 a 10 minutos.

Si Render le agrega un sufijo a algún nombre porque ya estaba tomado, corregir
las dos variables con las direcciones reales (en cada servicio, **Environment**)
y volver a desplegar el frontend: `VITE_API_URL` se fija al compilar.

## 2. Aplicar el esquema y los datos de demostración

En **becas-db → Connect → External Connection** copiar el **External Database
URL**. Desde la raíz del repositorio:

```bash
URL='postgresql://becas:...@....render.com/becas_db'   # la External Database URL

psql "$URL?sslmode=require" -f backend/db/schema.sql
```

Para las cuentas de demostración, con los datos de esa misma URL
(`postgresql://USUARIO:CLAVE@HOST/BASE`):

```bash
env API_URL=https://becas-api.onrender.com \
  DB_HOST=<HOST> DB_PORT=5432 DB_NAME=becas_db DB_USER=becas DB_PASSWORD=<CLAVE> \
  PGSSLMODE=require bash scripts/sembrar-demo.sh
```

## 3. Comprobar

- `https://becas-api.onrender.com/health` debe responder `"db":"connected"`.
- `https://becas-web.onrender.com` abre la aplicación; entrar con
  `ana.lopez@miumg.edu.gt` / `Demo12345!`.

## Actualizar

Render vuelve a desplegar solo cada vez que entra un commit a la rama elegida
en el Blueprint. El esquema se vuelve a aplicar a mano si cambia (es
idempotente).
