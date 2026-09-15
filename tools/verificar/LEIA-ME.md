# Bateria de verificação — `tools/verificar/`

Bateria própria da equipe (PL-B / Nathaly), **separada da suíte oficial** do
professor (`test_bantads`). Nada aqui deve ser confundido com ela nem a
substitui — é só o nosso "está pronto?" automatizado, que cresce a cada
requisito entregue.

## Como rodar

Com a frota no ar (`./start.sh` ou `docker compose up -d`):

```bash
./tools/verificar/verificar.sh
```

Isso vai:

1. Chamar `POST /reboot` no Gateway — **toda verificação parte daí**, nada
   depende de estado deixado por uma execução anterior.
2. Rodar, em ordem, `00-frota.sh`, `01-topologia.sh`, `02-seed.sh`,
   `03-saldos.sh` e `04-requisitos.sh`.
3. Imprimir um **placar por área**: quantos critérios passaram/falharam em
   cada módulo, e quem é o dono de cada falha.

Cada módulo também pode ser executado sozinho (ex.: `./tools/verificar/02-seed.sh`),
mas nesse caso ele assume que a frota já foi reiniciada por você — os módulos
não chamam `/reboot` por conta própria.

## Como ler o placar

Cada critério aparece como:

```
[OK] [área] descrição do critério
```

ou, em caso de falha:

```
[FAIL] [área] descrição do critério
         esperado: <valor esperado>
         obtido: <valor obtido>
         aviso ao dono: <quem é responsável pela área>
```

No final, a tabela **PLACAR POR ÁREA** resume OK/FAIL por área e nomeia o
dono só das áreas com falha.

**Regra de ouro:** um defeito num módulo alheio vira aviso ao dono — quem
roda a bateria não corrige o código de outra área. Na defesa, quem explica a
falha é o dono do módulo.

## O que cada script verifica

| Script | O que confere |
|---|---|
| `00-frota.sh` | Os 12 contêineres do `docker-compose.yml` estão `running`/`healthy` (via `docker compose ps`) e `GET /health` do Gateway responde `200 {"status":"UP"}`. |
| `01-topologia.sh` | As 8 filas + 5 DLQs declaradas em `gateway/topologia.js` existem no RabbitMQ (API `:15672/api/queues`), e as filas com DLQ têm `x-dead-letter-exchange`/`x-dead-letter-routing-key` corretos. |
| `02-seed.sh` | As 6 contagens do seed: `cliente.clientes`=5, `gerente.gerentes`=4, `conta_command.eventos`=22, `conta_query.contas`=5, `conta_query.movimentacoes`=17, `usuarios` (Mongo, `bantads_auth`)=9. |
| `03-saldos.sh` | Os 5 saldos do seed conferem em três frentes: valor esperado, replay do event store (`conta_command.eventos`) e read model (`conta_query.contas`). |
| `04-requisitos.sh` | R1 (autocadastro: 201/409/400), R2 (login/logout: token, 401 sem token, 401 após logout) e R3 (home do cliente: saldo e `_links`), batendo na porta pública do Gateway (8000). |

## Pré-requisitos

`bash`, `curl`, `jq` e `docker compose` (para `00`, `02` e `03`, que também
precisam do compose rodando a partir da raiz do repositório).

## Dados de referência (seed)

Ver `scripts/sql/07-seed-conta.sql` (tabela de conferência no topo do
arquivo) e `scripts/sql/05-seed-cliente.sql` / `06-seed-gerente.sql` para os
valores exatos que esta bateria espera.
