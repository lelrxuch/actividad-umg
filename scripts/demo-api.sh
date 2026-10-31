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
#   PSQL="psql -d becas_db"     cómo llegar a la base, para dar el rol de
#                               evaluador y de administrador (no hay endpoint
#                               de roles aún; la asignación ya usa la API)
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

# en_bandeja "descripción" <si|no> <token>: ¿aparece $ID_SOL en GET /asignadas?
# Se busca `"id":N,` y no `N` a secas, para que 12 no coincida con 123.
en_bandeja() {
  local cuerpo
  cuerpo=$(curl -s "$API/api/solicitudes/asignadas" -H "Authorization: Bearer $3")
  case "$cuerpo" in
    *"\"id\":$ID_SOL,"*) comparar "$1" "$2" "si" ;;
    *)                   comparar "$1" "$2" "no" ;;
  esac
}

registrar() {   # registrar <correo> <rol-en-la-base|vacio>
  curl -s -X POST "$API/api/auth/register" -H "Content-Type: application/json" \
    -d "{\"nombre\":\"$1\",\"email\":\"$2\",\"password\":\"$CLAVE\"}" >/dev/null
}
token() {       # token <correo>
  curl -s -X POST "$API/api/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$CLAVE\"}" |
    sed -n 's/.*"token":"\([^"]*\)".*/\1/p'
}
id_de() {       # id_de <correo>: el id de usuario que devuelve el login
  curl -s -X POST "$API/api/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$CLAVE\"}" |
    sed -n 's/.*"usuario":{"id":\([0-9]*\).*/\1/p'
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
# El nombre tiene que poder validarse contra RENAP al enviar (SCRUM-38). El
# simulador solo conoce dos CUI; este es el de ANA MARIA LOPEZ GARCIA, y basta
# con que cada palabra del nombre registrado aparezca en el de RENAP.
CUI_ANA=1234567890101
CUI_CARLOS=2345678901202
registrar "Ana López" "$DUENO"
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
echo "   estado equivocado. Se verifica en el paso 15, con la administradora."

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

  # Los roles todavía no tienen endpoint: se dan por SQL cuando hay acceso a la
  # base; si no, se omiten los casos de evaluador y se dice por qué. La
  # asignación ya no: va por POST /api/solicitudes/:id/evaluadores.
  PSQL=${PSQL:-}
  if [ -z "$PSQL" ] && command -v psql >/dev/null 2>&1; then PSQL="psql -d becas_db"; fi
  if [ -n "$PSQL" ]; then
    EV_SI="evalsi.$SUFIJO@mineduc.gob.gt"; EV_NO="evalno.$SUFIJO@mineduc.gob.gt"
    registrar "Evaluador Asignado" "$EV_SI"; registrar "Evaluador Ajeno" "$EV_NO"
    $PSQL -q -c "UPDATE usuarios SET rol='evaluador' WHERE email IN ('$EV_SI','$EV_NO')" 2>/dev/null
    ADMIN="admin.$SUFIJO@mineduc.gob.gt"
    registrar "Administradora Demo" "$ADMIN"
    $PSQL -q -c "UPDATE usuarios SET rol='administrador' WHERE email='$ADMIN'" 2>/dev/null
    # El rol viaja en el JWT: los tokens se piden DESPUÉS de cambiarlo.
    TK_EV_SI=$(token "$EV_SI"); TK_EV_NO=$(token "$EV_NO"); TK_ADMIN=$(token "$ADMIN")
    ID_EV_SI=$(id_de "$EV_SI"); ID_EV_NO=$(id_de "$EV_NO"); ID_OTRO=$(id_de "$OTRO")

    t "14a. Lista de evaluadores (GET /api/usuarios/evaluadores)"
    EVALUADORES=$(curl -s "$API/api/usuarios/evaluadores" -H "Authorization: Bearer $TK_ADMIN")
    comparar "la administradora pide la lista" "200" "$(codigo "$API/api/usuarios/evaluadores" -H "Authorization: Bearer $TK_ADMIN")"
    # "Evaluador Ajeno" va antes que "Evaluador Asignado" en cualquier collation.
    case "$EVALUADORES" in
      *"$EV_NO"*"$EV_SI"*) ok "trae a los dos evaluadores nuevos, ordenados por nombre" ;;
      *) mal "faltan evaluadores o no vienen por nombre: $EVALUADORES" ;;
    esac
    case "$EVALUADORES" in
      *password_hash*|*'$2a$'*|*'$2b$'*) mal "la lista expone el hash de la contraseña" ;;
      *) ok "sin password_hash" ;;
    esac
    case "$EVALUADORES" in
      *"$DUENO"*|*"$ADMIN"*) mal "la lista incluye usuarios que no son evaluadores" ;;
      *) ok "solo usuarios con rol evaluador" ;;
    esac
    comparar "un estudiante pide la lista" "403" "$(codigo "$API/api/usuarios/evaluadores" -H "Authorization: Bearer $TK_DUENO")"
    comparar "un evaluador pide la lista"  "403" "$(codigo "$API/api/usuarios/evaluadores" -H "Authorization: Bearer $TK_EV_SI")"
    comparar "sin sesión"                  "401" "$(codigo "$API/api/usuarios/evaluadores")"

    t "14b. Asignación de evaluadores (POST /api/solicitudes/:id/evaluadores)"
    asignar() {   # asignar <token> <solicitud> <evaluadorId>
      codigo -X POST "$API/api/solicitudes/$2/evaluadores" -H 'Content-Type: application/json' \
        -H "Authorization: Bearer $1" -d "{\"evaluadorId\":${3:-null}}"
    }
    comparar "un estudiante intenta asignar"          "403" "$(asignar "$TK_DUENO" "$ID_SOL" "$ID_EV_SI")"
    comparar "un evaluador intenta asignarse"         "403" "$(asignar "$TK_EV_SI" "$ID_SOL" "$ID_EV_SI")"
    comparar "asignar a una solicitud que no existe"  "404" "$(asignar "$TK_ADMIN" 2147483647 "$ID_EV_SI")"
    comparar "asignar a un estudiante como evaluador" "400" "$(asignar "$TK_ADMIN" "$ID_SOL" "$ID_OTRO")"
    echo "   Un evaluador asignado puede descargar el expediente: en Borrador lo"
    echo "   vería antes de que el estudiante lo envíe. Se asigna después del envío."
    comparar "asignar a un Borrador"                  "409" "$(asignar "$TK_ADMIN" "$ID_SOL" "$ID_EV_SI")"
    comparar "sin asignar, el evaluador no descarga"  "403" "$(codigo "$API/api/documentos/$ID_DOC/descargar" -H "Authorization: Bearer $TK_EV_SI")"
  else
    echo "   (sin acceso a psql: se omiten los casos de evaluador."
    echo "    Correr con PSQL=\"psql -d becas_db\" para incluirlos.)"
  fi
  echo "   Ningún if sobre roles en el controller: el Proxy lo decide."

  if [ -n "${TK_EV_SI:-}" ]; then
    t "15. PATRÓN STATE — el 409 con quien SÍ tiene derecho a la acción"
    echo "   La administradora puede dictaminar, pero no sobre un Borrador:"
    comparar "la administradora dictamina un Borrador" "409" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/dictamen" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $TK_ADMIN" -d '{"aprobado":true}')"
    # SCRUM-39: no se envía un expediente incompleto. Una solicitud
    # universitaria exige dni, titulo y carta; hasta aquí solo tiene el dni.
    for faltante in titulo carta; do
      ARCH=$(mktemp /tmp/${faltante}-demo-XXXXXX.pdf)
      printf '%%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF\n' > "$ARCH"
      comparar "subir $faltante" "201" "$(codigo -X POST "$API/api/documentos" -H "Authorization: Bearer $TK_DUENO" \
        -F "solicitudId=$ID_SOL" -F "tipo=$faltante" -F "archivo=@$ARCH;type=application/pdf")"
      rm -f "$ARCH"
    done
    monto() {  # monto <token> <solicitud> <valor>: PATCH /api/solicitudes/:id/monto
      codigo -X PATCH "$API/api/solicitudes/$2/monto" -H 'Content-Type: application/json' \
        -H "Authorization: Bearer $1" -d "{\"monto\":$3}"
    }
    echo "   Doble aprobación: sin monto no se envía (si no, se saltaría la segunda aprobación)."
    comparar "enviar sin monto"                  "400" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/enviar" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $TK_DUENO" -d "{\"cui\":\"$CUI_ANA\"}")"
    comparar "un tercero fija el monto"          "403" "$(monto "$TK_OTRO" "$ID_SOL" 8000)"
    comparar "monto negativo"                    "400" "$(monto "$TK_DUENO" "$ID_SOL" -5)"
    comparar "la dueña fija Q8,000"              "200" "$(monto "$TK_DUENO" "$ID_SOL" 8000)"
    echo "   SCRUM-38: con el expediente completo, lo último que se revisa es la"
    echo "   identidad contra RENAP. Un CUI que no sirve da 400 y la deja en Borrador."
    comparar "enviar sin CUI"                 "400" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/enviar" -H "Authorization: Bearer $TK_DUENO")"
    comparar "enviar con un CUI inexistente"  "400" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/enviar" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $TK_DUENO" -d '{"cui":"9999999999999"}')"
    comparar "enviar con el CUI de otra persona" "400" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/enviar" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $TK_DUENO" -d "{\"cui\":\"$CUI_CARLOS\"}")"
    echo "   Ahora el ciclo en orden: Borrador → Enviada → En Evaluación → Aprobada"
    comparar "el dueño envía con su CUI" "200" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/enviar" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $TK_DUENO" -d "{\"cui\":\"$CUI_ANA\"}")"
    echo "   Ya Enviada, la administradora asigna al evaluador:"
    comparar "la administradora asigna al evaluador" "201" "$(asignar "$TK_ADMIN" "$ID_SOL" "$ID_EV_SI")"
    comparar "asignarlo otra vez"                    "409" "$(asignar "$TK_ADMIN" "$ID_SOL" "$ID_EV_SI")"
    comparar "evaluador ASIGNADO descarga" "200" "$(codigo "$API/api/documentos/$ID_DOC/descargar" -H "Authorization: Bearer $TK_EV_SI")"
    comparar "evaluador AJENO descarga"    "403" "$(codigo "$API/api/documentos/$ID_DOC/descargar" -H "Authorization: Bearer $TK_EV_NO")"
    echo "   Bandeja de revisión (GET /api/solicitudes/asignadas), con la solicitud ya Enviada:"
    en_bandeja "el evaluador ASIGNADO la ve en su bandeja" "si" "$TK_EV_SI"
    en_bandeja "el evaluador AJENO no la ve"               "no" "$TK_EV_NO"
    en_bandeja "la administradora la ve (está Enviada)"   "si" "$TK_ADMIN"
    comparar "el estudiante no tiene bandeja" "403" "$(codigo "$API/api/solicitudes/asignadas" -H "Authorization: Bearer $TK_DUENO")"
    comparar "el evaluador pasa a evaluar" "200" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/evaluar" -H "Authorization: Bearer $TK_EV_SI")"
    comparar "el evaluador dictamina"    "200" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/dictamen" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $TK_EV_SI" -d '{"aprobado":true}')"
    echo "   Y un estado final ya no admite nada:"
    comparar "reenviar una Aprobada" "409" "$(codigo -X POST "$API/api/solicitudes/$ID_SOL/enviar" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $TK_DUENO" -d "{\"cui\":\"$CUI_ANA\"}")"
    comparar "asignar un evaluador a una Aprobada" "409" "$(asignar "$TK_ADMIN" "$ID_SOL" "$ID_EV_NO")"
    curl -s "$API/api/solicitudes/$ID_SOL" -H "Authorization: Bearer $TK_DUENO" | sed 's/^/   /'

    t "15b. Notificaciones al estudiante (GET /api/notificaciones)"
    echo "   Cada cambio de estado de su solicitud le dejó un aviso, y solo a ella:"
    echo "   Borrador → Enviada → En Evaluación → Aprobada son 3 avisos."
    avisos_de() {  # avisos_de <token>: cuántos avisos de $ID_SOL ve ese usuario
      curl -s "$API/api/notificaciones" -H "Authorization: Bearer $1" \
        | grep -o "\"solicitudId\":$ID_SOL[,}]" | wc -l | tr -d ' '
    }
    comparar "la dueña ve los avisos de su solicitud" "3" "$(avisos_de "$TK_DUENO")"
    comparar "el evaluador no ve los avisos de ella"  "0" "$(avisos_de "$TK_EV_SI")"
    comparar "sin sesión no hay avisos"               "401" "$(codigo "$API/api/notificaciones")"

    t "15c. Doble aprobación: una solicitud de más de Q10,000"
    AUT="autoriza.$SUFIJO@mineduc.gob.gt"
    registrar "Autoridad Autorizadora" "$AUT"
    $PSQL -q -c "UPDATE usuarios SET rol='autorizador' WHERE email='$AUT'" 2>/dev/null
    TK_AUT=$(token "$AUT")
    GRANDE=$(curl -s -X POST "$API/api/solicitudes" -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TK_DUENO" -d '{"tipo":"universitaria"}' | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
    for tipo in dni titulo carta; do
      ARCH=$(mktemp /tmp/${tipo}-grande-XXXXXX.pdf)
      printf '%%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF\n' > "$ARCH"
      SUB=$(curl -s -X POST "$API/api/documentos" -H "Authorization: Bearer $TK_DUENO" \
        -F "solicitudId=$GRANDE" -F "tipo=$tipo" -F "archivo=@$ARCH;type=application/pdf")
      [ "$tipo" = dni ] && DOC_GRANDE=$(echo "$SUB" | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
      rm -f "$ARCH"
    done
    estado_de() { curl -s "$API/api/solicitudes/$1" -H "Authorization: Bearer $TK_DUENO" | sed -n 's/.*"estado":"\([^"]*\)".*/\1/p'; }
    comparar "la dueña fija Q15,000"            "200" "$(monto "$TK_DUENO" "$GRANDE" 15000)"
    comparar "envía con su CUI"                 "200" "$(codigo -X POST "$API/api/solicitudes/$GRANDE/enviar" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $TK_DUENO" -d "{\"cui\":\"$CUI_ANA\"}")"
    comparar "ya Enviada, el monto no cambia"   "409" "$(monto "$TK_DUENO" "$GRANDE" 9000)"
    comparar "se asigna al evaluador"           "201" "$(asignar "$TK_ADMIN" "$GRANDE" "$ID_EV_SI")"
    comparar "el evaluador pasa a evaluar"      "200" "$(codigo -X POST "$API/api/solicitudes/$GRANDE/evaluar" -H "Authorization: Bearer $TK_EV_SI")"
    autorizar() {  # autorizar <token> <solicitud> <true|false>
      codigo -X POST "$API/api/solicitudes/$2/autorizacion" -H 'Content-Type: application/json' \
        -H "Authorization: Bearer $1" -d "{\"aprobado\":$3}"
    }
    comparar "autorizar antes del dictamen"     "409" "$(autorizar "$TK_AUT" "$GRANDE" true)"
    comparar "el evaluador aprueba"             "200" "$(codigo -X POST "$API/api/solicitudes/$GRANDE/dictamen" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $TK_EV_SI" -d '{"aprobado":true}')"
    comparar "con una aprobación no queda Aprobada" "Pendiente de Autorización" "$(estado_de "$GRANDE")"
    en_bandeja_de() { case "$(curl -s "$API/api/solicitudes/asignadas" -H "Authorization: Bearer $1")" in *"\"id\":$GRANDE,"*) echo si ;; *) echo no ;; esac; }
    comparar "está en la bandeja de la autoridad" "si" "$(en_bandeja_de "$TK_AUT")"
    comparar "la autoridad abre el expediente"  "200" "$(codigo "$API/api/documentos/$DOC_GRANDE/descargar" -H "Authorization: Bearer $TK_AUT")"
    comparar "pero no el de otra solicitud"     "403" "$(codigo "$API/api/documentos/$ID_DOC/descargar" -H "Authorization: Bearer $TK_AUT")"
    comparar "el evaluador intenta autorizar"   "403" "$(autorizar "$TK_EV_SI" "$GRANDE" true)"
    comparar "la administradora intenta autorizar" "403" "$(autorizar "$TK_ADMIN" "$GRANDE" true)"
    echo "   Si a quien evaluó le dan después el rol de autorizador, igual no puede dar la segunda:"
    $PSQL -q -c "UPDATE usuarios SET rol='autorizador' WHERE email='$EV_SI'" 2>/dev/null
    comparar "la misma persona intenta autorizar" "403" "$(autorizar "$(token "$EV_SI")" "$GRANDE" true)"
    $PSQL -q -c "UPDATE usuarios SET rol='evaluador' WHERE email='$EV_SI'" 2>/dev/null
    comparar "la autoridad autoriza"            "200" "$(autorizar "$TK_AUT" "$GRANDE" true)"
    comparar "con las dos, queda Aprobada"      "Aprobada" "$(estado_de "$GRANDE")"
    APROB=$(curl -s "$API/api/solicitudes/$GRANDE" -H "Authorization: Bearer $TK_DUENO" | grep -o '"etapa":"[a-z]*"' | tr '\n' ' ')
    comparar "quedan registradas las dos aprobaciones" '"etapa":"evaluacion" "etapa":"autorizacion" ' "$APROB"

    t "15d. Auditoría (GET /api/auditoria) — solo administrador, inmutable"
    AUDIT=$(curl -s "$API/api/auditoria?solicitudId=$GRANDE" -H "Authorization: Bearer $TK_ADMIN")
    cuantas() { echo "$AUDIT" | grep -o "\"operacion\":\"$1\"" | wc -l | tr -d ' '; }
    echo "   Todo lo que le pasó a la solicitud #$GRANDE, cada cosa con su autor y su fecha:"
    comparar "3 documentos subidos"          "3" "$(cuantas subida_documento)"
    comparar "1 cambio de monto"             "1" "$(cuantas cambio_monto)"
    comparar "1 validación de identidad"     "1" "$(cuantas validacion_identidad)"
    comparar "1 asignación de evaluador"     "1" "$(cuantas asignacion_evaluador)"
    comparar "4 cambios de estado"           "4" "$(cuantas cambio_estado)"
    comparar "2 aprobaciones (una por etapa)" "2" "$(cuantas aprobacion)"
    echo "   Los intentos rechazados (403 y 409) no cambiaron nada, así que no dejan registro."
    comparar "lo más reciente primero: la autorización" "aprobacion" \
      "$(echo "$AUDIT" | grep -o '"operacion":"[a-z_]*"' | head -1 | cut -d'"' -f4)"
    case "$AUDIT" in
      *'"detalle":{"antes":null,"campo":"monto_solicitado","despues":15000}'*) ok "el monto guarda el dato, su valor anterior y el nuevo" ;;
      *) mal "el cambio de monto no dice qué cambió" ;;
    esac
    case "$AUDIT" in
      *"$CUI_ANA"*|*password_hash*) mal "la auditoría expone el CUI completo o un hash" ;;
      *'*********0101'*) ok "sin secretos: el CUI va enmascarado" ;;
      *) mal "no aparece el CUI enmascarado" ;;
    esac
    comparar "la administradora consulta"   "200" "$(codigo "$API/api/auditoria" -H "Authorization: Bearer $TK_ADMIN")"
    comparar "un estudiante consulta"       "403" "$(codigo "$API/api/auditoria" -H "Authorization: Bearer $TK_DUENO")"
    comparar "un evaluador consulta"        "403" "$(codigo "$API/api/auditoria" -H "Authorization: Bearer $TK_EV_SI")"
    comparar "la autoridad consulta"        "403" "$(codigo "$API/api/auditoria" -H "Authorization: Bearer $TK_AUT")"
    comparar "sin sesión"                   "401" "$(codigo "$API/api/auditoria")"
    comparar "filtro inválido"              "400" "$(codigo "$API/api/auditoria?solicitudId=abc" -H "Authorization: Bearer $TK_ADMIN")"
    echo "   Inmutable en la base: ni la propia aplicación puede cambiar o borrar un registro."
    ANTES=$($PSQL -Atc "SELECT count(*) FROM auditoria" 2>/dev/null)
    inmutable() {  # inmutable "descripción" "SQL": la base tiene que rechazarlo
      case "$($PSQL -c "$2" 2>&1)" in
        *"no se modifica ni se elimina"*) ok "$1 → rechazado por la base" ;;
        *) mal "$1 → la base lo permitió" ;;
      esac
    }
    inmutable "UPDATE de un registro"  "UPDATE auditoria SET operacion='otra' WHERE solicitud_id=$GRANDE"
    inmutable "DELETE de un registro"  "DELETE FROM auditoria WHERE solicitud_id=$GRANDE"
    inmutable "TRUNCATE de la tabla"   "TRUNCATE auditoria"
    comparar "no se perdió ningún registro" "$ANTES" "$($PSQL -Atc "SELECT count(*) FROM auditoria" 2>/dev/null)"
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
