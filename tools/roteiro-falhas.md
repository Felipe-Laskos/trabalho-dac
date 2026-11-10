# Roteiro de falhas

Evidência gravada de que as SAGAs compensam de verdade quando algo falha no
meio, e de que uma falha de e-mail nunca trava nem aborta uma SAGA —
material direto da defesa. Cada cenário traz o estado dos bancos **antes**,
**no meio** e **depois**, mais o log do Orquestrador com timestamps.

| Cenário | SAGA | O que prova | Quem / quando |
|---|---|---|---|
| R9-A | Aprovar cliente | Gmail fora do ar (credencial recusada e rede fora): a SAGA conclui, o e-mail só não sai, e a senha não vaza no log | Nathaly, 27/10 |
| R9-B | Aprovar cliente | MS Conta fora antes do passo 6: compensação em ordem inversa `[5, 4, 1]`, e-mail de "não efetuada", e o passo incerto desfeito sem deixar conta órfã | Nathaly, 27/10 |
| R9-C | Aprovar cliente | Gmail de verdade: os e-mails da senha e de "não efetuada" saem, e a senha loga sem aparecer em log | Felipe, 27/10 |
| R13-1 | Inserir gerente | MS Conta fora no passo 3: compensação `[2, 1]` | Nathaly, 20/10 |
| R13-2 | Inserir gerente | Timeout de passo com três compensações `[4, 2, 1]`, devolvendo a conta reatribuída | Nathaly, 20/10 |
| R15 | Remover gerente | Logout forçado com duas sessões e recusa do último gerente ativo | Felipe, 20/10 |
| 3 | Inserir gerente | DLQ de comando: o handler falha 4 vezes, a mensagem cai na `ms.auth.cmd.dlq` e o Orquestrador compensa a partir dela | Nathaly, 10/11 |
| 4 | Inserir gerente | Dupla notificação: timeout **e** DLQ no mesmo passo, e a compensação roda uma vez só | Nathaly, 10/11 |
| 5 | — (evento) | DLQ de eventos: evento malformado fica parado na `ms.conta.events.dlq`, não gera compensação, e o reprocessamento pelo `dlq.sh` não duplica movimentação | Nathaly, 10/11 |

Os cenários 3 e 4 foram rodados duas vezes, com resultados idênticos, e o 5
uma vez; a duração de cada um está medida em "Reprodutibilidade e tempo" — na
defesa isso conta contra os 20 minutos da equipe.

Ainda falta um item: **o print da caixa de entrada** com os e-mails do
cenário C (ver "Ainda pendente", no fim).

## R9 — Cenário A: Gmail fora do ar não trava a SAGA (27/10)

O passo 7 do R9 (`email.senha-nova`) é fire-and-forget: o Orquestrador
publica em `ms.email.cmd` e conclui sem esperar resposta (§5.9). Para
provar que uma falha do Gmail não aborta a SAGA, basta aprovar um cliente
sem credencial no `.env`: o `ms-email` tenta o SMTP, a autenticação falha,
e a SAGA já terminou antes disso.

Executado em 27/10/2026 contra a frota completa (12 contêineres, `/reboot`
antes). Saída integral:

```
{"status":"ok","clientes":5,"gerentes":4,"contas":5}
### GMAIL_USER / GMAIL_APP_PASSWORD no .env: 2 de 2 vazios — o envio SMTP vai falhar (Gmail "fora do ar")

### POST /solicitacoes (21:20:02)
{"cpf":"77700011122","status":"PENDENTE"}

### ANTES da aprovação
solicitacao (cpf | status | motivo):
77700011122 | PENDENTE | -
cliente.clientes com esse cpf: 0
conta_query.contas desse cliente: nenhuma
usuario no MS Auth (Mongo): 0

### POST /solicitacoes/77700011122/aprovacao (21:20:03)
{"jobId":"11c4d769-c127-49b7-b01f-a5ca20eb130d","status":"PENDENTE"}
### job final (21:20:17): {"status":"CONCLUIDO","resultType":"resource","dominio":"clientes","resourceId":"77700011122","erro":null}

### log do ms-orquestrador
2026-10-27T21:20:03.887-03:00 INFO sagaId=11c4d769-c127-49b7-b01f-a5ca20eb130d tipo=aprovar-cliente iniciada
2026-10-27T21:20:03.891-03:00 INFO sagaId=11c4d769-c127-49b7-b01f-a5ca20eb130d passo=1 aprovar-solicitacao -> ms.cliente.cmd
2026-10-27T21:20:03.908-03:00 INFO sagaId=11c4d769-c127-49b7-b01f-a5ca20eb130d passo=1 aprovar-solicitacao SUCESSO
2026-10-27T21:20:03.912-03:00 INFO sagaId=11c4d769-c127-49b7-b01f-a5ca20eb130d passo=2 listar-ativos -> ms.gerente.cmd
2026-10-27T21:20:04.068-03:00 INFO sagaId=11c4d769-c127-49b7-b01f-a5ca20eb130d passo=2 listar-ativos SUCESSO
2026-10-27T21:20:04.071-03:00 INFO sagaId=11c4d769-c127-49b7-b01f-a5ca20eb130d passo=3 gerente-com-menos-clientes -> ms.conta.cmd
2026-10-27T21:20:04.119-03:00 INFO sagaId=11c4d769-c127-49b7-b01f-a5ca20eb130d passo=3 gerente-com-menos-clientes SUCESSO
2026-10-27T21:20:04.122-03:00 INFO sagaId=11c4d769-c127-49b7-b01f-a5ca20eb130d passo=4 criar-cliente -> ms.cliente.cmd
2026-10-27T21:20:04.147-03:00 INFO sagaId=11c4d769-c127-49b7-b01f-a5ca20eb130d passo=4 criar-cliente SUCESSO
2026-10-27T21:20:04.149-03:00 INFO sagaId=11c4d769-c127-49b7-b01f-a5ca20eb130d passo=5 criar-usuario -> ms.auth.cmd
2026-10-27T21:20:04.267-03:00 INFO sagaId=11c4d769-c127-49b7-b01f-a5ca20eb130d passo=5 criar-usuario SUCESSO
2026-10-27T21:20:04.269-03:00 INFO sagaId=11c4d769-c127-49b7-b01f-a5ca20eb130d passo=6 criar-conta -> ms.conta.cmd
2026-10-27T21:20:04.329-03:00 INFO sagaId=11c4d769-c127-49b7-b01f-a5ca20eb130d passo=6 criar-conta SUCESSO
2026-10-27T21:20:04.330-03:00 INFO sagaId=11c4d769-c127-49b7-b01f-a5ca20eb130d passo=7 email.senha-nova -> ms.email.cmd x1 (fire-and-forget)
2026-10-27T21:20:04.338-03:00 INFO sagaId=11c4d769-c127-49b7-b01f-a5ca20eb130d tipo=aprovar-cliente CONCLUIDA

### log do ms-email
2026-10-27T21:20:04.491-03:00 ERROR sagaId=11c4d769-c127-49b7-b01f-a5ca20eb130d tipo=email.senha-nova resultado=FALHA causa=Authentication failed

### DEPOIS
solicitacao (cpf | status | motivo):
77700011122 | APROVADA | -
cliente.clientes com esse cpf: 1
conta_query.contas desse cliente: 5221 gerente=40501740066 saldo=0.0000
usuario no MS Auth (Mongo): 1

### a senha aparece no log do ms-email?
linhas com 'senha' seguida de valor no log do ms-email: 0
```

**Como ler:** a SAGA fecha `CONCLUIDA` às `21:20:04.338`; o `ms-email` só
tenta o envio às `21:20:04.491` — depois de a SAGA ter terminado, que é o
que fire-and-forget quer dizer. O envio falha (`Authentication failed`), o
job fica `CONCLUIDO` mesmo assim, e o cliente, o usuário e a conta existem
no "DEPOIS". A conta foi para `40501740066` (Gadamântio), o gerente com 0
clientes no seed — a regra do passo 3. E a senha gerada no passo 5 não
aparece em nenhuma linha do log do `ms-email`.

### Com a rede fora (27/10)

Credencial vazia faz o Gmail responder e recusar na hora. Com a rede fora o
SMTP não responde, e quem segura o `ms-email` é o `connectiontimeout` de 5 s
do `application.properties`. Para simular, um `ms-email` avulso na rede da
frota, com o SMTP apontando para um endereço que não responde:

```bash
docker compose stop ms-email
docker run -d --name ms-email-sem-rede --network trabalho-dac_bantads \
  -e TZ=America/Sao_Paulo -e SPRING_RABBITMQ_HOST=rabbitmq -e SPRING_MAIL_HOST=10.255.255.1 \
  -e GMAIL_USER=teste@gmail.com -e GMAIL_APP_PASSWORD=x bantads/ms-email
# aprovar um cliente; depois:
docker rm -f ms-email-sem-rede && docker compose start ms-email
```

Saída:

```
{"status":"ok","clientes":5,"gerentes":4,"contas":5}
### POST /solicitacoes (23:11:24)
{"cpf":"77700077788","status":"PENDENTE"}
### docker compose stop ms-email (23:11:26)
### ms-email-sem-rede no ar, com o SMTP em 10.255.255.1, que não responde (23:11:32)
### POST /solicitacoes/77700077788/aprovacao (23:11:32)
{"jobId":"7c2d738b-1478-40ae-991c-79be9f3abf20","status":"PENDENTE"}
### job (23:11:32): {"status":"CONCLUIDO","resultType":"resource","dominio":"clientes","resourceId":"77700077788","erro":null}

### log do ms-orquestrador
2026-10-27T23:11:32.436-03:00 INFO sagaId=7c2d738b-1478-40ae-991c-79be9f3abf20 passo=7 email.senha-nova -> ms.email.cmd x1 (fire-and-forget)
2026-10-27T23:11:32.441-03:00 INFO sagaId=7c2d738b-1478-40ae-991c-79be9f3abf20 tipo=aprovar-cliente CONCLUIDA

### log do ms-email-sem-rede
2026-10-27T23:11:37.543-03:00 ERROR sagaId=7c2d738b-1478-40ae-991c-79be9f3abf20 tipo=email.senha-nova resultado=FALHA causa=Mail server connection failed. Failed messages: org.eclipse.angus.mail.util.MailConnectException: Couldn't connect to host, port: 10.255.255.1, 587

### DEPOIS
solicitacao: APROVADA
cliente.clientes com esse cpf: 1
conta_query.contas desse cliente: 0160 gerente=40501740066
```

**Como ler:** a SAGA fecha `CONCLUIDA` às `23:11:32.441`, meio segundo depois
da aprovação. O `ms-email` tenta o SMTP, espera os 5 s e desiste às
`23:11:37.543` (`Couldn't connect to host`). Cliente e conta existem no
"DEPOIS", e o e-mail apenas não sai.

## R9 — Cenário B: MS Conta fora antes do passo 6, compensação em ordem inversa (27/10)

O roteiro pede derrubar o MS Conta **antes do passo 6** — mas o MS Conta
também responde o passo 3, então derrubá-lo antes de aprovar faria a SAGA
falhar no 3, sem nada para compensar. Para cair exatamente no 6, sem
depender de corrida de milissegundos:

1. `docker pause ms-auth` (depois do login do gerente, que passa pelo MS
   Auth) — a SAGA para no passo 5, esperando o MS Auth;
2. quando o log mostra `passo=4 criar-cliente SUCESSO` (o MS Conta já
   respondeu o passo 3), `docker pause ms-conta`;
3. `docker unpause ms-auth` — o passo 5 conclui e o passo 6 (`criar-conta`)
   cai num MS Conta congelado: sem resposta, estoura os 30 s.

`docker pause` congela o contêiner sem matá-lo — do ponto de vista do
Orquestrador, é igual a um serviço fora do ar. Saída integral:

```
{"status":"ok","clientes":5,"gerentes":4,"contas":5}

### POST /solicitacoes (21:21:34)
{"cpf":"77700033344","status":"PENDENTE"}

### ANTES da aprovação
solicitacao (cpf | status | motivo):
77700033344 | PENDENTE | -
cliente.clientes com esse cpf: 0
conta_query.contas desse cliente: nenhuma
usuario no MS Auth (Mongo): 0

### login do gerente feito; docker pause ms-auth (21:21:35.419) — segura a SAGA no passo 5
trabalho-dac-ms-auth-1

### POST /solicitacoes/77700033344/aprovacao (21:21:35.479)
{"jobId":"f76a7393-defe-42f8-8bc3-9df30328010d","status":"PENDENTE"}

### passo 4 confirmado; docker pause ms-conta (21:21:35.596) — o MS Conta já respondeu o passo 3
trabalho-dac-ms-conta-1
### docker unpause ms-auth (21:21:35.624) — passo 5 segue; o passo 6 vai cair num MS Conta congelado
trabalho-dac-ms-auth-1

### MEIO da SAGA (21:21:38) — passos 1, 4 e 5 executados; passo 6 sem resposta
job: {"status":"PENDENTE","resultType":null,"dominio":"clientes","resourceId":null,"erro":null}
solicitacao (cpf | status | motivo):
77700033344 | APROVADA | -
cliente.clientes com esse cpf: 1
conta_query.contas desse cliente: nenhuma
usuario no MS Auth (Mongo): 1

### job (21:22:22): {"status":"FALHA","resultType":null,"dominio":"clientes","resourceId":null,"erro":"Não foi possível concluir a operação agora. Tente novamente em alguns instantes."}

### log do ms-orquestrador
2026-10-27T21:21:35.456-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d tipo=aprovar-cliente iniciada
2026-10-27T21:21:35.458-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=1 aprovar-solicitacao -> ms.cliente.cmd
2026-10-27T21:21:35.472-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=1 aprovar-solicitacao SUCESSO
2026-10-27T21:21:35.474-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=2 listar-ativos -> ms.gerente.cmd
2026-10-27T21:21:35.481-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=2 listar-ativos SUCESSO
2026-10-27T21:21:35.483-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=3 gerente-com-menos-clientes -> ms.conta.cmd
2026-10-27T21:21:35.495-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=3 gerente-com-menos-clientes SUCESSO
2026-10-27T21:21:35.497-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=4 criar-cliente -> ms.cliente.cmd
2026-10-27T21:21:35.519-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=4 criar-cliente SUCESSO
2026-10-27T21:21:35.521-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=5 criar-usuario -> ms.auth.cmd
2026-10-27T21:21:35.686-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=5 criar-usuario SUCESSO
2026-10-27T21:21:35.687-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=6 criar-conta -> ms.conta.cmd
2026-10-27T21:22:07.463-03:00 ERROR sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=6 falha técnica: timeout de 30 s no passo 6 (criar-conta)
2026-10-27T21:22:07.463-03:00 WARN sagaId=f76a7393-defe-42f8-8bc3-9df30328010d FALHA no passo 6: Não foi possível concluir a operação agora. Tente novamente em alguns instantes. — compensando [5, 4, 1]
2026-10-27T21:22:07.464-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=6 compensar-criar-conta -> ms.conta.cmd (sem esperar resposta)
2026-10-27T21:22:07.466-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=5 compensar-criar-usuario -> ms.auth.cmd
2026-10-27T21:22:07.492-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=5 compensar-criar-usuario status=SUCESSO erro=null
2026-10-27T21:22:07.494-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=4 compensar-criar-cliente -> ms.cliente.cmd
2026-10-27T21:22:07.507-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=4 compensar-criar-cliente status=SUCESSO erro=null
2026-10-27T21:22:07.509-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=1 compensar-aprovar-solicitacao -> ms.cliente.cmd
2026-10-27T21:22:07.521-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d passo=1 compensar-aprovar-solicitacao status=SUCESSO erro=null
2026-10-27T21:22:07.523-03:00 INFO sagaId=f76a7393-defe-42f8-8bc3-9df30328010d email.solicitacao-nao-efetuada -> ms.email.cmd
2026-10-27T21:22:07.526-03:00 WARN sagaId=f76a7393-defe-42f8-8bc3-9df30328010d tipo=aprovar-cliente COMPENSADA: Não foi possível concluir a operação agora. Tente novamente em alguns instantes.

### DEPOIS da compensação, MS Conta ainda congelado (21:22:22)
solicitacao (cpf | status | motivo):
77700033344 | PENDENTE | -
cliente.clientes com esse cpf: 0
conta_query.contas desse cliente: nenhuma
usuario no MS Auth (Mongo): 0

### fila ms.conta.cmd enquanto o MS Conta está congelado: 2 mensagem(ns) (criar-conta atrasado + compensar-criar-conta)
### docker unpause ms-conta (21:22:34)
trabalho-dac-ms-conta-1

### depois de o MS Conta consumir a fila (21:22:42)
solicitacao (cpf | status | motivo):
77700033344 | PENDENTE | -
cliente.clientes com esse cpf: 0
conta_query.contas desse cliente: nenhuma
usuario no MS Auth (Mongo): 0
contas totais no read model: 5  (seed = 5)
eventos da conta desse cliente no event store (tipo):
3678 v1 Criado
3678 v2 CriacaoCompensada

### log do ms-email (sagaId)
2026-10-27T21:22:07.528-03:00 ERROR sagaId=f76a7393-defe-42f8-8bc3-9df30328010d tipo=email.solicitacao-nao-efetuada resultado=FALHA causa=Authentication failed

### senha no log do ms-email: 0 linha(s)
```

**Como ler:**

- **No meio**, a solicitação está `APROVADA`, o cliente e o usuário existem,
  e não há conta (o passo 6 não respondeu).
- O passo 6 foi publicado às `21:21:35.687` e estourou às `21:22:07.463`
  (~31,8 s: os 30 s de `TIMEOUT_PASSO` mais a granularidade de 5 s da
  varredura). O Orquestrador compensa só o que foi executado, **em ordem
  inversa**: `[5, 4, 1]` — remove o usuário, remove o cliente, devolve a
  solicitação para `PENDENTE`. Os passos 2 e 3 são consultas, não têm o que
  desfazer.
- Fecha publicando `email.solicitacao-nao-efetuada` — o `ms-email` recebe e
  tenta enviar (falha só por falta de credencial, como no cenário A).
- **O passo incerto:** como o passo 6 deu timeout, o Orquestrador não sabe se
  a conta chegou a ser criada, então dispara `compensar-criar-conta` "sem
  esperar resposta" logo de cara. Ao descongelar o MS Conta, a fila tinha as
  duas mensagens — o `criar-conta` atrasado e a compensação — e ele processa
  as duas em ordem: a conta `3678` nasce (`v1 Criado`) e é desfeita no mesmo
  instante (`v2 CriacaoCompensada`). O read model volta às 5 contas do seed:
  **nenhuma conta órfã**, e o event store continua append-only (a compensação
  é um evento novo, não um `DELETE`).

### Como reproduzir o R9-B

```bash
TOK=$(curl -s -X POST localhost:8000/login -H 'content-type: application/json' \
  -d '{"email":"ger1@bantads.com.br","senha":"tads"}' | jq -r .token)
# crie uma solicitação PENDENTE (POST /solicitacoes) e então:
docker pause trabalho-dac-ms-auth-1
J=$(curl -s -X POST localhost:8000/solicitacoes/<cpf>/aprovacao -H "x-access-token: $TOK" | jq -r .jobId)
until docker compose logs ms-orquestrador | grep -q "$J.*passo=4 criar-cliente SUCESSO"; do sleep 0.2; done
docker pause trabalho-dac-ms-conta-1 && docker unpause trabalho-dac-ms-auth-1
# ~35 s depois: GET /jobs/$J/status -> FALHA; então:
docker unpause trabalho-dac-ms-conta-1
```

Atenção à ordem: pausar o MS Auth **antes** do login faz o login falhar
(ele passa pelo MS Auth), e nenhuma SAGA chega a começar.

A espera do passo 4 procura a linha **desta** SAGA, pelo `jobId`. Um
`docker compose logs -f | grep -m1` casaria a linha de uma SAGA anterior e só
devolveria o controle no timeout do passo 5, com o MS Auth ainda pausado: a
SAGA compensaria `[4, 1]` e o passo 6 nunca rodaria. Conferido em 27/10, às
23:09, com a receita acima: timeout no passo 6, `compensando [5, 4, 1]`, a
conta `6131` com `v1 Criado` e `v2 CriacaoCompensada`, e o e-mail de "não
efetuada" enviado (cenário C).

## R9, Cenário C: com o Gmail de verdade (27/10)

O mesmo R9 do cenário A, agora com `GMAIL_USER` e `GMAIL_APP_PASSWORD`
preenchidos no `.env`. O cliente foi cadastrado com o e-mail da própria conta
da equipe, com um sufixo (`+r9`) que o Gmail entrega na mesma caixa. O
`ms-email` ficou parado só durante a aprovação, para ler a senha no payload de
`ms.email.cmd` pela API do console (`ackmode: ack_requeue_true`, a mensagem
volta para a fila) e testar o login com ela. Ao religar, ele consome a
mensagem e envia. O endereço da conta aparece mascarado.

```
{"status":"ok","clientes":5,"gerentes":4,"contas":5}
### POST /solicitacoes (23:08:38), e-mail do cliente = a caixa da equipe com +r9
{"cpf":"77700055566","status":"PENDENTE"}
### docker compose stop ms-email (23:08:39), para ler a senha na fila antes do envio
### job (23:08:41): {"status":"CONCLUIDO","resultType":"resource","dominio":"clientes","resourceId":"77700055566"}
### senha lida no payload de ms.email.cmd: 8 caracteres (valor fora deste registro)
### docker compose start ms-email (23:08:43)
### log do ms-email
2026-10-27T23:08:50.348-03:00 INFO sagaId=218ff0e9-ffde-4c2e-9175-d35b2caf1456 tipo=email.senha-nova para=<GMAIL_USER+r9> resultado=ENVIADO
### POST /login do cliente novo com a senha gerada: HTTP 200
### a senha aparece em algum log da frota? 0 linha(s)
```

E o e-mail de "não efetuada", na rodada do cenário B feita com a receita
corrigida e a mesma credencial (o resto da saída é igual à do cenário B):

```
### log do ms-email
2026-10-27T23:10:10.553-03:00 INFO sagaId=b2195cbb-781e-4236-acd6-fd98a14abe94 tipo=email.solicitacao-nao-efetuada para=<GMAIL_USER+r9b> resultado=ENVIADO
```

**Como ler:** `resultado=ENVIADO` é o Gmail aceitando a mensagem no SMTP. A
senha gerada no passo 5 abre a sessão do cliente novo (`POST /login` → 200) e
não aparece em nenhuma linha de log dos 12 contêineres. A procura foi pelo
valor exato da senha, não pela palavra "senha". Falta só o print da caixa de
entrada com os dois e-mails (ver "Ainda pendente").

## R13 — Cenário 1: derrubar o MS Conta no meio da SAGA (20/10)

**O que acontece:** a SAGA R13 insere o gerente (passo 1), cria o usuário
(passo 2) e pergunta ao MS Conta qual conta transferir (passo 3). Com o
`ms-conta` parado, o comando do passo 3 fica na fila sem consumidor, o passo
estoura os 30 s e o Orquestrador compensa os passos já feitos **em ordem
inversa** — `[2, 1]`: primeiro remove o usuário do MS Auth, depois remove o
gerente do MS Gerente. O job fecha `FALHA` com a frase para humano; o detalhe
técnico fica só no log.

Executado em 20/10/2026 contra a frota completa (12 contêineres, `/reboot`
antes). Saída integral:

```
### ANTES (apos POST /reboot, 19:35:03)
gerentes (cpf | nome | ativo):
40501740066 | Gadamântio | t
98574307084 | Geniéve | t
64065268052 | Godophredo | t
23862179060 | Gyândula | t
contas por gerente (cpf_gerente | qtd):
23862179060 | 1
64065268052 | 2
98574307084 | 2
usuarios no MS Auth (Mongo): 9

### docker compose stop ms-conta   (19:35:04)
 Container trabalho-dac-ms-conta-1 Stopped 

### POST /gerentes   (19:35:05)
{"jobId":"15f12352-cabd-4019-93b1-d1300a6ce2b7","status":"PENDENTE","resultType":null,"dominio":"gerentes","resourceId":null,"erro":null}

### MEIO da SAGA, +5s (19:35:10) — passos 1 e 2 ja executados, passo 3 sem consumidor
job: {"status":"PENDENTE","erro":null}
gerentes (cpf | nome | ativo):
40501740066 | Gadamântio | t
98574307084 | Geniéve | t
11122233344 | Gerente Teste | t
64065268052 | Godophredo | t
23862179060 | Gyândula | t
contas por gerente (cpf_gerente | qtd):
23862179060 | 1
64065268052 | 2
98574307084 | 2
usuarios no MS Auth (Mongo): 10

### job em +38s (19:35:43): {"status":"FALHA","erro":"Não foi possível concluir a operação agora. Tente novamente em alguns instantes."}

### log do ms-orquestrador
2026-10-20T19:35:05.068-03:00 INFO sagaId=15f12352-cabd-4019-93b1-d1300a6ce2b7 tipo=inserir-gerente iniciada
2026-10-20T19:35:05.069-03:00 INFO sagaId=15f12352-cabd-4019-93b1-d1300a6ce2b7 passo=1 inserir-gerente -> ms.gerente.cmd
2026-10-20T19:35:05.083-03:00 INFO sagaId=15f12352-cabd-4019-93b1-d1300a6ce2b7 passo=1 inserir-gerente SUCESSO
2026-10-20T19:35:05.085-03:00 INFO sagaId=15f12352-cabd-4019-93b1-d1300a6ce2b7 passo=2 criar-usuario -> ms.auth.cmd
2026-10-20T19:35:05.129-03:00 INFO sagaId=15f12352-cabd-4019-93b1-d1300a6ce2b7 passo=2 criar-usuario SUCESSO
2026-10-20T19:35:05.131-03:00 INFO sagaId=15f12352-cabd-4019-93b1-d1300a6ce2b7 passo=3 conta-a-transferir -> ms.conta.cmd
2026-10-20T19:35:38.804-03:00 ERROR sagaId=15f12352-cabd-4019-93b1-d1300a6ce2b7 passo=3 falha técnica: timeout de 30 s no passo 3 (conta-a-transferir)
2026-10-20T19:35:38.804-03:00 WARN sagaId=15f12352-cabd-4019-93b1-d1300a6ce2b7 FALHA no passo 3: Não foi possível concluir a operação agora. Tente novamente em alguns instantes. — compensando [2, 1]
2026-10-20T19:35:38.806-03:00 INFO sagaId=15f12352-cabd-4019-93b1-d1300a6ce2b7 passo=2 compensar-criar-usuario -> ms.auth.cmd
2026-10-20T19:35:38.818-03:00 INFO sagaId=15f12352-cabd-4019-93b1-d1300a6ce2b7 passo=2 compensar-criar-usuario status=SUCESSO erro=null
2026-10-20T19:35:38.820-03:00 INFO sagaId=15f12352-cabd-4019-93b1-d1300a6ce2b7 passo=1 compensar-inserir-gerente -> ms.gerente.cmd
2026-10-20T19:35:38.829-03:00 INFO sagaId=15f12352-cabd-4019-93b1-d1300a6ce2b7 passo=1 compensar-inserir-gerente status=SUCESSO erro=null
2026-10-20T19:35:38.834-03:00 WARN sagaId=15f12352-cabd-4019-93b1-d1300a6ce2b7 tipo=inserir-gerente COMPENSADA: Não foi possível concluir a operação agora. Tente novamente em alguns instantes.

### DEPOIS (19:35:44)
gerentes (cpf | nome | ativo):
40501740066 | Gadamântio | t
98574307084 | Geniéve | t
64065268052 | Godophredo | t
23862179060 | Gyândula | t
contas por gerente (cpf_gerente | qtd):
23862179060 | 1
64065268052 | 2
98574307084 | 2
usuarios no MS Auth (Mongo): 9
```

**Como ler:** o gerente `11122233344 | Gerente Teste` e o 10º usuário só
existem no bloco "MEIO da SAGA"; no "DEPOIS" o banco é idêntico ao "ANTES"
(4 gerentes, 5 contas distribuídas 1/2/2, 9 usuários no Mongo). O passo 3 foi
publicado às `19:35:05.131` e estourou às `19:35:38.804` — ~33,7 s: os 30 s
de `TIMEOUT_PASSO` mais até 5 s de granularidade da varredura
(`@Scheduled(fixedDelay = 5000)`).

## R13 — Cenário 2: timeout de passo com várias compensações (20/10)

**O que acontece:** mesmo mecanismo, mas parando o `ms-cliente`, consumidor
do passo 5 (`obter-clientes-por-cpf`). Aqui já há três passos executados e
compensáveis (1, 2 e 4 — o 4 reatribui uma conta ao gerente novo), então a
compensação precisa desfazer os três, de trás pra frente: `[4, 2, 1]`.

Executado em 20/10/2026 (mesma frota, `/reboot` antes). Saída integral:

```
### ANTES (apos POST /reboot, 19:36:09)
gerentes (cpf | nome | ativo):
40501740066 | Gadamântio | t
98574307084 | Geniéve | t
64065268052 | Godophredo | t
23862179060 | Gyândula | t
contas por gerente (cpf_gerente | qtd):
23862179060 | 1
64065268052 | 2
98574307084 | 2
usuarios no MS Auth (Mongo): 9

### docker compose stop ms-cliente   (19:36:10)
 Container trabalho-dac-ms-cliente-1 Stopped 

### POST /gerentes   (19:36:10)
{"jobId":"015c7397-52af-4340-bed9-54c591451cf2","status":"PENDENTE","resultType":null,"dominio":"gerentes","resourceId":null,"erro":null}

### MEIO da SAGA, +6s (19:36:16) — passos 1, 2 e 4 executados; passo 5 aguardando o ms-cliente
job: {"status":"PENDENTE","erro":null}
gerentes (cpf | nome | ativo):
40501740066 | Gadamântio | t
98574307084 | Geniéve | t
11122233344 | Gerente Teste | t
64065268052 | Godophredo | t
23862179060 | Gyândula | t
contas por gerente (cpf_gerente | qtd):
11122233344 | 1
23862179060 | 1
64065268052 | 1
98574307084 | 2
usuarios no MS Auth (Mongo): 10

### job em +38s (19:36:49): {"status":"FALHA","erro":"Não foi possível concluir a operação agora. Tente novamente em alguns instantes."}

### log do ms-orquestrador
2026-10-20T19:36:10.830-03:00 INFO sagaId=015c7397-52af-4340-bed9-54c591451cf2 tipo=inserir-gerente iniciada
2026-10-20T19:36:10.832-03:00 INFO sagaId=015c7397-52af-4340-bed9-54c591451cf2 passo=1 inserir-gerente -> ms.gerente.cmd
2026-10-20T19:36:10.845-03:00 INFO sagaId=015c7397-52af-4340-bed9-54c591451cf2 passo=1 inserir-gerente SUCESSO
2026-10-20T19:36:10.847-03:00 INFO sagaId=015c7397-52af-4340-bed9-54c591451cf2 passo=2 criar-usuario -> ms.auth.cmd
2026-10-20T19:36:10.889-03:00 INFO sagaId=015c7397-52af-4340-bed9-54c591451cf2 passo=2 criar-usuario SUCESSO
2026-10-20T19:36:10.891-03:00 INFO sagaId=015c7397-52af-4340-bed9-54c591451cf2 passo=3 conta-a-transferir -> ms.conta.cmd
2026-10-20T19:36:10.926-03:00 INFO sagaId=015c7397-52af-4340-bed9-54c591451cf2 passo=3 conta-a-transferir SUCESSO
2026-10-20T19:36:10.928-03:00 INFO sagaId=015c7397-52af-4340-bed9-54c591451cf2 passo=4 atribuir-conta -> ms.conta.cmd
2026-10-20T19:36:10.985-03:00 INFO sagaId=015c7397-52af-4340-bed9-54c591451cf2 passo=4 atribuir-conta SUCESSO
2026-10-20T19:36:10.986-03:00 INFO sagaId=015c7397-52af-4340-bed9-54c591451cf2 passo=5 obter-clientes-por-cpf -> ms.cliente.cmd
2026-10-20T19:36:43.838-03:00 ERROR sagaId=015c7397-52af-4340-bed9-54c591451cf2 passo=5 falha técnica: timeout de 30 s no passo 5 (obter-clientes-por-cpf)
2026-10-20T19:36:43.838-03:00 WARN sagaId=015c7397-52af-4340-bed9-54c591451cf2 FALHA no passo 5: Não foi possível concluir a operação agora. Tente novamente em alguns instantes. — compensando [4, 2, 1]
2026-10-20T19:36:43.840-03:00 INFO sagaId=015c7397-52af-4340-bed9-54c591451cf2 passo=4 compensar-atribuir-conta -> ms.conta.cmd
2026-10-20T19:36:43.862-03:00 INFO sagaId=015c7397-52af-4340-bed9-54c591451cf2 passo=4 compensar-atribuir-conta status=SUCESSO erro=null
2026-10-20T19:36:43.864-03:00 INFO sagaId=015c7397-52af-4340-bed9-54c591451cf2 passo=2 compensar-criar-usuario -> ms.auth.cmd
2026-10-20T19:36:43.875-03:00 INFO sagaId=015c7397-52af-4340-bed9-54c591451cf2 passo=2 compensar-criar-usuario status=SUCESSO erro=null
2026-10-20T19:36:43.877-03:00 INFO sagaId=015c7397-52af-4340-bed9-54c591451cf2 passo=1 compensar-inserir-gerente -> ms.gerente.cmd
2026-10-20T19:36:43.886-03:00 INFO sagaId=015c7397-52af-4340-bed9-54c591451cf2 passo=1 compensar-inserir-gerente status=SUCESSO erro=null
2026-10-20T19:36:43.889-03:00 WARN sagaId=015c7397-52af-4340-bed9-54c591451cf2 tipo=inserir-gerente COMPENSADA: Não foi possível concluir a operação agora. Tente novamente em alguns instantes.

### DEPOIS (19:36:49)
gerentes (cpf | nome | ativo):
40501740066 | Gadamântio | t
98574307084 | Geniéve | t
64065268052 | Godophredo | t
23862179060 | Gyândula | t
contas por gerente (cpf_gerente | qtd):
23862179060 | 1
64065268052 | 2
98574307084 | 2
usuarios no MS Auth (Mongo): 9
```

**Como ler:** no "MEIO da SAGA" a conta foi de fato reatribuída
(`11122233344 | 1`, e `64065268052` caiu de 2 para 1) e há 10 usuários; o
passo 5 foi publicado às `19:36:10.986` e estourou às `19:36:43.838` (~32,9 s).
A compensação do passo 4 devolve a conta ao gerente original, e no "DEPOIS"
a distribuição volta a `1 / 2 / 2` — conferindo que a compensação é real,
não só log.

### Como reproduzir os cenários do R13

Com a frota no ar (`docker compose up -d`) e um `/reboot` recém-feito:

```bash
TOK=$(curl -s -X POST localhost:8000/login -H 'content-type: application/json' \
  -d '{"email":"ger1@bantads.com.br","senha":"tads"}' | jq -r .token)

docker compose stop ms-conta        # cenário 1  (ou: ms-cliente, cenário 2)

curl -s -X POST localhost:8000/gerentes -H "x-access-token: $TOK" \
  -H 'content-type: application/json' \
  -d '{"cpf":"11122233344","nome":"Gerente Teste","email":"gerente.teste@bantads.com.br","telefone":"41988887777","senha":"tads"}'
# 202 + jobId; ~35 s depois: GET /jobs/<jobId>/status -> FALHA
docker compose logs ms-orquestrador | grep <jobId>
```

Estado do banco antes/durante/depois:

```bash
docker compose exec -T postgres psql -U postgres -d bantads -c \
  "SELECT cpf, nome, ativo FROM gerente.gerentes ORDER BY nome;
   SELECT cpf_gerente, count(*) FROM conta_query.contas GROUP BY 1 ORDER BY 1;"
docker compose exec -T mongo mongosh --quiet bantads_auth --eval 'db.usuarios.countDocuments()'
```

**Depois de um cenário:** não precisa esvaziar a fila. Ao religar o serviço, ele processa o comando
atrasado, a resposta chega fora do passo corrente e o Orquestrador ignora (`resposta fora do passo
corrente, ignorada` no log).

## R15 com os listeners reais — logout forçado e último gerente ativo (S10)

Frota inteira, sem stub: os passos do R15 rodam nos listeners do MS Gerente, MS Auth, MS Conta e
MS Cliente. Medido em 20/10/2026, com o gateway em `localhost:58000`.

### Logout forçado com duas sessões

O ger2 (Godophredo) loga duas vezes e o ger1 o remove. As duas sessões caem, porque o passo 3
apaga todos os `jti` do SET `sessao:cpf:<cpf>`, não só o último.

```
$ POST /reboot
{"status":"ok","clientes":5,"gerentes":4,"contas":5}
$ duas sessões do ger2 (64065268052), mais a do ger1
SMEMBERS sessao:cpf:64065268052 -> 2 jti
sessão 1 GET /gerentes -> 200
sessão 2 GET /gerentes -> 200
contas do ger2 antes: 09506382000 -> 64065268052, 76179646090 -> 64065268052
$ ger1: DELETE /gerentes/64065268052
HTTP/1.1 202 Accepted
Location: /jobs/b0fc9df8-de5a-4457-a59a-1e782959189c/status
status: {"jobId":"b0fc9df8-…","status":"CONCLUIDO","resultType":"inline",…} (2s)
result: {"mensagem":"Gerente removido; 2 contas transferidas para Gadamântio"}
sessão 1 GET /gerentes -> {"auth":false,"message":"Falha ao autenticar o token."} 401
sessão 2 GET /gerentes -> {"auth":false,"message":"Falha ao autenticar o token."} 401
SMEMBERS sessao:cpf:64065268052 -> 0 jti; EXISTS sessao:<jti da sessão 1> -> 0
novo login do ger2 -> {"auth":false,"message":"Login inválido!"} 401
ger1 (outra sessão) continua -> 200
contas do ger2 depois: 09506382000 -> 40501740066, 76179646090 -> 40501740066
GET /gerentes (ativos) -> [('Gadamântio', 2), ('Geniéve', 2), ('Gyândula', 1)]
```

```
sagaId=b0fc9df8-… tipo=remover-gerente iniciada
sagaId=b0fc9df8-… passo=1 inativar-gerente SUCESSO
sagaId=b0fc9df8-… passo=2 desativar-usuario SUCESSO
sagaId=b0fc9df8-… passo=3 encerrar-sessoes (local)
sagaId=b0fc9df8-… passo=4 listar-ativos SUCESSO
sagaId=b0fc9df8-… passo=5 transferir-contas-do-gerente SUCESSO
sagaId=b0fc9df8-… passo=6 obter-clientes-por-cpf SUCESSO
sagaId=b0fc9df8-… passo=7 email.gerente-alterado -> ms.email.cmd x2 (fire-and-forget)
sagaId=b0fc9df8-… tipo=remover-gerente CONCLUIDA
```

### Recusa do último gerente ativo

O Gateway barra a auto-remoção com 403 antes da SAGA, então a regra do MS Gerente só é alcançada
pela corrida: com dois gerentes ativos, cada um remove o outro ao mesmo tempo. O MS Gerente
consome `ms.gerente.cmd` com `concurrency = 1`; o primeiro `inativar-gerente` passa e o segundo
encontra um ativo só.

```
$ ger1: DELETE /gerentes/23862179060 (Gyândula) — sobram ger1 e ger4
status: {"status":"CONCLUIDO",…,"resultado":{"mensagem":"Gerente removido; 1 conta transferida para Gadamântio"}} (2s)
GET /gerentes (ativos) -> ['Gadamântio', 'Geniéve']
$ ao mesmo tempo: ger1 remove ger4 e ger4 remove ger1
$ os dois jobs, lidos com o token do ger4 (o ger1 foi removido e a sessão dele caiu)
ger1 -> ger4: {"jobId":"03e848f0-…","status":"FALHA",…,"erro":"Não é possível remover o último gerente ativo"}
ger4 -> ger1: {"jobId":"894e1b49-…","status":"CONCLUIDO",…,"resultado":{"mensagem":"Gerente removido; 2 contas transferidas para Gadamântio"}}
$ ger4 tenta remover a si mesmo (o único ativo) -> {"status":403,"erro":"Forbidden","mensagem":"Um gerente não pode remover a si mesmo"} 403
GET /gerentes (ativos) -> [('Gadamântio', 5)]
```

```
sagaId=894e1b49-… passo=1 inativar-gerente -> ms.gerente.cmd
sagaId=03e848f0-… passo=1 inativar-gerente -> ms.gerente.cmd
sagaId=894e1b49-… passo=1 inativar-gerente SUCESSO
sagaId=03e848f0-… FALHA no passo 1: Não é possível remover o último gerente ativo — compensando []
sagaId=03e848f0-… tipo=remover-gerente COMPENSADA: Não é possível remover o último gerente ativo
sagaId=894e1b49-… tipo=remover-gerente CONCLUIDA
```

## Como provocar a falha nos cenários 3 e 4 sem mexer em código

Os cenários 3 e 4 precisam que um handler **lance exceção** (não que responda
`FALHA` de negócio). O jeito mais limpo que achamos foi no banco do MS Auth:
um validador temporário no Mongo que recusa toda gravação em
`bantads_auth.usuarios`. O `criar-usuario` do MS Auth tenta gravar, o Mongo
responde `code=121 'Document failed validation'`, a exceção sobe pelo
listener, o retry tenta 4 vezes e a mensagem vai para a `ms.auth.cmd.dlq`.
Nenhuma linha de código muda, e desfazer é um comando:

```bash
# ligar
docker compose exec -T mongo mongosh --quiet bantads_auth --eval \
  "db.runCommand({collMod:'usuarios', validator:{\$expr:{\$eq:[1,0]}}, validationLevel:'strict', validationAction:'error'}).ok"
# desligar (sempre, no fim do cenário — senão o /reboot falha ao semear)
docker compose exec -T mongo mongosh --quiet bantads_auth --eval \
  "db.runCommand({collMod:'usuarios', validator:{}, validationLevel:'off'}).ok"
```

A compensação do MS Auth (`compensar-criar-usuario`) é um `delete` — o
validador não bloqueia, então o desfazer continua funcionando com a falha
ligada.

Comandos comuns aos dois cenários (gerente de teste do R13):

```bash
TOK=$(curl -s -X POST localhost:8000/login -H 'content-type: application/json' \
  -d '{"email":"ger1@bantads.com.br","senha":"tads"}' | jq -r .token)
curl -s -X POST localhost:8000/gerentes -H "x-access-token: $TOK" -H 'content-type: application/json' \
  -d '{"cpf":"11122233344","nome":"Gerente Teste","email":"gerente.teste@bantads.com.br","telefone":"41988887777","senha":"tads"}'
docker compose logs ms-orquestrador | grep <jobId>
```

## Cenário 3 — DLQ de comando: o Orquestrador compensa a partir da DLQ (10/11)

**Passo a passo:** `/reboot` → ligar o validador → login do gerente →
`POST /gerentes` → esperar o job sair de `PENDENTE` (~16 s) → desligar o
validador → conferir o banco.

**O que acontece:** o passo 1 (`inserir-gerente`) passa; o passo 2
(`criar-usuario`) chega ao MS Auth, que falha nas 4 execuções (1 entrega + 3
retentativas, 5 s entre elas). A mensagem vai para a `ms.auth.cmd.dlq`, o
`OrquestradorSaga.falhaTecnica` (consumidor dessa DLQ) a lê, vê que é o passo
que a SAGA está esperando, e dispara a compensação — **antes** do timeout de
30 s, porque a DLQ avisa primeiro.

Saída integral:

```
{"status":"ok","clientes":5,"gerentes":4,"contas":5}
### ANTES (20:19:11.022)
gerentes (cpf | nome | ativo):
40501740066 | Gadamântio | t
98574307084 | Geniéve | t
64065268052 | Godophredo | t
23862179060 | Gyândula | t
usuarios no MS Auth (Mongo): 9  | com cpf 11122233344: 0
{"fila":"ms.auth.cmd.dlq","mensagens":0,"consumidores":1}

### falha injetada no MS Auth (20:19:12.625): validador no Mongo que recusa toda gravação em bantads_auth.usuarios -> ok=1

### POST /gerentes (20:19:13.171)
{"jobId":"3bc417f4-be3f-4af3-ac55-73fc8a89c000","status":"PENDENTE"}
### job (20:19:29.618): {"status":"FALHA","erro":"Não foi possível concluir a operação agora. Tente novamente em alguns instantes."}
### validador removido (20:19:29.640): ok=1

### log do ms-auth (as 4 tentativas do criar-usuario)
2026-11-10T20:19:28.978-03:00 WARN o.s.a.r.r.RejectAndDontRequeueRecoverer: Retries exhausted for message (Body:'[B@610f461b(byte[209])' MessageProperties [headers={}, contentType=application/json, co
2026-11-10T20:19:28.988-03:00 WARN o.s.a.l.ConditionalRejectingErrorHandler: Execution of Rabbit message listener failed.

### log do ms-orquestrador
2026-11-10T20:19:13.183-03:00 INFO sagaId=3bc417f4-be3f-4af3-ac55-73fc8a89c000 tipo=inserir-gerente iniciada
2026-11-10T20:19:13.185-03:00 INFO sagaId=3bc417f4-be3f-4af3-ac55-73fc8a89c000 passo=1 inserir-gerente -> ms.gerente.cmd
2026-11-10T20:19:13.551-03:00 INFO sagaId=3bc417f4-be3f-4af3-ac55-73fc8a89c000 passo=1 inserir-gerente SUCESSO
2026-11-10T20:19:13.553-03:00 INFO sagaId=3bc417f4-be3f-4af3-ac55-73fc8a89c000 passo=2 criar-usuario -> ms.auth.cmd
2026-11-10T20:19:29.000-03:00 ERROR sagaId=3bc417f4-be3f-4af3-ac55-73fc8a89c000 passo=2 falha técnica: criar-usuario foi para a DLQ
2026-11-10T20:19:29.001-03:00 WARN sagaId=3bc417f4-be3f-4af3-ac55-73fc8a89c000 FALHA no passo 2: Não foi possível concluir a operação agora. Tente novamente em alguns instantes. — compensando [1]
2026-11-10T20:19:29.002-03:00 INFO sagaId=3bc417f4-be3f-4af3-ac55-73fc8a89c000 passo=2 compensar-criar-usuario -> ms.auth.cmd (sem esperar resposta)
2026-11-10T20:19:29.006-03:00 INFO sagaId=3bc417f4-be3f-4af3-ac55-73fc8a89c000 passo=1 compensar-inserir-gerente -> ms.gerente.cmd
2026-11-10T20:19:29.024-03:00 INFO sagaId=3bc417f4-be3f-4af3-ac55-73fc8a89c000 tipo=compensar-criar-usuario resposta fora do passo corrente, ignorada
2026-11-10T20:19:29.031-03:00 INFO sagaId=3bc417f4-be3f-4af3-ac55-73fc8a89c000 passo=1 compensar-inserir-gerente status=SUCESSO erro=null
2026-11-10T20:19:29.039-03:00 WARN sagaId=3bc417f4-be3f-4af3-ac55-73fc8a89c000 tipo=inserir-gerente COMPENSADA: Não foi possível concluir a operação agora. Tente novamente em alguns instantes.

### DEPOIS (20:19:33.586)
gerentes (cpf | nome | ativo):
40501740066 | Gadamântio | t
98574307084 | Geniéve | t
64065268052 | Godophredo | t
23862179060 | Gyândula | t
usuarios no MS Auth (Mongo): 9  | com cpf 11122233344: 0
{"fila":"ms.auth.cmd.dlq","mensagens":0,"consumidores":1}
```

Causa no log do `ms-auth` (contagem de linhas `Caused by`):

```
      2 Caused by: com.mongodb.MongoWriteException: Write operation error on MongoDB server mongo:27017. Write error: WriteError{code=121, message='Document failed validation', d
      1 Caused by: org.springframework.amqp.AmqpRejectAndDontRequeueException
      1 Caused by: org.springframework.amqp.rabbit.support.ListenerExecutionFailedException: Listener method 'public void br.ufpr.dac.grupo2.auth.messaging.AuthSagaListener.receb
      2 Caused by: org.springframework.dao.DataIntegrityViolationException: Write operation error on MongoDB server mongo:27017. Write error: WriteError{code=121, message='Docume
```

**Como ler:**

- O passo 2 foi publicado às `20:19:13.553` e caiu na DLQ às `20:19:29.000`
  — **15,4 s**: exatamente as 3 esperas de 5 s do retry. O timeout de 30 s
  não chegou a disparar: a linha é `criar-usuario foi para a DLQ`.
- A compensação faz `[1]` (remove o gerente) e, como o passo 2 é incerto
  (o Orquestrador não sabe se a escrita chegou a acontecer), dispara também
  `compensar-criar-usuario` "sem esperar resposta". A resposta dele chega
  depois e é ignorada de propósito (`resposta fora do passo corrente`).
- A `ms.auth.cmd.dlq` aparece com **0 mensagens** antes e depois, e com
  `consumidores: 1`: a mensagem passou por ela, mas o próprio Orquestrador a
  consome na hora — é assim que ele fica sabendo da falha. As 4 DLQs de
  comando não acumulam (ver `tools/RESILIENCIA.md`); a que acumula é a de
  eventos, no cenário 5.
- No "DEPOIS", os 4 gerentes e os 9 usuários do seed — o gerente de teste
  sumiu e nenhum usuário foi criado.

## Cenário 4 — dupla notificação: timeout e DLQ no mesmo passo (10/11)

O cenário mais importante: se a compensação rodasse duas vezes, o segundo
`compensar-inserir-gerente` poderia apagar dado de outra operação. O que
protege é o guarda do `OrquestradorSaga`: uma notificação de DLQ só conta se
for do passo que a SAGA **ainda** está esperando.

**Passo a passo:** `/reboot` → ligar o validador → login do gerente →
`docker pause trabalho-dac-ms-auth-1` → `POST /gerentes` → esperar o log
mostrar `COMPENSADA` (~32 s, pelo timeout) → `docker unpause
trabalho-dac-ms-auth-1` → esperar o log mostrar `na DLQ fora do passo
corrente, ignorada` (~16 s) → desligar o validador → conferir o banco.

Atenção à ordem: pausar o MS Auth **depois** do login (o login passa por
ele).

**O que acontece:** com o MS Auth congelado, o passo 2 fica sem resposta e o
timeout de 30 s dispara a compensação — primeira notificação. Ao
descongelar, o MS Auth enfim processa o `criar-usuario` atrasado, que falha 4
vezes no validador e vai para a DLQ — segunda notificação, do mesmo passo,
~16 s depois.

Saída integral:

```
{"status":"ok","clientes":5,"gerentes":4,"contas":5}
### ANTES (20:20:10.658)
gerentes (cpf | nome | ativo):
40501740066 | Gadamântio | t
98574307084 | Geniéve | t
64065268052 | Godophredo | t
23862179060 | Gyândula | t
usuarios no MS Auth (Mongo): 9  | com cpf 11122233344: 0

### validador no Mongo (20:20:12.286) ok=1;  docker pause ms-auth (20:20:12.824)

### POST /gerentes (20:20:12.875)
{"jobId":"2e6cc9fa-dc1d-4c0e-9fa4-3b9c2b42d1fd","status":"PENDENTE"}
### SAGA já compensada pelo TIMEOUT (20:20:45.276); job: {"status":"FALHA","erro":"Não foi possível concluir a operação agora. Tente novamente em alguns instantes."}
### fila ms.auth.cmd com o MS Auth congelado: {"fila":"ms.auth.cmd","mensagens":1,"consumidores":1}
### docker unpause ms-auth (20:20:45.321) — o criar-usuario atrasado vai falhar 4x e cair na DLQ
### validador removido (20:21:03.053) ok=1

### log do ms-orquestrador
2026-11-10T20:20:12.887-03:00 INFO sagaId=2e6cc9fa-dc1d-4c0e-9fa4-3b9c2b42d1fd tipo=inserir-gerente iniciada
2026-11-10T20:20:12.889-03:00 INFO sagaId=2e6cc9fa-dc1d-4c0e-9fa4-3b9c2b42d1fd passo=1 inserir-gerente -> ms.gerente.cmd
2026-11-10T20:20:12.903-03:00 INFO sagaId=2e6cc9fa-dc1d-4c0e-9fa4-3b9c2b42d1fd passo=1 inserir-gerente SUCESSO
2026-11-10T20:20:12.905-03:00 INFO sagaId=2e6cc9fa-dc1d-4c0e-9fa4-3b9c2b42d1fd passo=2 criar-usuario -> ms.auth.cmd
2026-11-10T20:20:44.382-03:00 ERROR sagaId=2e6cc9fa-dc1d-4c0e-9fa4-3b9c2b42d1fd passo=2 falha técnica: timeout de 30 s no passo 2 (criar-usuario)
2026-11-10T20:20:44.383-03:00 WARN sagaId=2e6cc9fa-dc1d-4c0e-9fa4-3b9c2b42d1fd FALHA no passo 2: Não foi possível concluir a operação agora. Tente novamente em alguns instantes. — compensando [1]
2026-11-10T20:20:44.383-03:00 INFO sagaId=2e6cc9fa-dc1d-4c0e-9fa4-3b9c2b42d1fd passo=2 compensar-criar-usuario -> ms.auth.cmd (sem esperar resposta)
2026-11-10T20:20:44.385-03:00 INFO sagaId=2e6cc9fa-dc1d-4c0e-9fa4-3b9c2b42d1fd passo=1 compensar-inserir-gerente -> ms.gerente.cmd
2026-11-10T20:20:44.406-03:00 INFO sagaId=2e6cc9fa-dc1d-4c0e-9fa4-3b9c2b42d1fd passo=1 compensar-inserir-gerente status=SUCESSO erro=null
2026-11-10T20:20:44.410-03:00 WARN sagaId=2e6cc9fa-dc1d-4c0e-9fa4-3b9c2b42d1fd tipo=inserir-gerente COMPENSADA: Não foi possível concluir a operação agora. Tente novamente em alguns instantes.
2026-11-10T20:21:00.781-03:00 INFO sagaId=2e6cc9fa-dc1d-4c0e-9fa4-3b9c2b42d1fd tipo=criar-usuario na DLQ fora do passo corrente, ignorada
2026-11-10T20:21:00.790-03:00 INFO sagaId=2e6cc9fa-dc1d-4c0e-9fa4-3b9c2b42d1fd tipo=compensar-criar-usuario resposta fora do passo corrente, ignorada

### contagens no log dessa SAGA
notificações de falha técnica (timeout + DLQ): 2
inícios de compensação ('FALHA no passo'): 1
compensar-inserir-gerente publicados: 1

### DEPOIS (20:21:04.134)
gerentes (cpf | nome | ativo):
40501740066 | Gadamântio | t
98574307084 | Geniéve | t
64065268052 | Godophredo | t
23862179060 | Gyândula | t
usuarios no MS Auth (Mongo): 9  | com cpf 11122233344: 0
{"fila":"ms.auth.cmd","mensagens":0,"consumidores":1}
{"fila":"ms.auth.cmd.dlq","mensagens":0,"consumidores":1}
```

**Como ler:**

- 1ª notificação: `timeout de 30 s no passo 2 (criar-usuario)` às
  `20:20:44.382` → **um** `FALHA no passo 2 … compensando [1]` → **um**
  `compensar-inserir-gerente` → `COMPENSADA` às `20:20:44.410`.
- 2ª notificação: a mesma mensagem chega da DLQ às `20:21:00.781` — e o log
  diz `criar-usuario na DLQ fora do passo corrente, ignorada`. A SAGA já não
  espera esse passo, então nada é refeito.
- As contagens no fim fecham: **2 notificações, 1 compensação**.
- No "DEPOIS", banco igual ao "ANTES".

## Cenário 5 — DLQ de eventos: fica parada, não compensa, e o reprocessamento não duplica (10/11)

A DLQ de eventos (`ms.conta.events.dlq`) é a única das cinco que **ninguém
consome automaticamente**: evento da projeção do CQRS não é passo de SAGA,
então não há o que compensar — e reenfileirar sozinho faria uma mensagem
venenosa entrar em loop (ver `tools/RESILIENCIA.md`, "Por que a reinjeção é
manual"). O reprocessamento é manual, pelo `tools/dlq.sh`.

**Passo a passo:** `/reboot` → publicar um JSON quebrado em
`ms.conta.events` (console do RabbitMQ: Exchanges → (AMQP default) → Publish
message, routing key `ms.conta.events`, payload `{"isto": "nao e um evento"`)
→ esperar ~15 s → `tools/dlq.sh listar` e `tools/dlq.sh ver
ms.conta.events.dlq` → conferir o banco.

### (a) o evento malformado cai e fica na DLQ

```
{"status":"ok","clientes":5,"gerentes":4,"contas":5}
### ANTES (20:21:24.319)
movimentacoes: 17  | saldo 1291: 800.0000  | ultima_versao 1291: 8
DLQ                       MENSAGENS
ms.conta.events.dlq               0

### evento malformado publicado em ms.conta.events (20:21:25.048)
{"routed":true}
### chegou na DLQ (20:21:44.535)

### log do ms-conta
2026-11-10T20:21:40.119-03:00  WARN 1 --- [ms-conta] [ntContainer#1-1] o.s.a.r.r.RejectAndDontRequeueRecoverer  : Retries exhausted for message (Body:'[B@254eb043(byte[26
Caused by: tools.jackson.core.exc.UnexpectedEndOfInputException: Unexpected end-of-input: expected close marker for Object (start marker at [Source: REDACTED (`StreamRead
Caused by: tools.jackson.core.exc.UnexpectedEndOfInputException: Unexpected end-of-input: expected close marker for Object (start marker at [Source: REDACTED (`StreamRead

DLQ                       MENSAGENS
ms.conta.events.dlq               1

### dlq.sh ver ms.conta.events.dlq
{
  "routing_key": "ms.conta.events.dlq",
  "redelivered": true,
  "payload": "{\"isto\": \"nao e um evento\"",
  "payload_encoding": "string",
  "properties": {
    "headers": {
      "x-death": [
        {
          "count": 1,
          "exchange": "",
          "queue": "ms.conta.events",
          "reason": "rejected",
          "routing-keys": [
            "ms.conta.events"
          ],
          "time": 1794352900
        }
      ],
      "x-first-death-exchange": "",
      "x-first-death-queue": "ms.conta.events",
      "x-first-death-reason": "rejected",
      "x-last-death-exchange": "",
      "x-last-death-queue": "ms.conta.events",
      "x-last-death-reason": "rejected"
    }
  }
}

(mensagem espiada com reject_requeue_true — ela continua na fila, a contagem não muda)

### alguma SAGA/compensação disparou? linhas do orquestrador desde o evento: 0
### DEPOIS do evento malformado
movimentacoes: 17  | saldo 1291: 800.0000  | ultima_versao 1291: 8
```

O `ms-conta` tenta 4 vezes e desiste às `20:21:40.119` (15,1 s depois da
publicação); a mensagem **fica parada** na DLQ — é o cenário em que o console
do RabbitMQ mostra mensagem na DLQ. O cabeçalho `x-death` registra de onde
ela veio e por quê (`rejected`). Nenhuma linha no Orquestrador, e as 17
movimentações, o saldo e a versão da conta 1291 não mudaram.

### (b) e (c) reinjetar o veneno e reprocessar um evento legítimo

```
### (b) reinjetar o evento venenoso sem corrigir nada (20:22:06.165)
  [OK] reinjetada em 'ms.conta.events'
Reinjetadas: 1 de 1 solicitadas.
### falhou de novo e voltou (20:22:22.018); x-death da mensagem: [{"queue":"ms.conta.events","count":2}]
DLQ                       MENSAGENS
ms.conta.events.dlq               1
movimentacoes: 17  | saldo 1291: 800.0000  | ultima_versao 1291: 8

### descartar o veneno: dlq.sh purgar (20:22:28.751)
Vai APAGAR todas as mensagens de 'ms.conta.events.dlq'. Isso não pode ser desfeito.
Fila 'ms.conta.events.dlq' purgada.

### (c) reprocessar um evento legítimo: cópia do evento 2 (Depósito de 1000.00 na 1291, versão 2), já aplicado
evento: {"id" : 2, "objetoId" : "1291", "tipo" : "Depósito", "payload" : {"valor": "1000.00"}, "versao" : 2, "timestamp" : "2020-01-01T10:00:00"}
movimentacao do evento 2: 1
{"routed":true}
DLQ                       MENSAGENS
ms.conta.events.dlq               1
### dlq.sh reinjetar (20:22:35.315)
  [OK] reinjetada em 'ms.conta.events'
Reinjetadas: 1 de 1 solicitadas.

### DEPOIS (20:22:43.487)
DLQ                       MENSAGENS
ms.conta.events.dlq               1
movimentacoes: 17  | saldo 1291: 800.0000  | ultima_versao 1291: 8
movimentacao do evento 2: 1  (continua 1: a projeção é idempotente)
falhas no ms-conta depois do reprocessamento: 0
linhas do orquestrador desde o início do cenário 5: 0  (nenhuma SAGA, nenhuma compensação)

### rechecado 20s depois (20:23:02.287) — a contagem "1" acima era o atraso de ~5 s das estatísticas da Management API
ms.conta.events.dlq               0
```

**Como ler:**

- **(b)** Reinjetar o evento venenoso **sem corrigir a causa** só o faz falhar
  de novo e voltar para a DLQ — o `x-death` passa a `count: 2`. É a prova
  prática de por que a reinjeção é manual e vem **depois** de entender a
  causa: automática, ela giraria para sempre. Um evento que não tem conserto
  se descarta com `dlq.sh purgar`.
- **(c)** Para mostrar o reprocessamento que deve acontecer de verdade,
  colocamos na DLQ uma cópia do evento 2, já aplicado ao read model, e
  reinjetamos pelo `dlq.sh`. O `ms-conta` consome sem erro, e a movimentação
  do evento 2 continua **uma só**, com as 17 no total: a projeção é
  idempotente por `evento_id`. É o mesmo ensaio que a Dani registrou pelo
  console em `PASSO-A-PASSO-REPROCESSAMENTO-MANUAL.md`, aqui pelo `dlq.sh`.
- O `dlq.sh listar` mostrou "1" logo depois da reinjeção e "0" 20 s depois: as
  estatísticas da Management API atualizam a cada ~5 s. Não reinjete de novo
  por causa disso (duplicaria a mensagem na fila original).

## Reprodutibilidade e tempo

Segunda execução dos cenários 3 e 4, logo depois da primeira, com `/reboot`
entre elas:

```
cenário 3, 2ª execução: job FALHA em 16,4 s | inicios de compensação: 1 | via DLQ: 1 | gerentes: 4 | usuários: 9
cenário 4, 2ª execução: 50,0 s até a 2ª notificação | notificações: 2 | inicios de compensação: 1 | compensar-inserir-gerente: 1 | ignorada: 1 | gerentes: 4 | usuários: 9
```

| Cenário | Duração da falha | Tempo de ensaio (com `/reboot` e conferências) |
|---|---|---|
| 3 | ~16 s até o job `FALHA` | ~25 s |
| 4 | ~50 s até a 2ª notificação | ~60 s |
| 5 | ~15 s por ida à DLQ | ~2 min (com reinjeção e reprocessamento) |

## Ainda pendente

- **Print da caixa de entrada:** o cenário C prova que o Gmail aceitou os
  dois e-mails (`resultado=ENVIADO`) e que a senha gerada loga. Falta o print
  dos dois na caixa da equipe (destinos `+r9` e `+r9b`, 27/10 às 23:08 e às
  23:10), que é a parte da evidência que só se tira com a caixa aberta.

## Histórico

O R9 ficou bloqueado de 13/10 a 26/10: o `ms-cliente` não tratava
`aprovar-solicitacao` nem `criar-cliente`, e toda aprovação falhava no
passo 1. Foi o teste de R9 da bateria (`tools/verificar/04-requisitos.sh`)
que pegou; corrigido na `main` em 26/10 (`5245b25`, PR #86). Enquanto isso,
os cenários 1 e 2 foram feitos na SAGA do R13, e ficam aqui como evidência
complementar.
