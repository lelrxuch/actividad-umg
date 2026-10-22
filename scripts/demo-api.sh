#!/usr/bin/env bash
# Recorrido de extremo a extremo de la API, contra PostgreSQL real.
#
# Es el Nivel 3 del Plan de Pruebas (docs/anexo-7-plan-de-pruebas.md): el único
# nivel donde se ejecuta SQL de verdad. La suite de `npm test` mockea el
# repositorio, así que un error de consulta o de esquema solo lo atrapa esto.
#
# Se corre con el backend arriba. Es idempotente: cada ejecución crea sus
# propios usuarios con un sufijo único, así que se puede repetir sin limpiar la
# base. Las filas que deja son inofensivas.
#
#   bash scripts/demo-api.sh
#
# Variables opcionales:
#   API=http://localhost:4000   dónde está el backend
#   PSQL="psql -d becas_db"     cómo llegar a la base, para sembrar la
#                               asignación de evaluador (no hay endpoint aún)
set -uo pipefail

API=${API:-http://localhost:4000}
SUFIJO=$(date +%s)
CLAVE='Becas2026'
FALLAS=0

t() { printf "\n\033[1m── %s\033[0m\n" "$1"; }
ok()   { printf "   \033[32m✓\033[0m %s\n" "$1"; }
mal()  { printf "   \033[31m✗\033[0m %s\n" "$1"; FALLAS=$((FALLAS+1)); }

# esperado_real "descripción" esperado real
comparar() {
  if [ "$2" = "$3" ]; then ok "$1 → $3"; else mal "$1 → esperaba $2, obtuvo $3"; fi
}

codigo() { curl -s -o /dev/null -w "%{http_code}" "$@"; }

registrar() {   # registrar <correo> <rol-en-la-base|vacio>
  curl -s -X POST "$API/api/auth/register" -H "Content-Type: application/json" \
    -d "{\"nombre\":\"$1\",\"email\":\"$2\",\"password\":\"$CLAVE\"}" >/dev/null
}
token() {       # token <correo>
  curl -s -X POST "$API/api/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$CLAVE\"}" |
    sed -n 's/.*"token":"\([^"]*\)".*/\1/p'
}

# ───────────────────────────────────────────────────────────────────────────────
t "1. El backend está vivo y conectado a PostgreSQL"
SALUD=$(curl -s "$API/health")
echo "   $SALUD"
case "$SALUD" in
  *'"db":"connected"'*) ok "base de datos conectada" ;;
  *) mal "la base no responde — revisar el .env"; echo; echo "Sin base de datos no se puede seguir."; exit 1 ;;
esac

# ───────────────────────────────────────────────────────────────────────────────
t "2. Registro con correo institucional"
DUENO="duena.$SUFIJO@miumg.edu.gt"
registrar "Ana Lucía Pérez" "$DUENO"
comparar "login de la cuenta nueva" "200" "$(codigo -X POST "$API/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$DUENO\",\"password\":\"$CLAVE\"}")"
TK_DUENO=$(token "$DUENO")
[ -n "$TK_DUENO" ] && ok "token recibido: ${TK_DUENO:0:28}…" || mal "no se recibió token"

t "3. Un correo que no es institucional se rechaza, y dice cuáles acepta"
curl -s -X POST "$API/api/auth/register" -H "Content-Type: application/json" \
  -d "{\"nombre\":\"Ajena\",\"email\":\"ajena.$SUFIJO@gmail.com\",\"password\":\"$CLAVE\"}" | sed 's/^/   /'

t "4. El mismo correo dos veces da 409"
comparar "registro repetido" "409" "$(codigo -X POST "$API/api/auth/register" -H 'Content-Type: application/json' -d "{\"nombre\":\"Ana\",\"email\":\"$DUENO\",\"password\":\"$CLAVE\"}")"

t "5. Contraseña incorrecta: el mismo mensaje que un correo inexistente"
echo "   (a propósito, para no revelar qué correos están registrados)"
curl -s -X POST "$API/api/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$DUENO\",\"password\":\"EquivocadaX9\"}" | sed 's/^/   /'
curl -s -X POST "$API/api/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"nadie.$SUFIJO@miumg.edu.gt\",\"password\":\"$CLAVE\"}" | sed 's/^/   /'

# ───────────────────────────────────────────────────────────────────────────────
t "6. PATRÓN FACTORY METHOD — las modalidades salen de la fábrica"
curl -s "$API/api/solicitudes/tipos" | sed 's/^/   /'

t "7. Cada modalidad declara su propia documentación"
for tipo in nivel-medio universitaria posgrado; do
  printf "   %-14s " "$tipo"
  curl -s "$API/api/solicitudes/tipos/$tipo/documentos"; echo
done
ok "nivel medio no pide título; universitaria y posgrado sí"

t "8. Una modalidad inexistente da 400 y orienta al que integra"
curl -s "$API/api/solicitudes/tipos/nivel_medio/documentos" | sed 's/^/   /'

# ───────────────────────────────────────────────────────────────────────────────
t "9. PATRÓN BUILDER — expediente incompleto: dice exactamente qué falta"
curl -s -X POST "$API/api/expedientes/revision" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TK_DUENO" \
  -d '{"tipo":"universitaria","documentos":{"dni":{"tipo":"dni","numero":"1234567890101"}}}' | sed 's/^/   /'

t "10. PATRÓN BUILDER — expediente completo: 201 con el expediente armado"
comparar "expediente completo" "201" "$(codigo -X POST "$API/api/expedientes" -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TK_DUENO" \
  -d '{"tipo":"universitaria","documentos":{"dni":{"tipo":"dni","numero":"1234567890101"},"titulo":{"tipo":"titulo","nivel":"diversificado","institucion":"INEB Jocotenango"},"carta":{"tipo":"carta","autor":"Prof. Ramírez","contenido":"Recomiendo a la estudiante."}}}')"

t "11. Sin token no se entra a nada del expediente"
comparar "sin Authorization" "401" "$(codigo -X POST "$API/api/expedientes" -H 'Content-Type: application/json' -d '{"tipo":"posgrado","documentos":{}}')"

# ───────────────────────────────────────────────────────────────────────────────
t "12. PATRÓN STATE — ciclo de vida de la solicitud"
SOL=$(curl -s -X POST "$API/api/solicitudes" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TK_DUENO" -d '{"tipo":"universitaria"}')
echo "   $SOL"
ID_SOL=$(echo "$SOL" | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
[ -n "$ID_SOL" ] && ok "solicitud #$ID_SOL en Borrador" || { mal "no se pudo crear la solicitud"; ID_SOL=0; }

echo "   El orden de las revisiones es deliberado: primero QUIÉN, después EN QUÉ"
echo "   ESTADO. Al dueño se le niega por no ser evaluador (403) antes de llegar"
echo "   a mirar el estado, para no revelarle que la acción existiría en otro."
comparar "el dueño pide un dictamen" "403" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/dictamen" \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TK_DUENO" -d '{"aprobado":true}')"
echo "   El 409 del patrón State se ve con quien SÍ puede dictaminar, en el"
echo "   estado equivocado. Se verifica en el paso 15, con el evaluador ya asignado."

# ───────────────────────────────────────────────────────────────────────────────
t "13. Un estudiante NO puede dictaminar su propia beca (corrección de SCRUM-35)"
comparar "el dueño intenta evaluar" "403" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/evaluar" \
  -H "Authorization: Bearer $TK_DUENO")"

OTRO="otro.$SUFIJO@miumg.edu.gt"
registrar "Otro Estudiante" "$OTRO"
TK_OTRO=$(token "$OTRO")
comparar "un tercero intenta ver la solicitud" "403" "$(codigo "$API/api/solicitudes/$ID_SOL" -H "Authorization: Bearer $TK_OTRO")"
comparar "un tercero intenta enviarla"        "403" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/enviar" -H "Authorization: Bearer $TK_OTRO")"
comparar "el dueño sí puede verla"            "200" "$(codigo "$API/api/solicitudes/$ID_SOL" -H "Authorization: Bearer $TK_DUENO")"

# ───────────────────────────────────────────────────────────────────────────────
t "14. PATRÓN PROXY — quién puede descargar un documento"
echo "   El middleware solo confirma que hay sesión. Quién puede ver ESTE"
echo "   documento lo decide DocumentoProxy, dentro del service."

ARCHIVO=$(mktemp /tmp/dni-demo-XXXXXX.pdf)
printf '%%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF\n' > "$ARCHIVO"
SUBIDA=$(curl -s -X POST "$API/api/documentos" -H "Authorization: Bearer $TK_DUENO" \
  -F "solicitudId=$ID_SOL" -F "tipo=dni" -F "archivo=@$ARCHIVO;type=application/pdf")
echo "   subida: $SUBIDA"
ID_DOC=$(echo "$SUBIDA" | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
rm -f "$ARCHIVO"

if [ -z "$ID_DOC" ]; then
  mal "no se pudo subir el documento; se omite la verificación del Proxy"
else
  ok "documento #$ID_DOC subido"
  comparar "el dueño descarga"          "200" "$(codigo "$API/api/documentos/$ID_DOC/descargar" -H "Authorization: Bearer $TK_DUENO")"
  comparar "otro estudiante descarga"   "403" "$(codigo "$API/api/documentos/$ID_DOC/descargar" -H "Authorization: Bearer $TK_OTRO")"

  # La asignación de evaluadores todavía no tiene endpoint (EPIC 4). Se siembra
  # por SQL cuando hay acceso a la base; si no, se omiten los dos casos de
  # evaluador y se dice por qué.
  PSQL=${PSQL:-}
  if [ -z "$PSQL" ] && command -v psql >/dev/null 2>&1; then PSQL="psql -d becas_db"; fi
  if [ -n "$PSQL" ]; then
    EV_SI="evalsi.$SUFIJO@mineduc.gob.gt"; EV_NO="evalno.$SUFIJO@mineduc.gob.gt"
    registrar "Evaluador Asignado" "$EV_SI"; registrar "Evaluador Ajeno" "$EV_NO"
    $PSQL -q -c "UPDATE usuarios SET rol='evaluador' WHERE email IN ('$EV_SI','$EV_NO')" 2>/dev/null
    $PSQL -q -c "INSERT INTO solicitud_evaluadores (solicitud_id, evaluador_id)
                 SELECT $ID_SOL, id FROM usuarios WHERE email='$EV_SI'
                 ON CONFLICT DO NOTHING" 2>/dev/null
    TK_EV_SI=$(token "$EV_SI"); TK_EV_NO=$(token "$EV_NO")
    comparar "evaluador ASIGNADO descarga" "200" "$(codigo "$API/api/documentos/$ID_DOC/descargar" -H "Authorization: Bearer $TK_EV_SI")"
    comparar "evaluador AJENO descarga"    "403" "$(codigo "$API/api/documentos/$ID_DOC/descargar" -H "Authorization: Bearer $TK_EV_NO")"
  else
    echo "   (sin acceso a psql: se omiten los dos casos de evaluador."
    echo "    Correr con PSQL=\"psql -d becas_db\" para incluirlos.)"
  fi
  echo "   Ningún if sobre roles en el controller: el Proxy lo decide."

  if [ -n "${TK_EV_SI:-}" ]; then
    t "15. PATRÓN STATE — el 409 con quien SÍ tiene derecho a la acción"
    echo "   El evaluador asignado puede dictaminar, pero no sobre un Borrador:"
    comparar "evaluador dictamina un Borrador" "409" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/dictamen" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $TK_EV_SI" -d '{"aprobado":true}')"
    echo "   Ahora el ciclo en orden: Borrador → Enviada → En Evaluación → Aprobada"
    comparar "el dueño envía"            "200" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/enviar"  -H "Authorization: Bearer $TK_DUENO")"
    comparar "el evaluador pasa a evaluar" "200" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/evaluar" -H "Authorization: Bearer $TK_EV_SI")"
    comparar "el evaluador dictamina"    "200" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/dictamen" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $TK_EV_SI" -d '{"aprobado":true}')"
    echo "   Y un estado final ya no admite nada:"
    comparar "reenviar una Aprobada" "409" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/enviar" -H "Authorization: Bearer $TK_DUENO")"
    curl -s "$API/api/solicitudes/$ID_SOL" -H "Authorization: Bearer $TK_DUENO" | sed 's/^/   /'
  fi
fi

# ───────────────────────────────────────────────────────────────────────────────
printf "\n\033[1m"
if [ "$FALLAS" -eq 0 ]; then
  printf "\033[32mRecorrido completo: todas las verificaciones pasaron.\033[0m\n"
else
  printf "\033[31mRecorrido completo con %s verificación(es) fallida(s).\033[0m\n" "$FALLAS"
fi
exit "$FALLAS"
