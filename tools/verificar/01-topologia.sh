#!/bin/bash
echo "=== 01. Validando Topologia de Filas e DLQs no RabbitMQ ==="

# Consulta API do RabbitMQ na porta 15672
QUEUES_API=$(curl -s -u guest:guest http://localhost:15672/api/queues || echo "[]")

if echo "$QUEUES_API" | grep -q "name"; then
  echo -e "[\e[32mOK\e[0m] Conexão com API do RabbitMQ estabelecida"
else
  echo -e "[\e[31mFAIL\e[0m] Não foi possível consultar a API do RabbitMQ"
fi
