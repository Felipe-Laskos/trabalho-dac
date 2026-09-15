#!/bin/bash
# ==============================================================================
# 00. Saúde da frota — os 12 contêineres do docker-compose.yml devem estar
# "healthy" e o Gateway (único serviço com porta exposta) deve responder.
# ==============================================================================
set -uo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"
precisa_de docker jq curl

echo "=== 00. Checando Saúde da Frota ==="

cd "$REPO_ROOT" || exit 2

SERVICOS_ESPERADOS=(
  postgres mongo redis rabbitmq
  ms-auth ms-orquestrador ms-email ms-cliente ms-gerente ms-conta
  gateway front
)

PS_JSON="$(docker compose ps --all --format json 2>/dev/null)"

if [ -z "$PS_JSON" ]; then
  verificar_fail "frota" "docker compose ps retorna a frota" \
    "saída não vazia" "vazio (compose não está rodando ou compose.yml não encontrado)"
else
  for servico in "${SERVICOS_ESPERADOS[@]}"; do
    LINHA="$(echo "$PS_JSON" | jq -c "select(.Service == \"$servico\")" 2>/dev/null | tail -n1)"

    if [ -z "$LINHA" ]; then
      verificar_fail "frota" "contêiner '$servico' existe" "presente" "ausente"
      continue
    fi

    ESTADO="$(echo "$LINHA" | jq -r '.State')"
    SAUDE="$(echo "$LINHA" | jq -r '.Health // "sem-healthcheck"')"

    if [ "$ESTADO" != "running" ]; then
      verificar_fail "frota" "contêiner '$servico' está rodando" "running" "$ESTADO"
    elif [ "$SAUDE" != "healthy" ]; then
      verificar_fail "frota" "contêiner '$servico' está healthy" "healthy" "$SAUDE"
    else
      verificar_ok "frota" "contêiner '$servico' running e healthy"
    fi
  done
fi

HTTP_STATUS="$(curl -s -o /tmp/bantads-frota-health.$$ -w "%{http_code}" \
  --connect-timeout 3 "$GATEWAY_URL/health" 2>/dev/null)"
HTTP_STATUS="${HTTP_STATUS:-000}"

if [ "$HTTP_STATUS" = "200" ] && grep -q '"status"[[:space:]]*:[[:space:]]*"UP"' /tmp/bantads-frota-health.$$ 2>/dev/null; then
  verificar_ok "frota" "GET $GATEWAY_URL/health responde 200 {\"status\":\"UP\"}"
else
  verificar_fail "frota" "GET $GATEWAY_URL/health responde 200 {\"status\":\"UP\"}" \
    "200 {\"status\":\"UP\"}" "HTTP $HTTP_STATUS"
fi
rm -f /tmp/bantads-frota-health.$$

finalizar_modulo
