#!/bin/bash
# ==============================================================================
# 05. R16 — Relatório de clientes: GET /relatorios/clientes devolve 202 + job,
# o polling chega a CONCLUIDO com resultType "inline", e GET /jobs/{id}/result
# traz os 5 clientes do seed ordenados por nome, com as 8 colunas exatas e
# dinheiro como string de duas casas. Assume que um POST /reboot acabou de rodar.
# ==============================================================================
set -uo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"
precisa_de curl jq

echo "=== 05. Validando R16 — Relatório de Clientes ==="

CT_TMP="$(mktemp -d -t bantads-r16.XXXXXX)"
trap 'rm -rf "$CT_TMP"' EXIT

# chamar <metodo> <caminho> [header "Nome: valor"]  — devolve o status HTTP;
# corpo em $CT_TMP/body e cabeçalhos em $CT_TMP/headers
chamar() {
  local metodo="$1" caminho="$2" header="${3:-}"
  local args=(-s -o "$CT_TMP/body" -D "$CT_TMP/headers" -w "%{http_code}" --connect-timeout 5 -X "$metodo")

  [ -n "$header" ] && args+=(-H "$header")

  local resultado
  resultado="$(curl "${args[@]}" "$GATEWAY_URL$caminho" 2>/dev/null)"
  echo "${resultado:-000}"
}

corpo_recebido() { cat "$CT_TMP/body" 2>/dev/null; }

NOMES_ESPERADOS='["Catharyna","Catianna","Cleuddônio","Coândrya","Cutardo"]'
COLUNAS_ESPERADAS='["cpf","cpfGerente","email","nome","nomeGerente","numeroConta","salario","saldo"]'

LOGIN_GERENTE='{"email":"ger1@bantads.com.br","senha":"tads"}'
STATUS=$(curl -s -o "$CT_TMP/body" -w "%{http_code}" --connect-timeout 5 -X POST \
  -H "Content-Type: application/json" -d "$LOGIN_GERENTE" "$GATEWAY_URL/login" 2>/dev/null)
TOKEN="$(jq_seguro "$(corpo_recebido)" -r '.token // empty')"

if [ -z "$TOKEN" ]; then
  verificar_fail "r16-relatorio" "login do gerente para pedir o relatório" \
    "token válido" "sem token (HTTP ${STATUS:-000})"
  finalizar_modulo
fi

STATUS=$(chamar GET /relatorios/clientes)
if [ "$STATUS" = "401" ]; then
  verificar_ok "r16-relatorio" "GET /relatorios/clientes sem token -> 401"
else
  verificar_fail "r16-relatorio" "GET /relatorios/clientes sem token" "401" "HTTP $STATUS"
fi

STATUS=$(chamar GET /relatorios/clientes "x-access-token: $TOKEN")
JOB_ID="$(jq_seguro "$(corpo_recebido)" -r '.jobId // empty')"
LOCATION="$(grep -i '^location:' "$CT_TMP/headers" 2>/dev/null | tr -d '\r' | awk '{print $2}')"

if [ "$STATUS" = "202" ] && [ -n "$JOB_ID" ] && [ "$LOCATION" = "/jobs/$JOB_ID/status" ]; then
  verificar_ok "r16-relatorio" "GET /relatorios/clientes (gerente) -> 202, jobId e Location do job"
else
  verificar_fail "r16-relatorio" "GET /relatorios/clientes (gerente)" \
    "202, jobId, Location=/jobs/<jobId>/status" \
    "HTTP $STATUS, jobId=${JOB_ID:-<ausente>}, Location=${LOCATION:-<ausente>}"
  finalizar_modulo
fi

JOB_STATUS="PENDENTE"
for _ in $(seq 1 20); do
  chamar GET "/jobs/$JOB_ID/status" "x-access-token: $TOKEN" >/dev/null
  JOB_STATUS="$(jq_seguro "$(corpo_recebido)" -r '.status // empty')"
  { [ "$JOB_STATUS" = "CONCLUIDO" ] || [ "$JOB_STATUS" = "FALHA" ]; } && break
  sleep 1
done

RESULT_TYPE="$(jq_seguro "$(corpo_recebido)" -r '.resultType // empty')"
ERRO_JOB="$(jq_seguro "$(corpo_recebido)" -r '.erro // empty')"

if [ "$JOB_STATUS" = "CONCLUIDO" ] && [ "$RESULT_TYPE" = "inline" ]; then
  verificar_ok "r16-relatorio" "polling do job -> CONCLUIDO com resultType inline"
else
  verificar_fail "r16-relatorio" "job do relatório após polling (até 20s)" \
    "status=CONCLUIDO, resultType=inline" \
    "status=$JOB_STATUS, resultType=${RESULT_TYPE:-<vazio>}, erro=${ERRO_JOB:-<vazio>}"
  finalizar_modulo
fi

STATUS=$(chamar GET "/jobs/$JOB_ID/result" "x-access-token: $TOKEN")
RESULTADO="$(corpo_recebido)"

# O 04-requisitos.sh aprova um cliente de teste (R9) antes deste módulo, então a
# lista pode ter mais que os 5 do seed: o que se confere é que os 5 estão lá,
# uma vez cada, na ordem pt-BR entre si (a ordenação completa é coberta pelos
# testes do Gateway, que comparam com collation de verdade)
NOMES_OBTIDOS="$(jq_seguro "$RESULTADO" -c '[.clientes[]?.nome]' 2>/dev/null)"
SEED_NA_ORDEM="$(jq_seguro "$RESULTADO" -c --argjson seed "$NOMES_ESPERADOS" \
  '[.clientes[]?.nome | select(. as $n | $seed | index($n))]' 2>/dev/null)"
if [ "$STATUS" = "200" ] && [ "$SEED_NA_ORDEM" = "$NOMES_ESPERADOS" ]; then
  verificar_ok "r16-relatorio" "GET /jobs/{id}/result -> os 5 clientes do seed, uma vez cada, ordenados por nome (pt-BR)"
else
  verificar_fail "r16-relatorio" "clientes do seed no relatório (presença e ordem)" \
    "200 e $NOMES_ESPERADOS (nesta ordem)" "HTTP $STATUS e ${NOMES_OBTIDOS:-<sem clientes>}"
fi

COLUNAS_OBTIDAS="$(jq_seguro "$RESULTADO" -c '[.clientes[]? | keys | sort] | unique' 2>/dev/null)"
if [ "$COLUNAS_OBTIDAS" = "[$COLUNAS_ESPERADAS]" ]; then
  verificar_ok "r16-relatorio" "toda linha tem exatamente as 8 colunas do contrato, e nada além"
else
  verificar_fail "r16-relatorio" "colunas de cada linha" \
    "[$COLUNAS_ESPERADAS]" "${COLUNAS_OBTIDAS:-<sem linhas>}"
fi

DINHEIRO_RUIM="$(jq_seguro "$RESULTADO" -r '[.clientes[]? | .salario, .saldo
  | select((type != "string") or (test("^[0-9]+\\.[0-9]{2}$") | not))] | length' 2>/dev/null)"
if [ "$DINHEIRO_RUIM" = "0" ]; then
  verificar_ok "r16-relatorio" "salario e saldo saem como string no formato ^\\d+\\.\\d{2}\$"
else
  verificar_fail "r16-relatorio" "formato de salario/saldo" \
    "todos string com duas casas" "${DINHEIRO_RUIM:-?} valor(es) fora do formato"
fi

# Catharyna (12912861012) tem a conta 1291, saldo 800.00 e é do gerente Geniéve (ger1)
LINHA_CATHARYNA="$(jq_seguro "$RESULTADO" -c \
  '.clientes[]? | select(.cpf == "12912861012") | [.numeroConta, .saldo, .cpfGerente, .nomeGerente]' 2>/dev/null)"
ESPERADA='["1291","800.00","98574307084","Geniéve"]'
if [ "$LINHA_CATHARYNA" = "$ESPERADA" ]; then
  verificar_ok "r16-relatorio" "linha de Catharyna: conta 1291, saldo 800.00, gerente Geniéve"
else
  verificar_fail "r16-relatorio" "conteúdo da linha de Catharyna (12912861012)" \
    "$ESPERADA" "${LINHA_CATHARYNA:-<linha ausente>}"
fi

finalizar_modulo
