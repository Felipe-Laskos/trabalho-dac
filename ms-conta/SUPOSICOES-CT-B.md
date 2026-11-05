# Suposição CT-B — precisão e arredondamento

O PostgreSQL armazena `salario`, `saldo`, `valor` e `saldo_apos` como
`NUMERIC(19,4)`. O MS Conta calcula e reproduz eventos com `BigDecimal`, sem
converter valores monetários para `double` ou `float`. O replay usa o event
store como fonte da verdade; divergência com o read model indica defeito na
projeção.

Na borda HTTP, valores monetários são strings com exatamente duas casas
decimais. Quando um valor persistido tem mais de duas casas, a apresentação
usa `RoundingMode.HALF_UP`: por exemplo, `1.2349` sai como `"1.23"` e
`1.2350` como `"1.24"`. Essa escolha equivale ao arredondamento aritmético
usual nos empates e não altera o valor guardado nem o cálculo do replay.

Novas operações de depósito, saque e transferência aceitam no máximo duas
casas decimais. Portanto, o arredondamento de quatro para duas casas é uma
regra de apresentação para saldos e dados históricos, não uma forma de
aceitar entradas com precisão maior que a contratada.

## Concorrência e limite monetário

Depósito, saque e transferência repetem a transação até quatro vezes quando
há conflito de versão no event store. Entre tentativas, esperam um tempo
aleatório de 10 a 50 ms; cada tentativa refaz o replay e revalida o saldo.
Falhas de validação não são repetidas como conflitos de versão.

Como `NUMERIC(19,4)` comporta no máximo 15 dígitos inteiros, o MS Conta
recusa com HTTP 422 valores acima de `999999999999999.9999` e créditos que
façam o saldo ultrapassar esse teto. A verificação ocorre antes de persistir
o evento, inclusive para depósitos e transferências recebidas. Um valor
individual dentro do teto também é recusado quando a soma com o saldo atual
excede o limite. Isso evita eventos que não poderiam ser aplicados ao read
model e impediriam a projeção dos eventos seguintes.

## Extrato

Sem datas informadas, o extrato usa a data atual do fuso padrão do processo
como fim e os 29 dias anteriores como início, cobrindo 30 dias corridos
incluindo as duas pontas. Datas explícitas podem abranger no máximo 365 dias
de diferença entre início e fim; um intervalo de 366 dias é recusado. O saldo
de abertura vem da última movimentação anterior ao início. Movimentações
com o mesmo instante são ordenadas pelo menor ID.

## Gerentes, contas e compensação

Ao escolher o gerente com menos clientes, empate na quantidade de contas é
resolvido pelo menor CPF. Na escolha de uma conta para um gerente novo, o MS
Conta considera os gerentes com mais contas, depois o menor saldo total e o
menor CPF; dentro do gerente escolhido, seleciona a conta de menor saldo e,
em empate, a de menor número.

Compensar a criação de uma conta só é automático quando sua história contém
apenas o evento `Criado`. A compensação acrescenta `CriacaoCompensada` na
versão 2, preservando a trilha no event store. A projeção remove a conta e
suas movimentações do read model e impede que mensagens atrasadas a recriem.

Os eventos `GerenteAlterado` produzidos por atribuição, transferência em lote
e reversão carregam `sagaId` no payload. Esse identificador liga a mudança à
SAGA que a causou e permite conferir a origem da decisão na trilha de eventos.
