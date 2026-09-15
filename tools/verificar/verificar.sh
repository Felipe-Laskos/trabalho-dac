#!/bin/bash
# ==============================================================================
# Bateria de verificação BANTADS (tools/verificar/) — S4, PL-B.
# Orquestra 00-frota, 01-topologia, 02-seed, 03-saldos e 04-requisitos a
# partir de um POST /reboot, e imprime um placar por área ao final.
#
# NÃO é a suíte oficial do professor (test_bantads) — essa não é tocada aqui.
# Veja tools/verificar/LEIA-ME.md para como rodar e como ler o placar.
# ==============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_lib.sh"
precisa_de curl jq

# Fresco a cada execução: garante que rodar 2x seguidas não arrasta resultado
# da execução anterior (idempotência do placar, não só do sistema).
RESULTADOS_FILE="$(mktemp -t bantads-verificar.XXXXXX)"
export RESULTADOS_FILE
: > "$RESULTADOS_FILE"

echo "======================================"
echo "    BATERIA DE VERIFICAÇÃO BANTADS    "
echo "======================================"
echo

echo "--- Partindo de POST $GATEWAY_URL/reboot ---"
REBOOT_STATUS="$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 \
  -X POST "$GATEWAY_URL/reboot" 2>/dev/null)"
REBOOT_STATUS="${REBOOT_STATUS:-000}"

if [ "$REBOOT_STATUS" != "200" ]; then
  echo -e "[$(cor_vermelha FAIL)] POST $GATEWAY_URL/reboot retornou HTTP $REBOOT_STATUS — abortando a bateria."
  echo "Nada abaixo depende de estado anterior: sem reboot bem-sucedido, nenhum módulo roda."
  exit 2
fi
echo -e "[$(cor_verde OK)] reboot concluído"
echo

MODULOS=(
  "00-frota.sh"
  "01-topologia.sh"
  "02-seed.sh"
  "03-saldos.sh"
  "04-requisitos.sh"
)

STATUS_MODULO=()
for modulo in "${MODULOS[@]}"; do
  echo "--- Executando $modulo ---"
  if "$SCRIPT_DIR/$modulo"; then
    STATUS_MODULO+=("$modulo:OK")
  else
    STATUS_MODULO+=("$modulo:FAIL")
  fi
  echo
done

echo "======================================"
echo "         PLACAR POR ÁREA              "
echo "======================================"

AREAS="$(cut -d'|' -f2 "$RESULTADOS_FILE" | sort -u)"
TOTAL_OK=0
TOTAL_FAIL=0

if [ -z "$AREAS" ]; then
  echo "(nenhum critério foi avaliado — verifique se os módulos rodaram)"
else
  printf "%-20s %6s %6s   %s\n" "ÁREA" "OK" "FAIL" "DONO (se houver falha)"
  while IFS= read -r area; do
    [ -z "$area" ] && continue
    OK_COUNT="$(awk -F'|' -v a="$area" '$1=="OK" && $2==a' "$RESULTADOS_FILE" | wc -l | tr -d ' ')"
    FAIL_COUNT="$(awk -F'|' -v a="$area" '$1=="FAIL" && $2==a' "$RESULTADOS_FILE" | wc -l | tr -d ' ')"
    TOTAL_OK=$((TOTAL_OK + OK_COUNT))
    TOTAL_FAIL=$((TOTAL_FAIL + FAIL_COUNT))

    DONO="-"
    [ "$FAIL_COUNT" -gt 0 ] && DONO="${DONO_DA_AREA[$area]:-dono não mapeado}"

    printf "%-20s %6s %6s   %s\n" "$area" "$OK_COUNT" "$FAIL_COUNT" "$DONO"
  done <<< "$AREAS"
fi

echo

if [ "$TOTAL_FAIL" -gt 0 ]; then
  echo "--- Falhas (critério, esperado, obtido, dono) ---"
  while IFS='|' read -r tipo area criterio esperado obtido; do
    [ "$tipo" = "FAIL" ] || continue
    dono="${DONO_DA_AREA[$area]:-dono não mapeado}"
    echo "[$area] $criterio"
    echo "    esperado: $esperado | obtido: $obtido | dono: $dono"
  done < "$RESULTADOS_FILE"
  echo
fi

echo "======================================"
echo "         VERIFICAÇÃO CONCLUÍDA        "
echo "         OK: $TOTAL_OK   FAIL: $TOTAL_FAIL"
echo "======================================"

rm -f "$RESULTADOS_FILE"

[ "$TOTAL_FAIL" -eq 0 ]
