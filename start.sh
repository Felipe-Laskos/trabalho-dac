#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")"

SERVICOS=(postgres mongo redis rabbitmq ms-conta)
TENTATIVAS=60          # até 2 min esperando healthcheck

echo "-> Script de inicialização da Infra"

if [ ! -f .env ]; then
  echo
  echo "ERRO: arquivo .env não encontrado."
  echo
  exit 1
fi

echo "-> Derrubando containers antigos ..."
docker compose down --remove-orphans

echo "-> Subindo a infra ..."
docker compose up -d --build

echo "-> Aguardando healthchecks ..."
for _ in $(seq 1 "$TENTATIVAS"); do
  pendentes=0
  for s in "${SERVICOS[@]}"; do
    cid="$(docker compose ps -q "$s" 2>/dev/null || true)"
    if [ -z "$cid" ]; then
      pendentes=$((pendentes + 1))
      continue
    fi
    estado="$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo starting)"
    [ "$estado" = "healthy" ] || pendentes=$((pendentes + 1))
  done
  [ "$pendentes" -eq 0 ] && break
  sleep 2
done

echo
docker compose ps
echo
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}'

# Logs de falha
if [ "$pendentes" -ne 0 ]; then
  echo
  echo "ERRO: $pendentes falharam e não ficaram healthy"
  exit 1
fi

echo
echo "-> Inicialização da Infra concluída!"
echo "    RabbitMQ: http://localhost:15672"
echo "    PostgreSQL, MongoDB e Redis: sem porta no host, só na rede 'bantads'."
