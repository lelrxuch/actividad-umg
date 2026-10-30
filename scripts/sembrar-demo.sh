#!/usr/bin/env bash
# Siembra datos de demostración para la defensa.
# Se puede ejecutar varias veces: no duplica cuentas ni convocatoria.
#
# Requisitos: backend corriendo, psql instalado y schema.sql aplicado.
# Uso:  DB_PASSWORD=clave bash scripts/sembrar-demo.sh
set -euo pipefail

# ---------- Configuración (se puede sobreescribir con variables de entorno) ----------
API="${API_URL:-http://localhost:4000}"
export PGHOST="${DB_HOST:-localhost}"
export PGPORT="${DB_PORT:-5432}"
export PGUSER="${DB_USER:-postgres}"
export PGDATABASE="${DB_NAME:-becas_db}"
export PGPASSWORD="${DB_PASSWORD:-${PGPASSWORD:-}}"
export PGCLIENTENCODING=UTF8   # para que "María" y "López" no se dañen en Windows

PASS_DEMO="${PASS_DEMO:-Demo12345!}"

EST_NOMBRE="Ana María López García"
EST_EMAIL="ana.lopez@miumg.edu.gt"
EST_CUI="1234567890101"   # se usa al ENVIAR la solicitud (RENAP), no al registrarse

EVA_NOMBRE="Evaluador Demo"
EVA_EMAIL="evaluador.demo@miumg.edu.gt"

ADM_NOMBRE="Administrador Demo"
ADM_EMAIL="admin.demo@miumg.edu.gt"

CONV_TITULO="Beca Demo Defensa"
CONV_DIAS_CIERRE="${CONV_DIAS_CIERRE:-90}"

# Valores de usuarios.rol que usa el backend (no hay CHECK en la base: confirmar en el código)
ROL_EVALUADOR="${ROL_EVALUADOR:-evaluador}"
ROL_ADMIN="${ROL_ADMIN:-administrador}"
# -------------------------------------------------------------------------------------

PSQL=(psql -v ON_ERROR_STOP=1 -qtA)

existe_usuario() {
  "${PSQL[@]}" -c "SELECT count(*) FROM usuarios WHERE email = '$1';"
}

registrar() {  # nombre email
  local body
  body=$(printf '{"nombre":"%s","email":"%s","password":"%s"}' "$1" "$2" "$PASS_DEMO")
  curl -s -w "\n%{http_code}" -X POST "$API/api/auth/register" \
    -H 'Content-Type: application/json' -d "$body"
}

asegurar_cuenta() {  # nombre email
  local email="$2" resp code
  if [[ "$(existe_usuario "$email")" -ge 1 ]]; then
    echo "  = $email ya existe, se omite"
    return
  fi
  resp=$(registrar "$1" "$2")
  code="${resp##*$'\n'}"
  if [[ "$(existe_usuario "$email")" -lt 1 ]]; then
    echo "ERROR: no se pudo crear $email (HTTP $code)" >&2
    echo "Respuesta: ${resp%$'\n'*}" >&2
    exit 1
  fi
  echo "  + $email creada"
}

echo "== Verificando backend y base de datos =="
curl -sf "$API/health" > /dev/null || { echo "ERROR: el backend no responde en $API" >&2; exit 1; }
"${PSQL[@]}" -c "SELECT 1;" > /dev/null || { echo "ERROR: no se pudo conectar a la base $PGDATABASE" >&2; exit 1; }

echo "== Cuentas =="
asegurar_cuenta "$EST_NOMBRE" "$EST_EMAIL"
asegurar_cuenta "$EVA_NOMBRE" "$EVA_EMAIL"
asegurar_cuenta "$ADM_NOMBRE" "$ADM_EMAIL"

echo "== Nombres, roles y convocatoria =="
"${PSQL[@]}" <<SQL
-- El nombre de la estudiante debe coincidir exactamente con RENAP
UPDATE usuarios SET nombre = '${EST_NOMBRE}' WHERE email = '${EST_EMAIL}';
UPDATE usuarios SET nombre = '${EVA_NOMBRE}' WHERE email = '${EVA_EMAIL}';
UPDATE usuarios SET nombre = '${ADM_NOMBRE}' WHERE email = '${ADM_EMAIL}';

UPDATE usuarios SET rol = '${ROL_EVALUADOR}' WHERE email = '${EVA_EMAIL}';
UPDATE usuarios SET rol = '${ROL_ADMIN}'     WHERE email = '${ADM_EMAIL}';

INSERT INTO convocatorias
    (titulo, descripcion, fecha_apertura, fecha_cierre, modalidades, estado, creada_por)
SELECT '${CONV_TITULO}',
       'Convocatoria de demostración para la defensa del proyecto.',
       CURRENT_DATE - 1,
       CURRENT_DATE + ${CONV_DIAS_CIERRE},
       ARRAY['nivel-medio', 'universitaria', 'posgrado'],
       'Publicada',
       (SELECT id FROM usuarios WHERE email = '${ADM_EMAIL}')
WHERE NOT EXISTS (SELECT 1 FROM convocatorias WHERE titulo = '${CONV_TITULO}');

-- Si ya existía (por ejemplo de una corrida de hace semanas), se reabre y se alarga
UPDATE convocatorias
   SET estado = 'Publicada',
       fecha_apertura = CURRENT_DATE - 1,
       fecha_cierre = CURRENT_DATE + ${CONV_DIAS_CIERRE},
       modalidades = ARRAY['nivel-medio', 'universitaria', 'posgrado'],
       actualizado_en = NOW()
 WHERE titulo = '${CONV_TITULO}';
SQL
echo "  convocatoria '${CONV_TITULO}' publicada, cierra en ${CONV_DIAS_CIERRE} días"

echo
echo "=========== DATOS PARA LA DEMOSTRACIÓN ==========="
printf '%-14s %-34s %s\n' "Estudiante:"    "$EST_EMAIL" "$PASS_DEMO"
printf '%-14s %-34s %s\n' "Evaluador:"     "$EVA_EMAIL" "$PASS_DEMO"
printf '%-14s %-34s %s\n' "Administrador:" "$ADM_EMAIL" "$PASS_DEMO"
echo "CUI de prueba (al enviar la solicitud): $EST_CUI"
echo "===================================================="
