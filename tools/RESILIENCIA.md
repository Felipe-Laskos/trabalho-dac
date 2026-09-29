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

**1 entrega + 3 retentativas = 4 execuções do handler, com 5 segundos de
intervalo fixo entre elas** (`multiplier=1.0`, sem backoff exponencial): ~15 s
até a DLQ, a janela de ∼15–20 s do enunciado. No Boot 4, `max-retries` conta
só as retentativas, sem a entrega inicial (`max-attempts` foi descontinuado
na 4.0). Na 4ª falha, `default-requeue-rejected=false` faz o listener
rejeitar a mensagem sem devolvê-la à fila original — e a fila,
declarada com `x-dead-letter-exchange`/`x-dead-letter-routing-key` (ver
[gateway/topologia.js](../gateway/topologia.js)), a roteia automaticamente
para a DLQ correspondente.

Configurado em:

| Serviço | Consumidor(es) | Status |
|---|---|---|
| `ms-orquestrador` | `OrquestradorSaga` (`saga.cmd`, `orquestrador.reply`, e as 4 DLQs de comando — ver nota abaixo) | configurado desde a S2, consumidores chegaram na S7 (SAGA #1) |
| `ms-conta` | `ProjecaoContaListener` (`ms.conta.events`) | configurado nesta tarefa (S5) |
| `ms-email` | `EmailListener` (`ms.email.cmd`) | configurado nesta tarefa (S5), mas inerte: o listener captura toda exceção e descarta (§5.9), então nenhuma falha chega a ser retentada |
| `ms-cliente`, `ms-gerente`, `ms-auth` | nenhum `@RabbitListener` ainda | não se aplica |

⚠️ **Nota (S7, SAGA #1):** `OrquestradorSaga.falhaTecnica` agora é `@RabbitListener` de
`ms.cliente.cmd.dlq`, `ms.gerente.cmd.dlq`, `ms.conta.cmd.dlq` e `ms.auth.cmd.dlq` (não de
`ms.conta.events.dlq`) — quando um comando de uma SAGA em curso cai numa dessas 4 DLQs, o
orquestrador consome a mensagem e marca o passo como falho, disparando a compensação. Isso
**não é reenfileiramento automático** (a regra abaixo continua valendo: nada volta pra fila
original sozinho) — é só o orquestrador reagindo à falha. Mas na prática, essas 4 DLQs podem
aparecer vazias em `tools/dlq.sh listar` quase imediatamente após a falha, mesmo sem
intervenção manual: o orquestrador já as drenou. `ms.conta.events.dlq` não tem esse consumidor
e continua se comportando exatamente como descrito no resto deste documento.

## Como a SAGA detecta e reage a falha técnica (S7+)

Além do retry de mensageria acima, a SAGA (`OrquestradorSaga`) tem sua própria
camada de detecção de falha, para os passos em que ela está esperando resposta
de outro serviço. O estado de cada SAGA em curso fica no Redis, chave
`saga:<sagaId>`, TTL de 1h (`EstadoSagaRepository`).

Duas fontes, independentes, alimentam o mesmo caminho de falha
(`sinalizarFalha` → `falhar` → `proximaCompensacao`):

1. **DLQ técnica** (`OrquestradorSaga.falhaTecnica`, ver nota acima): o
   comando enviado por essa SAGA esgotou as 3 retentativas no serviço de
   destino e caiu na DLQ. Detecção quase imediata (~15–20 s após a 1ª
   tentativa, ver seção de evidência).
2. **Timeout de 30 s** (`OrquestradorSaga.verificarTimeouts`,
   `@Scheduled(fixedDelay = 5000)`): a cada 5 s, varre as SAGAs em curso no
   Redis e verifica se alguma está esperando resposta (`aguardando != null`)
   há mais de 30 s (`timestampPasso`). Cobre os casos que a DLQ não cobre:
   serviço de destino simplesmente não respondeu (travou, caiu antes de
   consumir, resposta se perdeu) — sem retry esgotado, sem mensagem na DLQ,
   só silêncio.

Ambos chamam `sinalizarFalha`, que trata dois casos: se a SAGA já estava
`COMPENSANDO` (uma falha durante a própria compensação), só avança pra
próxima compensação pendente. Caso contrário, chama
`falhar(saga, estado, erro, passoIncerto=true)` — o `true` importa: como nem
a DLQ nem o timeout dizem se o passo atual chegou a ter efeito do outro lado
(diferente de uma resposta explícita de erro, que dá certeza), `falhar`
primeiro dispara, fire-and-forget, a compensação do **próprio passo
incerto** (`compensarSemEsperar`) — por segurança, caso ele tenha
parcialmente executado — e só depois monta `compensacoesPendentes` com os
passos anteriores já confirmados (ordem inversa, só os `compensavel()`),
marca o status como `COMPENSANDO` e começa a desfazer um por um
(`proximaCompensacao`).

### Walkthrough: comando cai na DLQ durante uma SAGA em curso

1. SAGA `sagaId=abc123` está no passo 2, `aguardando="ReservarSaldo"`,
   publicado em `ms.conta.cmd`.
2. `ms-conta` falha ao processar 4 vezes seguidas (1 entrega + 3
   retentativas, ~15 s) e a mensagem cai em `ms.conta.cmd.dlq`.
3. `OrquestradorSaga.falhaTecnica` (consumidor dessa DLQ) recebe a mensagem,
   lê o `sagaId` do comando, confere que bate com o `aguardando` atual da
   SAGA `abc123` — bate.
4. Chama `sinalizarFalha` → como a SAGA não estava `COMPENSANDO`, vira
   `falhar(..., "falha técnica: ReservarSaldo foi para a DLQ", true)`.
5. Por ser passo incerto, `falhar` primeiro publica a compensação do próprio
   passo 2 sem esperar resposta (`compensarSemEsperar`) — se `ReservarSaldo`
   não for compensável, isso é pulado sem erro.
6. Em seguida monta `compensacoesPendentes` com os passos 1..1 já
   confirmados, muda o status para `COMPENSANDO` e chama
   `proximaCompensacao`, que publica a compensação do passo mais recente e
   volta a esperar resposta.
7. Esse ciclo se repete a cada resposta de compensação (via
   `orquestrador.reply`) até `compensacoesPendentes` esvaziar —
   `encerrarComFalha` marca a SAGA como `COMPENSADA`, dispara e-mail de falha
   (se a SAGA tiver um) e conclui o job como falho.

Se em vez de cair na DLQ o `ms-conta` nunca respondesse (sem falha
explícita, sem retry, só silêncio — ex.: contêiner reiniciando), o mesmo
desfecho aconteceria pelo caminho do timeout: `verificarTimeouts` acharia
essa SAGA travada há mais de 30 s e chamaria o mesmo `sinalizarFalha`.

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
   o payload, o `payload_encoding` e as `properties` para recuperação
   manual, em vez de perdê-los em silêncio.

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
5. Espere ~5 s e rode `tools/dlq.sh listar` de novo — confirme que a contagem
   da DLQ caiu. A contagem vem das estatísticas da Management API, atualizadas
   a cada ~5 s: logo depois de reinjetar ela ainda mostra o número antigo, e
   reinjetar de novo por causa disso duplica a mensagem na fila original.

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

~15,7s entre a publicação e o esgotamento das tentativas: três esperas de
5s, ou seja, 1 entrega + 3 retentativas = 4 execuções do handler. A 1ª
execução é praticamente imediata (dezenas de milissegundos após a publicação).

Com `LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_CORE_RETRY=TRACE` no `ms-conta`, cada
execução aparece no log (reexecução do mesmo teste em 22/09/2026):

```
17:28:50.866  Execution of retryable operation ...   ← 1ª
17:28:55.876  Retry attempt for operation ...        ← 2ª
17:29:00.883  Retry attempt for operation ...        ← 3ª
17:29:05.890  Retry attempt for operation ...        ← 4ª
17:29:05.901  WARN RejectAndDontRequeueRecoverer : Retries exhausted
```

Confirmação via API depois do teste:

```
GET /api/queues/%2f/ms.conta.events.dlq → messages: 1
```

A mensagem só apareceu na DLQ **depois** da 4ª execução, nunca antes — o
comportamento esperado.
