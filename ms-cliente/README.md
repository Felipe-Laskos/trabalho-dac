# Microsserviço de Cliente (Bantads)

Microsserviço responsável pelo domínio de clientes e solicitações, operando com arquitetura orientada a eventos e padrão Saga Orquestrada no ecossistema Bantads.

## Comandos Aceitos pelo MS Cliente

Este microsserviço consome mensagens da fila de comandos (`ms.cliente.cmd`) e publica as respostas na fila do orquestrador (`orquestrador.reply`). Abaixo estão os tipos de comandos (`cmd.tipo()`) suportados por este serviço:

| Tipo de Comando (`cmd.tipo()`) | Descrição / Ação Executada | Fila de Entrada | Resposta Gerada |
| :--- | :--- | :--- | :--- |
| `obter-clientes-por-cpf` | Busca e retorna os dados resumidos de uma lista de CPFs fornecida no payload. | `ms.cliente.cmd` | `SUCESSO` (com a lista de clientes) ou `FALHA` |
| `aprovar-solicitacao` | Altera o status de uma solicitação pendente para aprovada. | `ms.cliente.cmd` | `SUCESSO` (com dados do cliente) ou `FALHA` |
| `compensar-aprovar-solicitacao` | Reverte a aprovação da solicitação em caso de falha na Saga (Rollback), devolvendo-a para pendente ou recusada. | `ms.cliente.cmd` | `SUCESSO` ou `FALHA` |
| `criar-cliente` | Efetiva a criação do cadastro do cliente na base definitiva a partir de uma solicitação aprovada. | `ms.cliente.cmd` | `SUCESSO` ou `FALHA` |
| `compensar-criar-cliente` | Remove o cliente recém-criado da base caso a Saga precise ser desfeita (Rollback). | `ms.cliente.cmd` | `SUCESSO` ou `FALHA` |

## Resiliência e Idempotência (Reentrega)

O sistema foi desenhado para garantir resiliência contra falhas transitórias e efeito único (idempotência):

1. **Retentativa e DLQ:** erro de negócio vira resposta `FALHA` ao Orquestrador. Erro que escapa do listener é retentado 3 vezes pelo próprio serviço, a cada 5 s, e depois a mensagem vai para a DLQ, que o Orquestrador escuta para iniciar a compensação.
2. **Idempotência:** Para evitar efeitos colaterais duplicados em caso de mensagens reentregadas, o serviço utiliza uma tabela de controle de comandos processados (`comandos_processados`), validando a chave composta baseada no **`sagaId`** e no **`tipo`** do comando. Se a mensagem chegar duplicada, o processamento de negócio é ignorado e o resultado anterior é retornado com segurança.

## Endpoints Administrativos (/admin/seed)

O microsserviço disponibiliza um endpoint de seed para inicialização e testes de ambiente:

* **`POST /admin/seed`**: Limpa a base de dados do serviço **incluindo a tabela de comandos processados (`comandos_processados`)**, recriando os dados iniciais padrão. A limpeza da tabela de comandos processados durante o seed evita falsos positivos de idempotência ao reaproveitar IDs de saga em novos testes de reinicialização (`/reboot`).