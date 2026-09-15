#!/bin/bash
# ==============================================================================
# Biblioteca compartilhada da bateria de verificação (tools/verificar/).
# NÃO é a suíte oficial do professor — vive à parte, em tools/, conforme a
# issue #31 e o roadmap S4 (PL-B).
# ==============================================================================

# Diretório absoluto de tools/verificar/, independente de onde o script é chamado.
LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$LIB_DIR/../.." && pwd)"

GATEWAY_URL="${GATEWAY_URL:-http://localhost:8000}"
RABBITMQ_API_URL="${RABBITMQ_API_URL:-http://localhost:15672/api}"
RABBITMQ_USER="${RABBITMQ_USER:-guest}"
RABBITMQ_PASS="${RABBITMQ_PASS:-guest}"

# Arquivo onde cada script acrescenta uma linha por critério verificado, para o
# verificar.sh montar o placar por área ao final. Um único arquivo por execução
# da bateria: o orquestrador exporta RESULTADOS_FILE antes de chamar os módulos;
# rodado isoladamente, cada script cria o seu próprio arquivo descartável.
RESULTADOS_FILE="${RESULTADOS_FILE:-$(mktemp -t bantads-verificar.XXXXXX)}"
export RESULTADOS_FILE

# Quantas falhas este script (processo atual) encontrou — decide o exit code.
FALHAS_LOCAIS=0

# Dono de cada área, para a mensagem "aviso ao dono" — nunca corrigimos módulo
# alheio, só apontamos quem é responsável (tabela "Quem faz o quê" do roadmap).
declare -A DONO_DA_AREA=(
  [frota]="Felipe (docker-compose.yml / infra)"
  [topologia]="Felipe (Gateway / RabbitMQ)"
  [seed-cliente]="Nath (MS Cliente)"
  [seed-gerente]="Nath (MS Gerente)"
  [seed-conta]="Dani (MS Conta)"
  [seed-auth]="Felipe (MS Auth)"
  [saldos]="Dani (MS Conta — event store / read model)"
  [r1-autocadastro]="Nath / Laura (autocadastro)"
  [r2-login]="Felipe / Davi (login/logout)"
  [r3-home-cliente]="Dani / Davi (home do cliente)"
)

cor_verde() { echo -e "\e[32m$1\e[0m"; }
cor_vermelha() { echo -e "\e[31m$1\e[0m"; }
cor_amarela() { echo -e "\e[33m$1\e[0m"; }

# verificar_ok <area> <criterio>
verificar_ok() {
  local area="$1" criterio="$2"
  echo -e "[$(cor_verde OK)] [$area] $criterio"
  echo "OK|$area|$criterio||" >> "$RESULTADOS_FILE"
}

# verificar_fail <area> <criterio> <esperado> <obtido>
verificar_fail() {
  local area="$1" criterio="$2" esperado="$3" obtido="$4"
  local dono="${DONO_DA_AREA[$area]:-dono não mapeado}"
  echo -e "[$(cor_vermelha FAIL)] [$area] $criterio"
  echo "         esperado: $esperado | obtido: $obtido"
  echo "         aviso ao dono: $dono"
  echo "FAIL|$area|$criterio|$esperado|$obtido" >> "$RESULTADOS_FILE"
  FALHAS_LOCAIS=$((FALHAS_LOCAIS + 1))
}

# encerra o script com o exit code correspondente às falhas locais
finalizar_modulo() {
  if [ "$FALHAS_LOCAIS" -eq 0 ]; then
    exit 0
  fi
  exit 1
}

# jq_seguro <entrada-possivelmente-vazia> <argumentos do jq...>
# Com stdin vazio, o jq não roda o filtro nenhuma vez — nem `-e` nem `// padrão`
# disparam, e o resultado sai como se tivesse passado. Isso mascarava falha de
# conexão como sucesso em vários pontos desta bateria (bug real encontrado ao
# testar 01-topologia.sh e 04-requisitos.sh sem o Gateway/RabbitMQ no ar).
# Substituir vazio por "null" garante que o filtro sempre roda uma vez.
jq_seguro() {
  local entrada="$1"; shift
  jq "$@" <<< "${entrada:-null}"
}

precisa_de() {
  for comando in "$@"; do
    if ! command -v "$comando" >/dev/null 2>&1; then
      echo -e "[$(cor_vermelha FAIL)] comando obrigatório não encontrado: $comando" >&2
      exit 2
    fi
  done
}
