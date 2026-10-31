#!/usr/bin/env bash
# Publica el backend y el frontend en Azure y carga los datos de demostración.
#
# Supone que ya existen (docs/despliegue-azure.md, pasos 1 y 2):
#   - el grupo de recursos, el servidor de PostgreSQL con becas_db y el esquema;
#   - el plan de App Service ($PLAN);
#   - ~/becas-azure.env con RG, PG, PGUSER, PGPASS, PLAN, API, WEB y LOCAPI.
#
# Se puede repetir: lo que ya existe no se vuelve a crear, y el código se vuelve
# a subir. Uso, desde la raíz del repositorio:
#   bash scripts/desplegar-azure.sh
set -euo pipefail

VARIABLES="${VARIABLES:-$HOME/becas-azure.env}"
[ -f "$VARIABLES" ] || { echo "No existe $VARIABLES (docs/despliegue-azure.md, paso 1)." >&2; exit 1; }
# shellcheck disable=SC1090
source "$VARIABLES"
LOCAPI="${LOCAPI:-$LOC}"
LOCWEB="${LOCWEB:-eastus2}"   # Static Web Apps: eastus2, centralus, westus2, westeurope o eastasia
[ -f backend/package.json ] && [ -f frontend/package.json ] || { echo "Corra el script desde la raíz de actividad-umg." >&2; exit 1; }

paso() { printf '\n\033[1m== %s\033[0m\n' "$1"; }

az account show -o none 2>/dev/null || { echo "Primero: az login" >&2; exit 1; }

DBHOST="$PG.postgres.database.azure.com"
URLAPI="https://$API.azurewebsites.net"

paso "1/6 Aplicación del backend ($API)"
if az webapp show -g "$RG" -n "$API" -o none 2>/dev/null; then
  echo "Ya existe."
else
  az webapp create -g "$RG" -p "$PLAN" -n "$API" --runtime "NODE:22-lts" -o none
  echo "Creada."
fi

paso "2/6 Configuración del backend"
# El JWT_SECRET se conserva si ya existe: cambiarlo cierra todas las sesiones.
JWT=$(az webapp config appsettings list -g "$RG" -n "$API" --query "[?name=='JWT_SECRET'].value | [0]" -o tsv)
[ -n "$JWT" ] || JWT=$(openssl rand -hex 32)
az webapp config appsettings set -g "$RG" -n "$API" -o none --settings \
  DB_HOST="$DBHOST" DB_PORT=5432 DB_NAME=becas_db DB_USER="$PGUSER" DB_PASSWORD="$PGPASS" DB_SSL=true \
  JWT_SECRET="$JWT" JWT_EXPIRES_IN=1h RESET_TOKEN_EXPIRES_MIN=30 \
  NODE_ENV=production UPLOADS_DIR=/home/uploads \
  ALLOWED_EMAIL_DOMAINS=miumg.edu.gt,mineduc.gob.gt,usac.edu.gt \
  SCM_DO_BUILD_DURING_DEPLOYMENT=true
az webapp config set -g "$RG" -n "$API" --startup-file "npm start" -o none
echo "Listo."

paso "3/6 Subir el backend (en el plan gratis tarda de 3 a 8 minutos)"
rm -f backend.zip
(cd backend && zip -qr ../backend.zip . -x "node_modules/*" ".env" "uploads/*")
az webapp deploy -g "$RG" -n "$API" --src-path backend.zip --type zip -o none
rm -f backend.zip
echo "Esperando a que responda $URLAPI/health ..."
for i in $(seq 1 30); do
  if curl -fs --max-time 20 "$URLAPI/health" | grep -q '"db":"connected"'; then
    echo "Backend arriba y conectado a la base."; break
  fi
  [ "$i" -eq 30 ] && { echo "El backend no responde. Revise: az webapp log tail -g $RG -n $API" >&2; exit 1; }
  sleep 10
done

paso "4/6 Frontend en Static Web Apps ($WEB)"
if ! az staticwebapp show -g "$RG" -n "$WEB" -o none 2>/dev/null; then
  az staticwebapp create -g "$RG" -n "$WEB" -l "$LOCWEB" --sku Free -o none
fi
URLWEB="https://$(az staticwebapp show -g "$RG" -n "$WEB" --query defaultHostname -o tsv)"
TOKEN=$(az staticwebapp secrets list -g "$RG" -n "$WEB" --query properties.apiKey -o tsv)
(cd frontend && npm ci --silent && VITE_API_URL="$URLAPI/api" npm run build)
npx --yes @azure/static-web-apps-cli deploy frontend/dist --deployment-token "$TOKEN" --env production

paso "5/6 Conectar backend y frontend (CORS)"
az webapp config appsettings set -g "$RG" -n "$API" --settings CORS_ORIGIN="$URLWEB" -o none
echo "El backend acepta peticiones de $URLWEB."

paso "6/6 Datos de demostración"
sleep 20   # el cambio de configuración reinicia el backend
env API_URL="$URLAPI" DB_HOST="$DBHOST" DB_PORT=5432 DB_NAME=becas_db \
  DB_USER="$PGUSER" DB_PASSWORD="$PGPASS" PGSSLMODE=require \
  bash scripts/sembrar-demo.sh

printf '\n\033[1mPublicado.\033[0m\n'
echo "Aplicación:  $URLWEB"
echo "API:         $URLAPI/health"
