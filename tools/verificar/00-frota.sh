cat << 'EOF' > tools/verificar/00-frota.sh
#!/bin/bash
# ==============================================================================
# SCRIPT DE VERIFICAÇÃO DE SAÚDE DA FROTA DE MICROSSERVIÇOS (BANTADS - S4)
# ==============================================================================
# Este script realiza polling nos endpoints de healthcheck dos servicos ativos.
# Retorna status 200 OK para endpoints disponiveis ou codigo de falha HTTP.
# ==============================================================================

echo "=== 00. Checando Saúde da Frota ==="
echo "Iniciando bateria de testes nos microsservicos..."
echo "--------------------------------------------------"

# Lista de URLs de healthcheck registradas no ecossistema
SERVICES=(
  "http://localhost:8000/health"
  "http://localhost:8080/health"
  "http://localhost:8081/health"
  "http://localhost:8082/health"
  "http://localhost:8083/health"
)

# Loop principal de validacao dos endpoints
for URL in "${SERVICES[@]}"; do
  # Executa a requisicao curl com timeout limite para nao bloquear a execucao
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$URL" || echo "000")
  
  # Avalia a resposta recebida
  if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "[\e[32mOK\e[0m] $URL respondeu 200 OK"
  else
    echo -e "[\e[31mFAIL\e[0m] $URL retornou status $HTTP_STATUS"
  fi
done

# Finalizacao da checagem
echo "--------------------------------------------------"
echo "Checagem de saude da frota concluida com sucesso."
EOF
chmod +x tools/verificar/00-frota.sh
