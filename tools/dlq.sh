#!/bin/bash
set -uo pipefail

RABBITMQ_API_URL="${RABBITMQ_API_URL:-http://localhost:15672/api}"
RABBITMQ_USER="${RABBITMQ_USER:-guest}"
RABBITMQ_PASS="${RABBITMQ_PASS:-guest}"

declare -A FILA_ORIGEM=(
  [ms.cliente.cmd.dlq]="ms.cliente.cmd"
  [ms.conta.cmd.dlq]="ms.conta.cmd"
  [ms.gerente.cmd.dlq]="ms.gerente.cmd"
  [ms.auth.cmd.dlq]="ms.auth.cmd"
  [ms.conta.events.dlq]="ms.conta.events"
)

DLQS_CONHECIDAS=(
  ms.cliente.cmd.dlq ms.conta.cmd.dlq ms.gerente.cmd.dlq
  ms.auth.cmd.dlq ms.conta.events.dlq
)

erro() { echo "erro: $1" >&2; exit 1; }

precisa_de() {
  for c in "$@"; do
    command -v "$c" >/dev/null 2>&1 || erro "comando obrigatório não encontrado: $c"
  done
}

precisa_de curl jq

api() {
  local metodo="$1" caminho="$2" corpo="${3:-}"
  local args=(-s -u "$RABBITMQ_USER:$RABBITMQ_PASS" -X "$metodo")
  [ -n "$corpo" ] && args+=(-H "Content-Type: application/json" -d "$corpo")
  curl "${args[@]}" "$RABBITMQ_API_URL$caminho"
}

validar_dlq() {
  local fila="$1"
  [[ "$fila" == *.dlq ]] || erro "'$fila' não parece uma DLQ (esperado algo terminando em .dlq)"
  [ -n "${FILA_ORIGEM[$fila]+x}" ] || erro "'$fila' não é uma das 5 DLQs conhecidas: ${DLQS_CONHECIDAS[*]}"
}

confirmar() {
  echo "$1"
  read -r -p "Digite 'sim' para confirmar: " resposta
  [ "$resposta" = "sim" ] || { echo "Cancelado."; exit 1; }
}

cmd_listar() {
  local json
  json="$(api GET "/queues" 2>/dev/null)"
  jq_seguro "$json" -e 'type == "array"' >/dev/null 2>&1 \
    || erro "não foi possível consultar a API do RabbitMQ em $RABBITMQ_API_URL/queues"

  printf "%-24s %10s\n" "DLQ" "MENSAGENS"
  for dlq in "${DLQS_CONHECIDAS[@]}"; do
    local n
    n="$(echo "$json" | jq -r --arg nome "$dlq" \
      '(map(select(.name == $nome)) | first).messages // "ausente"')"
    printf "%-24s %10s\n" "$dlq" "$n"
  done
}

jq_seguro() {
  local entrada="$1"; shift
  jq "$@" <<< "${entrada:-null}"
}

cmd_ver() {
  local fila="$1"
  validar_dlq "$fila"

  local resposta
  resposta="$(api POST "/queues/%2f/$fila/get" \
    '{"count":1,"ackmode":"reject_requeue_true","encoding":"auto","truncate":50000}' 2>/dev/null)"

  jq_seguro "$resposta" -e 'type == "array"' >/dev/null 2>&1 \
    || erro "não foi possível consultar a API do RabbitMQ em $RABBITMQ_API_URL"
  if jq_seguro "$resposta" -e 'length == 0' >/dev/null 2>&1; then
    echo "Fila '$fila' está vazia."
    return 0
  fi

  echo "$resposta" | jq '.[0] | {routing_key, redelivered, payload, payload_encoding, properties}'
  echo
  echo "(mensagem espiada com reject_requeue_true — ela continua na fila, a contagem não muda)"
}

reinjetar_uma() {
  local dlq="$1" original="$2"

  local consumido
  consumido="$(api POST "/queues/%2f/$dlq/get" \
    '{"count":1,"ackmode":"ack_requeue_false","encoding":"auto","truncate":50000}' 2>/dev/null)"

  jq_seguro "$consumido" -e 'type == "array"' >/dev/null 2>&1 \
    || erro "não foi possível consultar a API do RabbitMQ em $RABBITMQ_API_URL"
  if jq_seguro "$consumido" -e 'length == 0' >/dev/null 2>&1; then
    echo "  (fila vazia, nada a reinjetar)"
    return 1
  fi

  local payload payload_encoding properties
  payload="$(echo "$consumido" | jq -r '.[0].payload')"
  payload_encoding="$(echo "$consumido" | jq -r '.[0].payload_encoding')"
  properties="$(echo "$consumido" | jq -c '.[0].properties | if type == "object" then . else {} end')"

  local publicar_corpo publicado
  publicar_corpo="$(jq -nc --arg rk "$original" --arg payload "$payload" \
    --arg enc "$payload_encoding" --argjson props "$properties" \
    '{properties: $props, routing_key: $rk, payload: $payload, payload_encoding: $enc}')"

  publicado="$(api POST "/exchanges/%2f/amq.default/publish" "$publicar_corpo" 2>/dev/null)"

  if ! jq_seguro "$publicado" -e '.routed == true' >/dev/null 2>&1; then
    echo "  [FALHA] a mensagem já saiu de '$dlq' mas a publicação em '$original' não foi confirmada."
    echo "  Mensagem que saiu da DLQ (recupere manualmente):"
    echo "    payload: $payload"
    echo "    payload_encoding: $payload_encoding"
    echo "    properties: $properties"
    return 1
  fi

  echo "  [OK] reinjetada em '$original'"
  return 0
}

cmd_reinjetar() {
  local fila="$1" n="${2:-1}"
  validar_dlq "$fila"
  [[ "$n" =~ ^[0-9]+$ ]] && [ "$n" -gt 0 ] || erro "n precisa ser um inteiro positivo (recebido: '$n')"

  local original="${FILA_ORIGEM[$fila]}"
  confirmar "Vai reinjetar até $n mensagem(ns) de '$fila' de volta em '$original'."

  local sucesso=0
  for i in $(seq 1 "$n"); do
    echo "[$i/$n]"
    reinjetar_uma "$fila" "$original" && sucesso=$((sucesso + 1)) || break
  done

  echo "Reinjetadas: $sucesso de $n solicitadas."
}

cmd_purgar() {
  local fila="$1"
  validar_dlq "$fila"

  confirmar "Vai APAGAR todas as mensagens de '$fila'. Isso não pode ser desfeito."

  local status
  status="$(curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" -X DELETE \
    -o /dev/null -w "%{http_code}" "$RABBITMQ_API_URL/queues/%2f/$fila/contents" 2>/dev/null)"

  if [ "$status" = "204" ]; then
    echo "Fila '$fila' purgada."
  else
    erro "purge de '$fila' falhou (HTTP ${status:-000})"
  fi
}

case "${1:-}" in
  listar)
    cmd_listar
    ;;
  ver)
    [ -n "${2:-}" ] || erro "uso: dlq.sh ver <fila.dlq>"
    cmd_ver "$2"
    ;;
  reinjetar)
    [ -n "${2:-}" ] || erro "uso: dlq.sh reinjetar <fila.dlq> [n]"
    cmd_reinjetar "$2" "${3:-1}"
    ;;
  purgar)
    [ -n "${2:-}" ] || erro "uso: dlq.sh purgar <fila.dlq>"
    cmd_purgar "$2"
    ;;
  *)
    echo "Uso:"
    echo "  tools/dlq.sh listar"
    echo "  tools/dlq.sh ver <fila.dlq>"
    echo "  tools/dlq.sh reinjetar <fila.dlq> [n]"
    echo "  tools/dlq.sh purgar <fila.dlq>"
    exit 1
    ;;
esac
