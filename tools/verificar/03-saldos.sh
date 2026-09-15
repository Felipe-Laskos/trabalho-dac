#!/bin/bash
# ==============================================================================
# 03. Saldos — os 5 saldos do seed (scripts/sql/07-seed-conta.sql) têm que
# conferir em três frentes: o valor conhecido do enunciado, o replay dos
# eventos no event store (conta_command.eventos) e o read model projetado
# (conta_query.contas). Se as três não baterem, o CQRS está quebrado.
# ==============================================================================
set -uo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"
precisa_de docker

echo "=== 03. Conferindo Saldos por Replay do Event Store ==="

cd "$REPO_ROOT" || exit 2

declare -A SALDO_ESPERADO=(
  [1291]="800.00"
  [0950]="10000.00"
  [8573]="200.00"
  [5887]="150000.00"
  [7617]="1500.00"
)

# Recalcula o saldo de cada conta a partir só do event store (fonte de verdade),
# sem tocar no read model — é o "replay".
REPLAY_SQL="
SELECT objeto_id, TO_CHAR(SUM(
  CASE tipo
    WHEN 'Depósito' THEN (payload::json->>'valor')::numeric
    WHEN 'TransferênciaDestino' THEN (payload::json->>'valor')::numeric
    WHEN 'Saque' THEN -(payload::json->>'valor')::numeric
    WHEN 'TransferênciaOrigem' THEN -(payload::json->>'valor')::numeric
    ELSE 0
  END
), 'FM999999999990.00')
FROM conta_command.eventos
GROUP BY objeto_id
ORDER BY objeto_id;
"

READ_MODEL_SQL="SELECT numero, TO_CHAR(saldo, 'FM999999999990.00') FROM conta_query.contas ORDER BY numero;"

REPLAY_SAIDA="$(docker compose exec -T postgres \
  psql -U postgres -d bantads -tA -F'|' -c "$REPLAY_SQL" 2>/dev/null)"

READ_MODEL_SAIDA="$(docker compose exec -T postgres \
  psql -U postgres -d bantads -tA -F'|' -c "$READ_MODEL_SQL" 2>/dev/null)"

if [ -z "$REPLAY_SAIDA" ] || [ -z "$READ_MODEL_SAIDA" ]; then
  verificar_fail "saldos" "consulta ao Postgres (replay e read model)" \
    "saída não vazia" "vazio (banco inacessível ou seed não populado)"
  finalizar_modulo
fi

declare -A SALDO_REPLAY
while IFS='|' read -r conta valor; do
  [ -n "$conta" ] && SALDO_REPLAY["$conta"]="$valor"
done <<< "$REPLAY_SAIDA"

declare -A SALDO_READ_MODEL
while IFS='|' read -r conta valor; do
  [ -n "$conta" ] && SALDO_READ_MODEL["$conta"]="$valor"
done <<< "$READ_MODEL_SAIDA"

for conta in "${!SALDO_ESPERADO[@]}"; do
  esperado="${SALDO_ESPERADO[$conta]}"
  replay="${SALDO_REPLAY[$conta]:-<sem eventos>}"
  read_model="${SALDO_READ_MODEL[$conta]:-<sem linha em conta_query.contas>}"

  if [ "$replay" = "$esperado" ] && [ "$read_model" = "$esperado" ]; then
    verificar_ok "saldos" "conta $conta: replay e read model = $esperado"
  else
    verificar_fail "saldos" "saldo da conta $conta (esperado == replay == read model)" \
      "$esperado" "replay=$replay, read_model=$read_model"
  fi
done

finalizar_modulo
