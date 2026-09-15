#!/bin/bash
# ==============================================================================
# 04. Requisitos já entregues — R1 (autocadastro), R2 (login/logout) e
# R3 (home do cliente), batendo na porta pública do Gateway (8000).
# Como todo o resto da bateria, assume que um POST /reboot acabou de rodar.
# ==============================================================================
set -uo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"
precisa_de curl jq

echo "=== 04. Validando Requisitos Funcionais (R1, R2, R3) ==="

CT_TMP="$(mktemp -d -t bantads-req.XXXXXX)"
trap 'rm -rf "$CT_TMP"' EXIT

chamar() {
  # chamar <metodo> <caminho> [corpo-json] [header extra "Nome: valor"]
  local metodo="$1" caminho="$2" corpo="${3:-}" header="${4:-}"
  local args=(-s -o "$CT_TMP/body" -w "%{http_code}" --connect-timeout 5 -X "$metodo")

  [ -n "$header" ] && args+=(-H "$header")
  if [ -n "$corpo" ]; then
    args+=(-H "Content-Type: application/json" -d "$corpo")
  fi

  local resultado
  resultado="$(curl "${args[@]}" "$GATEWAY_URL$caminho" 2>/dev/null)"
  echo "${resultado:-000}"
}

corpo_recebido() { cat "$CT_TMP/body" 2>/dev/null; }

# ------------------------------------------------------------------ R1 ---
CPF_TESTE="99999999999"
EMAIL_TESTE="verificacao.bateria+$$@teste.bantads.com.br"

CORPO_SOLICITACAO=$(jq -nc --arg cpf "$CPF_TESTE" --arg email "$EMAIL_TESTE" '{
  cpf: $cpf, nome: "Verificacao Bateria", email: $email, telefone: "41999999999",
  salario: 3000.00,
  endereco: { logradouro: "Rua Teste", numero: "100", cep: "80000000", cidade: "Curitiba", uf: "PR" }
}')

STATUS=$(chamar POST /solicitacoes "$CORPO_SOLICITACAO")
STATUS_SOLICITACAO="$(jq_seguro "$(corpo_recebido)" -r '.status // "<sem status>"' 2>/dev/null)"
TEM_LINK_SELF="$(jq_seguro "$(corpo_recebido)" -e '._links.self' >/dev/null 2>&1 && echo sim || echo nao)"

if [ "$STATUS" = "201" ] && [ "$STATUS_SOLICITACAO" = "PENDENTE" ] && [ "$TEM_LINK_SELF" = "sim" ]; then
  verificar_ok "r1-autocadastro" "POST /solicitacoes válido -> 201, status PENDENTE, _links.self"
else
  verificar_fail "r1-autocadastro" "POST /solicitacoes válido" \
    "201, status=PENDENTE, _links.self presente" \
    "HTTP $STATUS, status=$STATUS_SOLICITACAO, _links.self=$TEM_LINK_SELF"
fi

STATUS=$(chamar POST /solicitacoes "$CORPO_SOLICITACAO")
if [ "$STATUS" = "409" ]; then
  verificar_ok "r1-autocadastro" "CPF/e-mail duplicado -> 409"
else
  verificar_fail "r1-autocadastro" "reenviar mesmo CPF" "409" "HTTP $STATUS"
fi

CORPO_MALFORMADO='{"nome":"Sem CPF"}'
STATUS=$(chamar POST /solicitacoes "$CORPO_MALFORMADO")
if [ "$STATUS" = "400" ]; then
  verificar_ok "r1-autocadastro" "corpo malformado (sem CPF) -> 400"
else
  verificar_fail "r1-autocadastro" "POST /solicitacoes malformado" "400" "HTTP $STATUS"
fi

# ------------------------------------------------------------------ R2 ---
LOGIN_OK='{"email":"cli1@bantads.com.br","senha":"tads"}'
STATUS=$(chamar POST /login "$LOGIN_OK")
BODY_LOGIN="$(corpo_recebido)"
TOKEN="$(jq_seguro "$BODY_LOGIN" -r '.token // empty')"
TIPO="$(jq_seguro "$BODY_LOGIN" -r '.tipo // empty')"
TEM_SENHA="$(jq_seguro "$BODY_LOGIN" -e '.. | objects | has("senha")' >/dev/null 2>&1 && echo sim || echo nao)"

TOKEN_PRESENCA="ausente"
[ -n "$TOKEN" ] && TOKEN_PRESENCA="presente"

if [ "$STATUS" = "200" ] && [ -n "$TOKEN" ] && [ "$TIPO" = "CLIENTE" ] && [ "$TEM_SENHA" = "nao" ]; then
  verificar_ok "r2-login" "POST /login válido -> 200, token presente, tipo=CLIENTE, sem campo senha"
else
  # nunca imprime o token em si, só se está presente ou não
  verificar_fail "r2-login" "POST /login válido" \
    "200, token presente, tipo=CLIENTE, sem senha" \
    "HTTP $STATUS, token=$TOKEN_PRESENCA, tipo=$TIPO, tem_senha=$TEM_SENHA"
fi

LOGIN_ERRADO='{"email":"cli1@bantads.com.br","senha":"senha-errada"}'
STATUS=$(chamar POST /login "$LOGIN_ERRADO")
if [ "$STATUS" = "401" ]; then
  verificar_ok "r2-login" "senha errada -> 401"
else
  verificar_fail "r2-login" "POST /login com senha errada" "401" "HTTP $STATUS"
fi

STATUS=$(chamar GET /clientes)
if [ "$STATUS" = "401" ]; then
  verificar_ok "r2-login" "GET /clientes sem token -> 401"
else
  verificar_fail "r2-login" "GET /clientes sem token" "401" "HTTP $STATUS"
fi

if [ -n "$TOKEN" ]; then
  STATUS=$(chamar POST /logout "" "x-access-token: $TOKEN")
  if [ "$STATUS" = "204" ]; then
    verificar_ok "r2-login" "POST /logout com token válido -> 204"
  else
    verificar_fail "r2-login" "POST /logout" "204" "HTTP $STATUS"
  fi

  STATUS=$(chamar GET "/clientes/12912861012" "" "x-access-token: $TOKEN")
  if [ "$STATUS" = "401" ]; then
    verificar_ok "r2-login" "token revogado após logout -> 401"
  else
    verificar_fail "r2-login" "reuso do token após logout" "401" "HTTP $STATUS"
  fi
else
  verificar_fail "r2-login" "fluxo de logout" "token do login anterior" "sem token (login inicial falhou)"
fi

# ------------------------------------------------------------------ R3 ---
STATUS=$(chamar POST /login "$LOGIN_OK")
TOKEN_R3="$(jq_seguro "$(corpo_recebido)" -r '.token // empty')"

if [ -z "$TOKEN_R3" ]; then
  verificar_fail "r3-home-cliente" "novo login para testar R3" "token válido" "sem token (login falhou)"
else
  STATUS=$(chamar GET "/clientes/12912861012/conta" "" "x-access-token: $TOKEN_R3")
  BODY_CONTA="$(corpo_recebido)"
  SALDO="$(jq_seguro "$BODY_CONTA" -r '.saldo // empty')"
  TEM_LINKS="$(jq_seguro "$BODY_CONTA" -e '._links' >/dev/null 2>&1 && echo sim || echo nao)"

  if [ "$STATUS" = "200" ] && [ "$SALDO" = "800.00" ] && [ "$TEM_LINKS" = "sim" ]; then
    verificar_ok "r3-home-cliente" "GET /clientes/12912861012/conta -> 200, saldo 800.00, _links"
  else
    verificar_fail "r3-home-cliente" "GET /clientes/{cpf}/conta" \
      "200, saldo=\"800.00\", _links presente" \
      "HTTP $STATUS, saldo=$SALDO, _links=$TEM_LINKS"
  fi
fi

finalizar_modulo
