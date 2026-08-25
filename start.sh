#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")"

TENTATIVAS=60          # ate ~3 min
INTERVALO=3

echo "-> BANTADS: build e subida da frota"

if [ ! -f .env ]; then
  echo
  echo "ERRO: arquivo .env nao encontrado."
  echo "      Copie .env.example para .env e preencha os segredos."
  echo
  exit 1
fi

TOTAL="$(docker compose config --services | wc -l)"
echo "-> $TOTAL servicos declarados no compose"

echo "-> Derrubando containers antigos ..."
docker compose down --remove-orphans

echo "-> Build das imagens ..."
docker compose build

echo "-> Subindo a frota ..."
docker compose up -d

echo "-> Aguardando healthchecks ..."
for _ in $(seq 1 "$TENTATIVAS"); do
  saudaveis="$(docker compose ps --format '{{.Health}}' 2>/dev/null | grep -c '^healthy$' || true)"
  [ "$saudaveis" -eq "$TOTAL" ] && break
  sleep "$INTERVALO"
done

echo
docker compose ps
echo
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}'

if [ "$saudaveis" -ne "$TOTAL" ]; then
  echo
  echo "ERRO: $saudaveis de $TOTAL healthy. Quem ficou de fora:"
  docker compose ps --format 'table {{.Service}}\t{{.Status}}' | grep -v '(healthy)'
  exit 1
fi

echo
echo "-> Frota no ar: $TOTAL conteineres healthy."
echo "    Front:            http://localhost:4200"
echo "    API Gateway:      http://localhost:8000/health"
echo "    RabbitMQ console: http://localhost:15672  (guest/guest)"
echo "    PostgreSQL, MongoDB e Redis: sem porta no host, so na rede 'bantads'."
