# Despliegue en Azure

Cómo publicar la plataforma en Azure con una suscripción **Azure for Students**.
Los comandos son de Azure CLI (`az`) y se corren en **bash**, desde la raíz del
repositorio.

| Parte | Servicio | Plan |
|---|---|---|
| Base de datos | Azure Database for PostgreSQL, servidor flexible | Burstable B1ms, 32 GB, PostgreSQL 16 |
| Backend | App Service (Linux), Node 22 | F1 (gratis) |
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
- En una suscripción nueva, activar los servicios que se usan (una sola vez):

  ```bash
  az provider register --namespace Microsoft.DBforPostgreSQL --wait
  az provider register --namespace Microsoft.Web --wait
  ```

Azure for Students solo permite crear recursos en algunas regiones, y además
cada servicio tiene sus propias restricciones. Para ver las regiones permitidas:

```bash
az policy assignment list \
  --query "[].parameters.listOfAllowedLocations.value" -o json
```

## 1. Variables

Los nombres de la base, del backend y del frontend son globales en Azure: si
uno ya existe, cambie el sufijo.

```bash
RG=rg-becas
LOC=centralus                    # región de la base: en eastus2 PostgreSQL está bloqueado
LOCAPI=eastus2                   # región del backend: la única con cuota para App Service
PG=becas-pg-lelrxuch             # servidor de PostgreSQL
PGUSER=becasadmin                # Azure no permite "postgres"
PGPASS="Becas-$(openssl rand -hex 8)!"
PLAN=plan-becas
API=becas-api-lelrxuch           # backend: https://$API.azurewebsites.net
WEB=becas-web-lelrxuch           # frontend
cat > ~/becas-azure.env <<FIN
RG=$RG
LOC=$LOC
LOCAPI=$LOCAPI
PG=$PG
PGUSER=$PGUSER
PGPASS='$PGPASS'
PLAN=$PLAN
API=$API
WEB=$WEB
FIN
chmod 600 ~/becas-azure.env   # lleva la clave de la base; en otra terminal: source ~/becas-azure.env
```

## 2. Base de datos

```bash
az group create -n $RG -l eastus2

# Tarda de 5 a 10 minutos. Si se corta la espera con Ctrl+C, la creación sigue
# en Azure: revisar con "az postgres flexible-server show" antes de repetir.
az postgres flexible-server create -g $RG -n $PG -l $LOC \
  --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 16 \
  --admin-user $PGUSER --admin-password "$PGPASS" \
  --public-access 0.0.0.0 --yes

az postgres flexible-server db create --resource-group $RG --server-name $PG --name becas_db

# Permitir también la IP de esta computadora, para aplicar el esquema
MIIP=$(curl -4 -s https://ifconfig.me)
az postgres flexible-server firewall-rule create --resource-group $RG --server-name $PG \
  --name mi-computadora --start-ip-address $MIIP --end-ip-address $MIIP

PGPASSWORD="$PGPASS" PGSSLMODE=require psql \
  -h $PG.postgres.database.azure.com -U $PGUSER -d becas_db \
  -f backend/db/schema.sql
```

`--public-access 0.0.0.0` permite las conexiones desde servicios de Azure, que
es como entra el backend.

Con Azure CLI 2.7x, `--database-name` ya no se acepta al crear el servidor, y
`db create` y `firewall-rule create` piden `--server-name` y `--name`.

## 3. Backend, frontend y datos de demostración: un solo comando

Con la base lista, crear el plan del backend y correr el script:

```bash
az appservice plan create -g $RG -n $PLAN -l $LOCAPI --is-linux --sku F1
bash scripts/desplegar-azure.sh
```

Azure for Students tiene cuota 0 para planes B1 y, en Central US, también para
F1. En East US 2 sí hay cuota para F1. El plan F1 da 60 minutos de CPU al día y
se duerme si nadie lo usa: la primera petición después tarda unos 30 segundos.

El script hace los pasos 3 a 5 de abajo, conserva el `JWT_SECRET` si ya existe
y se puede repetir para volver a subir el código. Los pasos siguientes quedan
como referencia de lo que hace.

## 3a. Backend, a mano

```bash
az appservice plan create -g $RG -n $PLAN -l $LOCAPI --is-linux --sku F1
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

## 4. Frontend, a mano

```bash
az staticwebapp create -g $RG -n $WEB -l eastus2 --sku Free
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

## 5. Datos de demostración, a mano

```bash
env API_URL=https://$API.azurewebsites.net \
  DB_HOST=$PG.postgres.database.azure.com DB_PORT=5432 DB_NAME=becas_db \
  DB_USER=$PGUSER DB_PASSWORD="$PGPASS" PGSSLMODE=require \
  bash scripts/sembrar-demo.sh
```

## Actualizar después de un cambio

- Backend y frontend: `bash scripts/desplegar-azure.sh`.
- Esquema: volver a aplicar `schema.sql` (es idempotente).

## Costos y cómo apagarlo

El backend (F1) y el frontend (Free) no consumen crédito. La base B1ms sí,
salvo que entre en las horas gratis de estudiante. Para no gastar el crédito
después de la entrega:

```bash
az group delete -n $RG --yes   # borra TODO: base, backend y frontend
```
