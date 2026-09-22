# Resiliência de mensageria — retry e DLQ

Como a frota lida com falha ao processar uma mensagem do RabbitMQ: quantas
vezes tenta de novo, para onde a mensagem vai quando desiste, e como um
humano reprocessa isso depois.

## Política de retry

Todo `@RabbitListener` da frota roda com a mesma política, configurada em
`application.properties` de cada serviço:

```properties
spring.rabbitmq.listener.simple.retry.enabled=true
spring.rabbitmq.listener.simple.retry.max-retries=3
spring.rabbitmq.listener.simple.retry.initial-interval=5000
spring.rabbitmq.listener.simple.retry.multiplier=1.0
spring.rabbitmq.listener.simple.default-requeue-rejected=false
```

**3 tentativas, 5 segundos de intervalo fixo entre elas** (`multiplier=1.0`,
sem backoff exponencial). Na 3ª falha, `default-requeue-rejected=false` faz
o listener rejeitar a mensagem sem devolvê-la à fila original — e a fila,
declarada com `x-dead-letter-exchange`/`x-dead-letter-routing-key` (ver
[gateway/topologia.js](../gateway/topologia.js)), a roteia automaticamente
para a DLQ correspondente.

Configurado em:

| Serviço | Consumidor(es) | Status |
|---|---|---|
| `ms-orquestrador` | (ainda sem `@RabbitListener` — entram na S7) | configurado desde a S2 |
| `ms-conta` | `ProjecaoContaListener` (`ms.conta.events`) | configurado nesta tarefa (S5) |
| `ms-email` | `EmailListener` (`ms.email.cmd`) | configurado nesta tarefa (S5) |
| `ms-cliente`, `ms-gerente`, `ms-auth` | nenhum `@RabbitListener` ainda | não se aplica |

## Filas de comando e suas DLQs

Das 8 filas declaradas, 5 têm dead-letter configurado. `saga.cmd`,
`orquestrador.reply` e `ms.email.cmd` **não têm DLQ** — a de `ms.email.cmd`
é proposital: e-mail é fire-and-forget (§5.9 do enunciado), uma falha de
envio se registra e se descarta, nunca deve voltar para a fila nem abortar
uma SAGA.

| Fila | DLQ |
|---|---|
| `ms.cliente.cmd` | `ms.cliente.cmd.dlq` |
| `ms.conta.cmd` | `ms.conta.cmd.dlq` |
| `ms.gerente.cmd` | `ms.gerente.cmd.dlq` |
| `ms.auth.cmd` | `ms.auth.cmd.dlq` |
| `ms.conta.events` | `ms.conta.events.dlq` |

## Por que a reinjeção é manual

Reenfileirar automaticamente uma mensagem que já falhou 3 vezes arrisca
**loop infinito**: se a causa da falha for persistente (payload inválido,
serviço dependente fora do ar), a mensagem voltaria a falhar, cairia na DLQ
de novo, seria reenfileirada de novo — consumindo CPU e enchendo os logs sem
nunca resolver nada. Por isso o reprocessamento é sempre um ato deliberado
de alguém: pelo console do RabbitMQ ou por `tools/dlq.sh reinjetar`, depois
de entender e corrigir a causa raiz.

## `tools/dlq.sh` — operação das DLQs

CLI sobre a Management API do RabbitMQ (`localhost:15672/api`). Requer
`curl` e `jq`.

```bash
tools/dlq.sh listar                      # as 5 DLQs e quantas mensagens cada uma tem
tools/dlq.sh ver <fila.dlq>              # espia a próxima mensagem sem consumi-la
tools/dlq.sh reinjetar <fila.dlq> [n]    # devolve as n mais antigas à fila original (padrão: 1)
tools/dlq.sh purgar <fila.dlq>           # apaga todas as mensagens da DLQ
```

`reinjetar` e `purgar` pedem confirmação explícita (digitar `sim`) antes de
agir — nunca rodam sozinhos.

### Como a reinjeção funciona por dentro

1. Consome a mensagem mais antiga da DLQ (`ack_requeue_false` — ela sai da
   fila nesse instante).
2. Publica o mesmo payload na fila original (`amq.default`, routing key =
   nome da fila original).
3. Se a publicação falhar, a mensagem **já saiu da DLQ** — o script imprime
   o payload inteiro para recuperação manual, em vez de perdê-lo em
   silêncio.

Isso é deliberado: espiar a mensagem numa chamada e só remover numa segunda
chamada separada não garante pegar a mesma mensagem (o RabbitMQ pode
reordenar a fila ao dar requeue) — em teste isso já causou duplicação de uma
mensagem e perda de outra. Consumir tudo numa única chamada atômica evita
os dois problemas, ao custo de exigir tratamento explícito se a publicação
seguinte falhar.

## Procedimento de reinjeção (passo a passo)

1. `tools/dlq.sh listar` — identifique qual DLQ tem mensagens.
2. `tools/dlq.sh ver <fila.dlq>` — leia o payload, entenda por que falhou.
3. Corrija a causa raiz (bug no consumidor, dado inconsistente, serviço
   dependente fora do ar) **antes** de reinjetar — senão a mensagem só vai
   falhar de novo e voltar para a mesma DLQ.
4. `tools/dlq.sh reinjetar <fila.dlq> [n]` — confirme com `sim`.
5. `tools/dlq.sh listar` de novo — confirme que a contagem da DLQ caiu.

Se a causa não for corrigível (payload realmente inválido, por exemplo),
use `tools/dlq.sh purgar <fila.dlq>` em vez de reinjetar.

## Evidência: teste de mesa (3 falhas → DLQ)

Teste executado em 22/09/2026 contra `ms-conta` (consumidor
`ProjecaoContaListener`, fila `ms.conta.events`), publicando um evento
propositalmente inconsistente (conta inexistente `9999`, tipo `Depósito`,
versão `5`) direto na fila via Management API — dispara
`EventoForaDeOrdemException` de forma determinística em toda tentativa:

```
Publicado em ms.conta.events às 2026-09-22T20:14:34Z (17:14:34 -03:00)

Log do ms-conta:
17:14:49.969 WARN o.s.a.r.r.RejectAndDontRequeueRecoverer :
  Retries exhausted for message [... receivedRoutingKey=ms.conta.events ...]
17:14:49.973 WARN o.s.a.l.ConditionalRejectingErrorHandler :
  Execution of Rabbit message listener failed.
Caused by: EventoForaDeOrdemException: Evento fora de ordem para a conta
  9999: esperada versão 1, recebida 5
```

~15,7s entre a publicação e o esgotamento das tentativas — consistente com
3 tentativas e 5s de intervalo fixo entre elas (a 1ª tentativa não é
instantânea: leva o tempo de entrega da mensagem pelo broker).

Confirmação via API depois do teste:

```
GET /api/queues/%2f/ms.conta.events.dlq → messages: 1
```

A mensagem só apareceu na DLQ **depois** da 3ª falha, nunca antes — o
comportamento esperado.
