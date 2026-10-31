# Despliegue en Azure

Cómo publicar la plataforma en Azure con una suscripción **Azure for Students**.
Los comandos son de Azure CLI (`az`) y se corren en **bash**, desde la raíz del
repositorio.

| Parte | Servicio | Plan |
|---|---|---|
| Base de datos | Azure Database for PostgreSQL, servidor flexible | Burstable B1ms, 32 GB, PostgreSQL 16 |
| Backend | App Service (Linux), Node 22 | B1 |
| Frontend | Static Web Apps | Free |

Los documentos subidos se guardan en `/home/uploads` del App Service, que es
almacenamiento permanente: no se pierden al reiniciar ni al volver a desplegar.

## 0. Requisitos

- Azure CLI. En Fedora:

  ```bash
  sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
  sudo dnf install -y https://packages.microsoft.com/config/rhel/9.0/packages-microsoft-prod.rpm
  sudo dnf install -y azure-cli
  ```

- `psql`, `zip`, `openssl` y Node 22.
- Iniciar sesión: `az login`.

Azure for Students solo permite crear recursos en algunas regiones. Para ver
cuáles:

```bash
az policy assignment list \
  --query "[].parameters.listOfAllowedLocations.value" -o json
```

## 1. Variables

Los nombres de la base, del backend y del frontend son globales en Azure: si
uno ya existe, cambie el sufijo.

```bash
RG=rg-becas
LOC=eastus2                      # una región permitida (paso 0)
PG=becas-pg-lelrxuch             # servidor de PostgreSQL
PGUSER=becasadmin                # Azure no permite "postgres"
PGPASS="Becas-$(openssl rand -hex 8)!"
PLAN=plan-becas
API=becas-api-lelrxuch           # backend: https://$API.azurewebsites.net
WEB=becas-web-lelrxuch           # frontend
echo "Guarde esta clave: $PGPASS"
```

## 2. Base de datos

```bash
az group create -n $RG -l $LOC

az postgres flexible-server create -g $RG -n $PG -l $LOC \
  --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 16 \
  --admin-user $PGUSER --admin-password "$PGPASS" \
  --public-access 0.0.0.0 --database-name becas_db --yes

# Permitir también la IP de esta computadora, para aplicar el esquema
MIIP=$(curl -s https://ifconfig.me)
az postgres flexible-server firewall-rule create -g $RG -n $PG \
  --rule-name mi-computadora --start-ip-address $MIIP --end-ip-address $MIIP

PGPASSWORD="$PGPASS" PGSSLMODE=require psql \
  -h $PG.postgres.database.azure.com -U $PGUSER -d becas_db \
  -f backend/db/schema.sql
```

`--public-access 0.0.0.0` permite las conexiones desde servicios de Azure, que
es como entra el backend.

## 3. Backend

```bash
az appservice plan create -g $RG -n $PLAN -l $LOC --is-linux --sku B1
az webapp create -g $RG -p $PLAN -n $API --runtime "NODE:22-lts"

az webapp config appsettings set -g $RG -n $API --settings \
  DB_HOST=$PG.postgres.database.azure.com DB_PORT=5432 DB_NAME=becas_db \
  DB_USER=$PGUSER DB_PASSWORD="$PGPASS" DB_SSL=true \
  JWT_SECRET=$(openssl rand -hex 32) JWT_EXPIRES_IN=1h RESET_TOKEN_EXPIRES_MIN=30 \
  NODE_ENV=production UPLOADS_DIR=/home/uploads \
  ALLOWED_EMAIL_DOMAINS=miumg.edu.gt,mineduc.gob.gt,usac.edu.gt \
  SCM_DO_BUILD_DURING_DEPLOYMENT=true
az webapp config set -g $RG -n $API --startup-file "npm start"

(cd backend && rm -f ../backend.zip && zip -qr ../backend.zip . -x "node_modules/*" ".env" "uploads/*")
az webapp deploy -g $RG -n $API --src-path backend.zip --type zip

curl https://$API.azurewebsites.net/health   # debe decir "db":"connected"
```

App Service define `PORT` por su cuenta; el backend ya lo lee.

## 4. Frontend

```bash
az staticwebapp create -g $RG -n $WEB -l $LOC --sku Free
WEBURL=https://$(az staticwebapp show -g $RG -n $WEB --query defaultHostname -o tsv)
TOKEN=$(az staticwebapp secrets list -g $RG -n $WEB --query properties.apiKey -o tsv)

(cd frontend && npm ci && VITE_API_URL=https://$API.azurewebsites.net/api npm run build)
npx @azure/static-web-apps-cli deploy frontend/dist --deployment-token "$TOKEN" --env production

# El backend solo acepta peticiones del frontend publicado
az webapp config appsettings set -g $RG -n $API --settings CORS_ORIGIN=$WEBURL
echo "Frontend: $WEBURL"
```

`VITE_API_URL` se fija al compilar: si cambia la dirección del backend, hay que
volver a compilar y desplegar el frontend. `frontend/public/staticwebapp.config.json`
hace que una ruta como `/solicitudes/3` abra la aplicación en vez de dar 404.

## 5. Datos de demostración

```bash
env API_URL=https://$API.azurewebsites.net \
  DB_HOST=$PG.postgres.database.azure.com DB_PORT=5432 DB_NAME=becas_db \
  DB_USER=$PGUSER DB_PASSWORD="$PGPASS" PGSSLMODE=require \
  bash scripts/sembrar-demo.sh
```

## Actualizar después de un cambio

- Backend: repetir el `zip` y el `az webapp deploy` del paso 3.
- Frontend: repetir el build y el `deploy` del paso 4.
- Esquema: volver a aplicar `schema.sql` (es idempotente).

## Costos y cómo apagarlo

El App Service B1 consume crédito todo el tiempo que exista (unos US$13 al
mes). Para no gastar el crédito de estudiante después de la entrega:

```bash
az group delete -n $RG --yes   # borra TODO: base, backend y frontend
```
