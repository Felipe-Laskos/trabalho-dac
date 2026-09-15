#!/bin/bash
# ==============================================================================
# 01. Topologia do RabbitMQ — as 8 filas + 5 DLQs declaradas em
# gateway/topologia.js devem existir, e cada fila com DLQ precisa apontar
# x-dead-letter-exchange/x-dead-letter-routing-key para a própria DLQ.
# ==============================================================================
set -uo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"
precisa_de curl jq

echo "=== 01. Validando Topologia de Filas e DLQs no RabbitMQ ==="

FILAS_ESPERADAS=(
  "saga.cmd" "ms.cliente.cmd" "ms.conta.cmd" "ms.gerente.cmd"
  "ms.auth.cmd" "ms.email.cmd" "orquestrador.reply" "ms.conta.events"
)

DLQS_ESPERADAS=(
  "ms.cliente.cmd.dlq" "ms.conta.cmd.dlq" "ms.gerente.cmd.dlq"
  "ms.auth.cmd.dlq" "ms.conta.events.dlq"
)

# fila de comando -> nome da sua DLQ (as únicas com x-dead-letter-*)
declare -A COM_DLQ=(
  [ms.cliente.cmd]="ms.cliente.cmd.dlq"
  [ms.conta.cmd]="ms.conta.cmd.dlq"
  [ms.gerente.cmd]="ms.gerente.cmd.dlq"
  [ms.auth.cmd]="ms.auth.cmd.dlq"
  [ms.conta.events]="ms.conta.events.dlq"
)

QUEUES_JSON="$(curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
  --connect-timeout 3 "$RABBITMQ_API_URL/queues" 2>/dev/null)"

if ! jq_seguro "$QUEUES_JSON" -e 'type == "array"' >/dev/null 2>&1; then
  verificar_fail "topologia" "conexão com a Management API do RabbitMQ ($RABBITMQ_API_URL/queues)" \
    "lista JSON de filas" "resposta inválida ou API inacessível"
  finalizar_modulo
fi

for fila in "${FILAS_ESPERADAS[@]}" "${DLQS_ESPERADAS[@]}"; do
  if echo "$QUEUES_JSON" | jq -e --arg nome "$fila" 'any(.[]; .name == $nome)' >/dev/null 2>&1; then
    verificar_ok "topologia" "fila '$fila' existe"
  else
    verificar_fail "topologia" "fila '$fila' existe" "presente" "ausente"
  fi
done

for fila in "${!COM_DLQ[@]}"; do
  dlq_esperada="${COM_DLQ[$fila]}"
  ARGS="$(echo "$QUEUES_JSON" | jq -c --arg nome "$fila" \
    '(map(select(.name == $nome)) | first).arguments // {}' 2>/dev/null)"

  EXCHANGE="$(echo "$ARGS" | jq -r '.["x-dead-letter-exchange"] // "<ausente>"')"
  ROUTING_KEY="$(echo "$ARGS" | jq -r '.["x-dead-letter-routing-key"] // "<ausente>"')"

  if [ "$EXCHANGE" = "" ] && [ "$ROUTING_KEY" = "$dlq_esperada" ]; then
    verificar_ok "topologia" "fila '$fila' roteia para '$dlq_esperada' (default exchange)"
  else
    verificar_fail "topologia" "argumentos DLQ da fila '$fila'" \
      "x-dead-letter-exchange=\"\" e x-dead-letter-routing-key=\"$dlq_esperada\"" \
      "x-dead-letter-exchange=\"$EXCHANGE\" e x-dead-letter-routing-key=\"$ROUTING_KEY\""
  fi
done

finalizar_modulo
