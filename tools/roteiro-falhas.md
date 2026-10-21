# Roteiro de falhas

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
