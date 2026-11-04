# Microsserviço de Gerente (Bantads)

Microsserviço responsável pelo domínio de gerentes, operando com arquitetura orientada a eventos e padrão Saga Orquestrada no ecossistema Bantads.


## Comandos Aceitos pelo MS Gerente

Este microsserviço consome mensagens da fila de comandos (`ms.gerente.cmd`) e publica as respostas na fila do orquestrador (`orquestrador.reply`). Abaixo estão os tipos de comandos (`cmd.tipo()`) suportados por este serviço:

| Tipo de Comando (`cmd.tipo()`) | Descrição / Ação Executada | Fila de Entrada | Resposta Gerada |
| :--- | :--- | :--- | :--- |
| `inserir-gerente` | Cadastra um novo gerente no sistema a partir dos dados fornecidos no payload. | `ms.gerente.cmd` | `SUCESSO` (com CPF) ou `FALHA` |
| `compensar-inserir-gerente` | Remove o gerente inserido caso a Saga precise ser desfeita (Rollback). | `ms.gerente.cmd` | `SUCESSO` ou `FALHA` |
| `listar-ativos` | Retorna uma lista com os CPFs e nomes de todos os gerentes ativos no sistema. | `ms.gerente.cmd` | `SUCESSO` (com lista de ativos) ou `FALHA` |
| `inativar-gerente` | Altera o status de um gerente para inativo no sistema. | `ms.gerente.cmd` | `SUCESSO` (com CPF) ou `FALHA` |
| `compensar-inativar-gerente` | Reativa o gerente anteriormente inativado em caso de compensação da Saga (Rollback). | `ms.gerente.cmd` | `SUCESSO` ou `FALHA` |

## Resiliência e Idempotência (Reentrega)

O sistema foi desenhado para garantir resiliência contra falhas transitórias e efeito único (idempotência):

1. **Reentrega (Retry):** Caso ocorra um erro de infraestrutura ou banco de dados durante o consumo de uma mensagem, o listener lança uma exceção controlada, instruindo o broker (RabbitMQ) a realizar a reentrega (*redelivery*).
2. **Idempotência:** Para evitar efeitos colaterais duplicados em caso de mensagens reentregadas, o serviço utiliza uma tabela de controle de comandos processados (`comandos_processados`), validando a chave composta baseada no `sagaId` e no `tipo` do comando. Se a mensagem chegar duplicada, o processamento de negócio é ignorado e o resultado anterior é retornado com segurança.


## Endpoints Administrativos (/admin/seed)

O microsserviço disponibiliza um endpoint de seed para inicialização e testes de ambiente:

* **`POST /admin/seed`**: Limpa a base de dados do serviço incluindo a tabela de comandos processados (`comandos_processados`), recriando os dados iniciais padrão. A limpeza da tabela de comandos processados durante o seed evita falsos positivos de idempotência ao reaproveitar IDs de saga em novos testes de reinicialização (`/reboot`).