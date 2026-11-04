#!/bin/bash
# ==============================================================================
# gerar-entrega.sh — monta o ZIP de entrega do BANTADS a partir da main (S12).
#
# Usa `git archive`: só entra o que está versionado, então node_modules/,
# target/, dist/, *.jar, *.class, .git/, *.log e o .env ficam de fora sem lista
# de exclusão. Se um PDF for corrigido depois, gerar de novo é rodar isto de novo.
#
# Uso:
#   tools/gerar-entrega.sh                  gera entrega.zip a partir da origin/main
#   tools/gerar-entrega.sh --testar         gera e testa do zero em /tmp/teste-entrega
#   tools/gerar-entrega.sh --sem-docs       aceita gerar sem docs/entrega/ (só prévia)
#   tools/gerar-entrega.sh --ref main --saida /caminho/entrega.zip
# ==============================================================================
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="origin/main"
SAIDA="$RAIZ/entrega.zip"
DIR_TESTE="/tmp/teste-entrega"
TESTAR=0
SEM_DOCS=0
LIMITE_MB=50

ok()    { echo -e "[\e[32mOK\e[0m] $1"; }
aviso() { echo -e "[\e[33mAVISO\e[0m] $1"; }
falha() { echo -e "[\e[31mFALHA\e[0m] $1" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --ref)       REF="$2"; shift 2 ;;
    --saida)     SAIDA="$(realpath -m "$2")"; shift 2 ;;
    --dir-teste) DIR_TESTE="$(realpath -m "$2")"; shift 2 ;;
    --testar)    TESTAR=1; shift ;;
    --sem-docs)  SEM_DOCS=1; shift ;;
    -h|--help)   sed -n '2,14p' "$0"; exit 0 ;;
    *)           falha "opção desconhecida: $1 (veja --help)" ;;
  esac
done

for comando in git zip unzip; do
  command -v "$comando" >/dev/null || falha "comando obrigatório não encontrado: $comando"
done

cd "$RAIZ"

# --------------------------------------------------------------------- gerar --
if [[ "$REF" == origin/* ]]; then
  git fetch -q origin "${REF#origin/}" 2>/dev/null \
    || aviso "não consegui atualizar $REF do GitHub; usando a cópia local"
fi

COMMIT="$(git rev-parse --short "$REF^{commit}" 2>/dev/null)" || falha "ref inexistente: $REF"
echo "-> gerando $SAIDA a partir de $REF ($COMMIT)"

PDFS="$(git ls-tree -r --name-only "$REF" -- docs/entrega/ | grep -ciE '\.pdf$' || true)"
if [ "$PDFS" -gt 0 ]; then
  ok "docs/entrega/ tem $PDFS PDF(s)"
elif [ "$SEM_DOCS" = 1 ]; then
  aviso "docs/entrega/ não tem PDF em $REF — este ZIP é só PRÉVIA, não entregar assim"
else
  falha "docs/entrega/ não tem nenhum PDF em $REF (PDF de suposições e Relatório de Atividades). Use --sem-docs só para gerar uma prévia."
fi

rm -f "$SAIDA"
git archive --format=zip --prefix=bantads/ -o "$SAIDA" "$REF"

# a listagem fica numa variável: `unzip | grep -q` com pipefail dá falso OK
# (o grep sai no primeiro acerto, o unzip morre de SIGPIPE e o pipeline "falha")
LISTA="$(unzip -Z1 "$SAIDA")"

# --------------------------------------------------------------- conferências --
BYTES="$(stat -c %s "$SAIDA")"
if [ "$BYTES" -lt $((LIMITE_MB * 1024 * 1024)) ]; then
  ok "tamanho: $(du -h "$SAIDA" | cut -f1) (limite ${LIMITE_MB} MB)"
else
  falha "o ZIP tem $(du -h "$SAIDA" | cut -f1), acima de ${LIMITE_MB} MB — divida em partes"
fi

PROIBIDOS="$(grep -E 'node_modules|\.jar$|\.class$|/target/|/dist/|\.log$' <<< "$LISTA" || true)"
[ -z "$PROIBIDOS" ] \
  && ok "nenhum node_modules, .jar, .class, target/, dist/ ou .log" \
  || falha "arquivos que o professor desconta, dentro do ZIP:\n$PROIBIDOS"

if grep -qE '(^|/)\.env$' <<< "$LISTA"; then falha ".env dentro do ZIP"; fi
ok "sem .env — só o .env.example"

VALORES="$(unzip -p "$SAIDA" bantads/.env.example | grep -E '^[A-Z_]+=.+' || true)"
[ -z "$VALORES" ] && ok ".env.example sem nenhum valor" || falha ".env.example com valor preenchido:\n$VALORES"

DESCOMPACTADO="$(mktemp -d)"
trap 'rm -rf "$DESCOMPACTADO"' EXIT
unzip -q "$SAIDA" -d "$DESCOMPACTADO"

# Procura valor de segredo, não o nome da chave: "SECRET=" sozinho aparece de
# propósito no CI ($(openssl ...)) e na documentação, e não é vazamento. As
# pastas test/ ficam de fora: lá há valores fixos de bancada, não credenciais.
LITERAIS="$(grep -rnIE --exclude-dir=test \
  "(GMAIL_APP_PASSWORD|spring\.mail\.password) *[=:][ \"']*[a-z]{4} ?[a-z]{4} ?[a-z]{4} ?[a-z]{4}|(^|[^A-Z_])SECRET *[=:][ \"']*[A-Za-z0-9+/_-]{16,}" \
  "$DESCOMPACTADO" || true)"
[ -z "$LITERAIS" ] && ok "nenhuma senha de app do Gmail nem SECRET escrita no código" \
  || falha "possível segredo dentro do ZIP:\n${LITERAIS//$DESCOMPACTADO\//}"

if [ -f .env ]; then
  while IFS='=' read -r chave valor; do
    case "$chave" in SECRET|GMAIL_APP_PASSWORD) ;; *) continue ;; esac
    [ -n "$valor" ] || continue
    grep -rqIF -- "$valor" "$DESCOMPACTADO" && falha "o valor de $chave do seu .env aparece dentro do ZIP"
  done < .env
  ok "os valores de SECRET e GMAIL_APP_PASSWORD do seu .env não aparecem no ZIP"
fi

[ -x "$DESCOMPACTADO/bantads/start.sh" ] && ok "start.sh executável no ZIP" \
  || falha "start.sh perdeu a permissão de execução no ZIP"

echo
echo "-> $SAIDA pronto ($COMMIT, $(grep -vc '/$' <<< "$LISTA") arquivos)"

[ "$TESTAR" = 1 ] || exit 0

# ---------------------------------------------------------- teste do zero --
echo
echo "-> testando do zero em $DIR_TESTE"

case "$DIR_TESTE" in
  /tmp/?*) ;;
  *) falha "por segurança, --dir-teste precisa ficar dentro de /tmp (recebido: $DIR_TESTE)" ;;
esac

for porta in 8000 4200 15672; do
  if (exec 3<>"/dev/tcp/127.0.0.1/$porta") 2>/dev/null; then
    falha "porta $porta ocupada — derrube a frota de desenvolvimento (docker compose down) antes de testar o ZIP"
  fi
done

rm -rf "$DIR_TESTE"
mkdir -p "$DIR_TESTE"
unzip -q "$SAIDA" -d "$DIR_TESTE"
cd "$DIR_TESTE/bantads"

# valores descartáveis, gerados agora — nunca os do .env da sua máquina
sed -e "s/^DB_PASS=.*/DB_PASS=teste$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')/" \
    -e "s/^SECRET=.*/SECRET=$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')/" \
    .env.example > .env
ok ".env de teste criado a partir do .env.example"

RESULTADO=0
./start.sh || RESULTADO=$?

if [ "$RESULTADO" = 0 ]; then
  ok "start.sh subiu a frota a partir do ZIP"
  ./tools/verificar/verificar.sh || RESULTADO=$?
fi

echo
echo "-> derrubando a frota de teste (projeto 'bantads', volumes inclusive)"
docker compose down -v --remove-orphans >/dev/null 2>&1 || true

[ "$RESULTADO" = 0 ] && ok "o ZIP sobe do zero e passa na bateria de verificação" \
  || falha "o teste do ZIP falhou (código $RESULTADO) — veja a saída acima"
