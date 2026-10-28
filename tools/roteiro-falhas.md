# Roteiro de falhas

Evidência gravada de que as SAGAs compensam de verdade quando algo falha no
meio, e de que uma falha de e-mail nunca trava nem aborta uma SAGA —
material direto da defesa. Cada cenário traz o estado dos bancos **antes**,
**no meio** e **depois**, mais o log do Orquestrador com timestamps.

| Cenário | SAGA | O que prova | Quem / quando |
|---|---|---|---|
| R9-A | Aprovar cliente | Gmail fora do ar: a SAGA conclui, o e-mail só não sai, e a senha não vaza no log | Nathaly, 27/10 |
| R9-B | Aprovar cliente | MS Conta fora antes do passo 6: compensação em ordem inversa `[5, 4, 1]`, e-mail de "não efetuada", e o passo incerto desfeito sem deixar conta órfã | Nathaly, 27/10 |
| R13-1 | Inserir gerente | MS Conta fora no passo 3: compensação `[2, 1]` | Nathaly, 20/10 |
| R13-2 | Inserir gerente | Timeout de passo com três compensações `[4, 2, 1]`, devolvendo a conta reatribuída | Nathaly, 20/10 |
| R15 | Remover gerente | Logout forçado com duas sessões e recusa do último gerente ativo | Felipe, 20/10 |

Ainda falta um item, que depende de credencial: **o e-mail chegando de
verdade na caixa e a senha logando** (ver "Ainda pendente", no fim).

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
curl -s -X POST localhost:8000/solicitacoes/<cpf>/aprovacao -H "x-access-token: $TOK"
docker compose logs -f ms-orquestrador | grep -m1 "passo=4 criar-cliente SUCESSO"
docker pause trabalho-dac-ms-conta-1 && docker unpause trabalho-dac-ms-auth-1
# ~35 s depois: GET /jobs/<jobId>/status -> FALHA; então:
docker unpause trabalho-dac-ms-conta-1
```

Atenção à ordem: pausar o MS Auth **antes** do login faz o login falhar
(ele passa pelo MS Auth), e nenhuma SAGA chega a começar.

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

**Limpeza depois de um cenário:** o comando que ficou sem consumidor continua
na fila — antes de religar o serviço parado, esvazie-a
(`curl -u guest:guest -X DELETE http://localhost:15672/api/queues/%2f/ms.conta.cmd/contents`,
ou `ms.cliente.cmd`), senão o serviço processa a mensagem velha ao voltar.

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

## Ainda pendente

- **E-mail real chegando e a senha logando:** precisa de `GMAIL_USER` e
  `GMAIL_APP_PASSWORD` de verdade no `.env`. Os cenários R9-A e R9-B já
  provam tudo o que não depende de caixa de entrada (SAGA conclui sem o
  e-mail, compensação, e-mail de "não efetuada" publicado). Com a
  credencial: aprovar um cliente, conferir que o e-mail chega com a senha, e
  que `POST /login` com ela devolve 200.

## Histórico

O R9 ficou bloqueado de 13/10 a 26/10: o `ms-cliente` não tratava
`aprovar-solicitacao` nem `criar-cliente`, e toda aprovação falhava no
passo 1. Foi o teste de R9 da bateria (`tools/verificar/04-requisitos.sh`)
que pegou; corrigido na `main` em 26/10 (`5245b25`, PR #86). Enquanto isso,
os cenários 1 e 2 foram feitos na SAGA do R13, e ficam aqui como evidência
complementar.
