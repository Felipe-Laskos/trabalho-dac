#!/bin/bash
echo "=== 00. Checando Saúde da Frota ==="

SERVICES=("http://localhost:8080/health" "http://localhost:8081/health" "http://localhost:8082/health")

for URL in "${SERVICES[@]}"; do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || echo "000")
  if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "[\e[32mOK\e[0m] $URL respondeu 200 OK"
  else
    echo -e "[\e[31mFAIL\e[0m] $URL retornou status $HTTP_STATUS"
  fi
done
