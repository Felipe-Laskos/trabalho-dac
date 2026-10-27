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
