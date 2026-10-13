# Roteiro de falhas — MS Email em produção (R9)

Evidência de que a SAGA R9 (Aprovar Cliente) compensa de verdade quando algo
falha no meio, e de que uma falha no envio de e-mail (passo 7, fire-and-
forget) nunca trava nem aborta a SAGA — tarefa S7.

## Status: bloqueado antes da primeira evidência

**13/10/2026.** Ao estender `tools/verificar/04-requisitos.sh` pra testar
R9 de ponta a ponta (login do gerente → `POST
/solicitacoes/{cpf}/aprovacao` → polling de `GET /jobs/{jobId}/status` até
`CONCLUIDO`), o teste achou que a SAGA **falha sempre no passo 1**, pra
qualquer aprovação:

```
POST /solicitacoes/66666666666/aprovacao -> 202, jobId=8810ac06-...

GET /jobs/8810ac06-.../status (depois de ~5s):
{
  "jobId": "8810ac06-a05e-4c9f-af4b-1ac7199e45e0",
  "status": "FALHA",
  "resultType": null,
  "dominio": "clientes",
  "resourceId": null,
  "erro": "Comando não suportado pelo MS Cliente: aprovar-solicitacao"
}
```

### Causa raiz (confirmada, não é suposição)

`ms-cliente/.../messaging/listener/ClienteSagaListener.java` só trata um
tipo de comando:

```java
ResultadoSaga resultado = switch (cmd.tipo()) {
    case "obter-clientes-por-cpf" -> clientePorCpf(cmd);
    default -> command.registrarFalha(cmd, "Comando não suportado pelo MS Cliente: " + cmd.tipo());
};
```

`obter-clientes-por-cpf` é o comando do R13 (SAGA #2, Inserção de Gerente).
Os comandos que o **passo 1** (`aprovar-solicitacao`) e o **passo 4**
(`criar-cliente`) da SAGA R9 mandam — junto das suas compensações
(`compensar-aprovar-solicitacao`, `compensar-criar-cliente`) — nunca foram
implementados em `ClienteService`/`ClienteSagaListener`. Não é regressão
de nada que mudei: `git log` no listener mostra só commits sobre
`obter-cliente-por-cpf`; os métodos pro R9 simplesmente não existem no
serviço.

Isso trava **toda** a S7, não só uma parte dela: sem o passo 1 passar, a
SAGA nunca chega nos passos 4-7 (criar cliente, criar usuário com senha,
criar conta, mandar o e-mail) — não dá pra demonstrar compensação real nem
e-mail chegando enquanto isso não for corrigido. É área do Nath (listeners
de `ms.cliente.cmd`), não minha — reportado a ele, não corrigido aqui, pra
não pisar no trabalho dele em andamento (SAGA #2) sem combinar.

### O que já está pronto, esperando o bloqueio cair

- `tools/verificar/04-requisitos.sh` já cobre R9 de ponta a ponta (login
  do gerente, `POST .../aprovacao`, polling do job) — é esse teste que
  pegou o bug acima. Quando `ms-cliente` tratar `aprovar-solicitacao` e
  `criar-cliente`, essa parte da bateria deve virar verde sozinha.
- O passo 7 (e-mail) já é fire-and-forget no `SagaAprovarCliente.java` —
  não espera resposta do MS Email, então não deveria travar a SAGA mesmo
  sem Gmail configurado. Isso ainda precisa ser confirmado ao vivo depois
  que o passo 1 for destravado (ver "Cenário 2" abaixo).

### Bloqueio adicional, independente deste: credencial do Gmail

`GMAIL_USER`/`GMAIL_APP_PASSWORD` estão vazios no `.env` — mesmo com a
SAGA completa funcionando, não dá pra provar "e-mail real chega e a senha
loga" (Cenário 1) sem uma credencial de verdade. Os outros dois cenários
não precisam dela.

## Os dois cenários (a fazer, nesta ordem, assim que o passo 1 for corrigido)

### Cenário 1 — compensação real (não precisa de Gmail real)

1. Aprovar uma solicitação de teste.
2. Derrubar o `ms-conta` (`docker compose stop ms-conta`) antes do passo 6
   (criar conta) completar — ou mockar uma falha ali.
3. Confirmar: a solicitação volta pra `PENDENTE`, o cliente criado no passo
   4 e o usuário criado no passo 5 somem (compensações rodam em ordem
   inversa), e uma mensagem `email.solicitacao-nao-efetuada` é publicada em
   `ms.email.cmd` (visível no console do RabbitMQ ou no log do
   `ms-orquestrador`) — não precisa da credencial real do Gmail pra provar
   que a compensação em si funcionou, só pra confirmar que o e-mail de fato
   chegou na caixa.

### Cenário 2 — Gmail fora do ar não trava a SAGA (não precisa de Gmail real)

Com `GMAIL_USER`/`GMAIL_APP_PASSWORD` vazios (como estão hoje), o envio no
passo 7 vai falhar ao autenticar no SMTP — é literalmente o cenário "Gmail
fora do ar" sem precisar derrubar rede de verdade. Confirmar: o job termina
`CONCLUIDO` (passo 7 é fire-and-forget, não espera o MS Email) e
`docker logs ms-email` não contém a senha em nenhum momento, só o erro de
autenticação.

### Cenário 3 (antigo "Cenário 1" do roadmap) — e-mail real chega e a senha loga

Precisa de `GMAIL_USER`/`GMAIL_APP_PASSWORD` reais no `.env`. Aprovar um
cliente de teste, confirmar que o e-mail chega na caixa de verdade com uma
senha, e que essa senha loga (`POST /login`). Only depois disso dá pra
marcar a S7 como concluída de verdade.
