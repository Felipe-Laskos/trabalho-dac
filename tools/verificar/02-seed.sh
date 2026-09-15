#!/bin/bash
# ==============================================================================
# 02. Carga inicial (seed) — as 6 contagens exatas em Postgres e MongoDB,
# conforme REQUISITOS-E-FASES.md §4 / guia/10-modelagem-dados.md §9.
# ==============================================================================
set -uo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"
precisa_de docker

echo "=== 02. Validando Carga de Dados Inicial (Seed) ==="

cd "$REPO_ROOT" || exit 2

# psql_count <schema.tabela>
psql_count() {
  docker compose exec -T postgres \
    psql -U postgres -d bantads -tA -c "SELECT count(*) FROM $1;" 2>/dev/null | tr -d '[:space:]'
}

verificar_contagem_pg() {
  local area="$1" tabela="$2" esperado="$3"
  local obtido
  obtido="$(psql_count "$tabela")"

  if [ "$obtido" = "$esperado" ]; then
    verificar_ok "$area" "$tabela = $esperado"
  else
    verificar_fail "$area" "contagem de $tabela" "$esperado" "${obtido:-<sem resposta do Postgres>}"
  fi
}

verificar_contagem_pg "seed-cliente" "cliente.clientes" 5
verificar_contagem_pg "seed-gerente" "gerente.gerentes" 4
verificar_contagem_pg "seed-conta" "conta_command.eventos" 22
verificar_contagem_pg "seed-conta" "conta_query.contas" 5
verificar_contagem_pg "seed-conta" "conta_query.movimentacoes" 17

MONGO_COUNT="$(docker compose exec -T mongo \
  mongosh --quiet bantads_auth --eval "db.usuarios.countDocuments()" 2>/dev/null | tr -d '[:space:]')"

if [ "$MONGO_COUNT" = "9" ]; then
  verificar_ok "seed-auth" "usuarios (Mongo, bantads_auth) = 9"
else
  verificar_fail "seed-auth" "contagem de usuarios (Mongo, bantads_auth)" "9" "${MONGO_COUNT:-<sem resposta do Mongo>}"
fi

finalizar_modulo
