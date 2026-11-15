# BANTADS

Trabalho final da disciplina **DS152, Desenvolvimento de Aplicações Corporativas**, do curso de
Tecnologia em Análise e Desenvolvimento de Sistemas da Universidade Federal do Paraná, no semestre
2026/2, com o professor Razer Anthom Nizer Rojas Montaño.

O BANTADS é um internet banking construído em microsserviços. O cliente pede a abertura da conta
pelo autocadastro, um gerente aprova ou rejeita o pedido e, com a conta aprovada, o cliente faz
depósitos, saques e transferências e consulta o extrato. Os gerentes acompanham as solicitações e
os clientes da sua carteira, e o cadastro de gerentes redistribui as contas sempre que um gerente
entra ou sai.

## Equipe

| GRR | Nome |
|---|---|
| GRR20241326 | Felipe Matheus Laskos |
| GRR20241565 | Daniela Tamy Yuki |
| GRR20243748 | Laura Klemba Cordeiro |
| GRR20245377 | Nathalia Lyra Varela Albuquerque |
| GRR20210543 | Davi Ferreira Colares |
| GRR20223387 | Nathaly Martins da Cunha |

## O que o sistema faz

O sistema tem dois perfis de acesso, cliente e gerente.

- **Cliente:** autocadastro (R1), login e logout (R2), tela inicial com o saldo (R3), depósito
  (R4), saque (R5), transferência (R6) e extrato por período (R7).
- **Gerente:** tela inicial com as solicitações pendentes (R8), aprovação (R9) e rejeição (R10) de
  clientes, consulta de todos os clientes (R11), cadastro de gerentes com listagem, inserção,
  atualização e remoção (R12 a R15) e relatório de clientes (R16).

A aprovação de cliente (R9), a inserção de gerente (R13) e a remoção de gerente (R15) envolvem
mais de um serviço e são executadas como SAGAs orquestradas, com compensação quando algum passo
falha.

## Arquitetura

O front-end conversa apenas com o API Gateway, que é o único ponto de entrada do sistema. Atrás
dele ficam seis microsserviços, cada um com o seu próprio banco ou schema:

| Serviço | Responsabilidade | Banco |
|---|---|---|
| `gateway` | Ponto único de acesso, autenticação JWT, sessões, cache e API Compositions | Redis |
| `ms-auth` | Usuários, senhas (hash Argon2) e login | MongoDB |
| `ms-cliente` | Clientes e solicitações de autocadastro | PostgreSQL, schema `cliente` |
| `ms-gerente` | Gerentes | PostgreSQL, schema `gerente` |
| `ms-conta` | Contas e movimentações, com CQRS e Event Sourcing | PostgreSQL, schemas `conta_command` e `conta_query` |
| `ms-orquestrador` | SAGAs de R9, R13 e R15 e jobs assíncronos | Redis |
| `ms-email` | Envio dos e-mails do sistema | sem banco |

Os padrões aplicados são API Gateway, Database per Service (schema-per-service no PostgreSQL),
CQRS com Event Sourcing no MS Conta, SAGA orquestrada e API Composition. O Gateway chama os
serviços por REST; os passos das SAGAs, a sincronização entre os dois lados do CQRS e os e-mails
passam por filas do RabbitMQ. Cada serviço roda em um
contêiner próprio, assim como PostgreSQL, MongoDB, Redis e RabbitMQ: são 12 contêineres no total.

## Tecnologias

- Front-end: Angular 21 com PrimeNG
- API Gateway: Node.js 24 com Express 5
- Microsserviços: Spring Boot 4.1 sobre Java 21
- Bancos: PostgreSQL 16, MongoDB 7 e Redis 7
- Mensageria: RabbitMQ 3
- Infraestrutura: Docker e Docker Compose

## Como executar

Pré-requisito: Docker com o Compose v2 (no Windows, o Docker Desktop aberto).

1. Copie o arquivo de exemplo e preencha os segredos:

   ```bash
   cp .env.example .env
   ```

   | Variável | O que colocar |
   |---|---|
   | `DB_PASS` | Senha do PostgreSQL |
   | `SECRET` | Chave de assinatura do JWT |
   | `GMAIL_USER` | Conta do Gmail usada pelo MS Email |
   | `GMAIL_APP_PASSWORD` | Senha de aplicativo dessa conta |

2. Suba a frota:

   ```bash
   ./start.sh
   ```

   No Windows, pelo PowerShell:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\start-windows.ps1
   ```

   O script faz o build das imagens, sobe os contêineres e espera todos ficarem saudáveis.

3. Acesse:

   | Endereço | O quê |
   |---|---|
   | http://localhost:4200 | Front-end |
   | http://localhost:8000/health | API Gateway |
   | http://localhost:15672 | Console do RabbitMQ (`guest` / `guest`) |

   PostgreSQL, MongoDB e Redis não publicam porta no host; ficam acessíveis só pela rede interna
   do Compose.

## Dados iniciais

Os scripts de criação e de carga dos bancos ficam em `scripts/sql` (PostgreSQL) e `scripts/mongo`
(MongoDB) e rodam na primeira subida dos contêineres. A rota `POST /reboot` do Gateway devolve
todos os bancos a esse estado inicial.

Todos os usuários do seed usam a senha `tads`:

| Perfil | E-mails |
|---|---|
| Cliente | `cli1@bantads.com.br` a `cli5@bantads.com.br` |
| Gerente | `ger1@bantads.com.br` a `ger4@bantads.com.br` |

## Estrutura do repositório

| Pasta | Conteúdo |
|---|---|
| `frontend/` | Aplicação Angular |
| `gateway/` | API Gateway em Node.js |
| `ms-*/` | Microsserviços Spring Boot |
| `scripts/` | Criação e carga inicial dos bancos |
| `config/` | Configuração do RabbitMQ |
| `tools/` | Bateria de verificação, roteiro de falhas, reprocessamento de DLQ e o script que monta o ZIP de entrega |
| `docker-compose.yml`, `start.sh`, `start-windows.ps1` | Construção e execução da frota |
