#!/bin/bash
echo "======================================"
echo "    BATERIA DE VERIFICAÇÃO BANTADS    "
echo "======================================"

./tools/verificar/00-frota.sh
./tools/verificar/01-topologia.sh
./tools/verificar/02-seed.sh

echo "======================================"
echo "         VERIFICAÇÃO CONCLUÍDA        "
echo "======================================"
