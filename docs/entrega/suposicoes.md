# BANTADS: suposições da equipe

<p class="subtitulo">DS152 Desenvolvimento de Aplicações Corporativas · TADS/UFPR · 2026/2<br>
Prof. Razer Anthom Nizer Rojas Montaño<br>
Felipe Matheus Laskos, Daniela Tamy Yuki, Laura Klemba Cordeiro, Nathalia Lyra Varela Albuquerque,
Davi Ferreira Colares e Nathaly Martins da Cunha</p>

O enunciado pede que toda suposição não definida nele seja documentada em PDF junto com o trabalho.
Este documento reúne as decisões que a equipe tomou onde o enunciado é omisso ou admite mais de uma
leitura. Os itens estão agrupados por assunto e numerados em sequência.

## Arquitetura e infraestrutura

**1. MS Conta como um serviço com dois schemas.** O CQRS do MS Conta usa dois schemas no mesmo
PostgreSQL, `conta_command` (event store) e `conta_query` (read model), dentro de um único serviço com
dois DataSources. Os dois lados conversam apenas pela fila `ms.conta.events`. Entendemos os "dois
bancos" do enunciado como dois schemas isolados, coerente com o schema-per-service pedido na
arquitetura.

**2. MS Email em contêiner próprio.** O enunciado permite fundir o MS Email no Orquestrador em
máquinas com pouca memória. Mantivemos os sete serviços separados, cada um em seu contêiner, o que dá
12 contêineres no total.

**3. Isolamento dos schemas.** Cada serviço acessa somente o próprio schema, e nenhum script ou
consulta de um serviço referencia o schema de outro. Todos se conectam ao PostgreSQL com o mesmo
usuário; o isolamento é feito pela configuração de cada serviço, sem permissões separadas por
schema.

**4. Portas publicadas.** Só ficam acessíveis fora da rede do Compose o API Gateway (8000), o
front-end (4200) e o console do RabbitMQ (15672). Entendemos o "único ponto de acesso" como o ponto
de acesso da API; o front e o console são publicados porque o usuário e a banca precisam deles.

**5. Fuso horário.** Todos os contêineres rodam em `America/Sao_Paulo`, declarado por `TZ` no Compose,
e o PostgreSQL recebe o mesmo fuso por parâmetro de inicialização. Datas e horas trafegam em ISO 8601
sem offset e são interpretadas nesse fuso nas duas pontas. O back lê o fuso do ambiente; o front fixa
`America/Sao_Paulo`, porque o fuso do navegador é do usuário e não do sistema.

**6. Versões.** Angular 21, Node.js 24 no API Gateway, Spring Boot 4.1 com Java 21, PostgreSQL 16,
MongoDB 7, Redis 7 e RabbitMQ 3. O enunciado fixa apenas o Angular 17 como mínimo.

**7. Memória dos contêineres.** Todos têm `mem_limit`. Os serviços Java rodam com
`-XX:MaxRAMPercentage=60`, para que a JVM dimensione o heap pelo limite do contêiner, e não pela
memória da máquina. No RabbitMQ, o limite de memória é fixo em 307 MiB (60% do limite do contêiner),
em vez do valor relativo 0.6, porque o RabbitMQ não enxerga o limite do contêiner e calcularia 60% da
memória da máquina.

**8. Rede e volumes.** A rede do Compose é uma bridge dedicada, sem `internal: true`, porque o MS
Email precisa alcançar o SMTP do Gmail e as portas publicadas precisam funcionar. Só PostgreSQL e
MongoDB têm volume; Redis e RabbitMQ guardam dados de vida curta (sessões, cache, jobs e mensagens
em trânsito) e ficam sem volume. Nenhuma porta de banco é publicada no host.

**9. Health dos serviços acionados por mensageria.** O Orquestrador e o MS Email só recebem trabalho
pelo RabbitMQ, mas expõem `GET /health` por HTTP, usado apenas pelo healthcheck do Docker.

## Autenticação, sessão e autorização

**10. Senhas.** As senhas são guardadas com Argon2id, com memória de 16 MB, 2 iterações e paralelismo 1,
os mesmos parâmetros usados nos hashes do seed. A senha gerada na aprovação do cliente (R9) tem 8
caracteres, sorteados com `SecureRandom` de um alfabeto sem caracteres que se confundem na leitura.

**11. Token JWT.** O token leva o CPF, o perfil e um identificador único (`jti`), é assinado pelo
Gateway com HS256 e vale 8 horas. A expiração é absoluta: o token não é renovado.

**12. Sessão no Redis.** A sessão `sessao:<jti>` guarda o CPF e o perfil e expira em 30 minutos sem uso;
cada requisição renova esse prazo. A chave reversa `sessao:cpf:<cpf>` foi implementada como um
conjunto de `jti`, e não como um valor único, para que o mesmo usuário possa ter mais de uma sessão
aberta. O logout remove só o próprio `jti` do conjunto, e o logout forçado do R15 encerra todas.

**13. Tokens revogados.** Cada token revogado no logout vira uma chave `revogado:<jti>`, com validade
igual ao tempo que ainda faltava para o token expirar.

**14. Onde fica a autorização.** O Gateway confere o perfil de cada rota e a posse nas leituras (o
cliente só lê os próprios dados, o gerente lê qualquer cliente). A posse nas escritas (depósito, saque e
transferência) é conferida pelo MS Conta, a partir do CPF que o Gateway injeta em `X-User-CPF`. A
leitura precisa ficar no Gateway porque o cadastro do cliente é servido do cache e, num acerto de
cache, o microsserviço nem é consultado. O Gateway também descarta qualquer `X-User-*` enviado pelo
navegador antes de processar a requisição.

**15. Respostas de erro da autenticação.** Login sem e-mail ou senha devolve 400, MS Auth fora do ar
devolve 503 e credencial inválida ou usuário inativo devolve 401 com "Login inválido!". CPF ou número de
conta mal formatado na URL devolve 404.

**16. Token no navegador.** O front guarda o token no `localStorage` e o envia no header
`x-access-token`. Nenhum dado do sistema é guardado no navegador além do token e dos dados da sessão.

**17. CORS.** O Gateway aceita requisições de qualquer origem.

## Autocadastro e solicitações (R1, R8, R9, R10)

**18. Validação de CPF.** O CPF é validado só pelo formato, 11 dígitos, sem conferir os dígitos
verificadores. A aplicação de testes usa CPFs gerados aleatoriamente.

**19. CPF que já pediu cadastro.** O CPF é a chave da solicitação. Quem já pediu cadastro não consegue
pedir de novo, mesmo que a solicitação anterior tenha sido recusada.

**20. E-mail repetido.** No autocadastro, o e-mail é comparado com as outras solicitações. Um e-mail
que já pertence a um cliente ou a um gerente passa no autocadastro e é recusado na aprovação: a
solicitação fica como Não aprovada, com o motivo automático "E-mail já cadastrado". Estendemos ao MS
Cliente o caso especial que o enunciado descreve para o MS Auth. O e-mail é comparado do jeito que foi
digitado, sem normalizar maiúsculas e minúsculas.

**21. Formato dos campos do autocadastro.** O formulário exige telefone com 10 ou 11 dígitos, CEP com 8
dígitos, UF de uma lista fixa, número do endereço só com dígitos e salário maior que zero. O back
confere a obrigatoriedade e o tamanho dos campos, e aceita o salário como texto ou como número.

**22. Tela inicial do gerente (R8).** A tabela mostra as solicitações em todos os estados, com um filtro
por estado que começa em "Todas". O motivo da recusa aparece logo abaixo do nome do cliente. Os
clientes do seed não têm solicitação e por isso não aparecem nessa tela. Os estados são gravados como
PENDENTE, APROVADA e NAO_APROVADA e exibidos como Pendente, Aprovada e Não aprovada.

**23. Rejeição (R10).** O motivo é obrigatório e tem até 255 caracteres. Rejeitar uma solicitação que
não está pendente devolve 409. O e-mail com o motivo é publicado pelo próprio MS Cliente na fila do MS
Email, já que a rejeição não é uma SAGA.

**24. Gerente que recebe o cliente (R9).** É o gerente ativo com menos clientes, contados pelas contas
do read model do MS Conta. Gerente sem nenhuma conta conta como zero. No empate, escolhemos o de menor
CPF, para o resultado ser sempre o mesmo.

**25. Número da conta (R9).** São 4 dígitos sorteados entre 0000 e 9999, com zeros à esquerda, como a
conta 0950 do seed. Se o número já existe, inclusive o de uma conta cuja criação foi desfeita, sorteamos
de novo; depois de 20.000 tentativas sem número livre, a aprovação falha.

**26. E-mail de falha da aprovação.** O endereço do cliente chega ao Orquestrador na resposta do
primeiro passo, no MS Cliente. Quando é esse primeiro passo que falha, por exemplo ao aprovar uma
solicitação que já foi processada, o e-mail de "solicitação não efetuada" não é enviado. A partir do
segundo passo, ele é enviado depois das compensações.

## Conta, operações e extrato (R3 a R7)

**27. Valores em dinheiro.** O banco guarda `NUMERIC(19,4)`, o back calcula com `BigDecimal` e o JSON
trafega strings com duas casas decimais. Quando um valor guardado tem mais de duas casas, a saída
arredonda com HALF_UP. Depósitos, saques e transferências aceitam valores maiores que zero com no
máximo duas casas.

**28. Tipos no front.** No front, dinheiro chega e fica guardado como texto e vira `Decimal`
(decimal.js) na hora de calcular. Datas chegam em ISO 8601 e viram `DateTime` (Luxon) na hora de
calcular e de exibir.

**29. Teto de valor.** Como `NUMERIC(19,4)` comporta 15 dígitos inteiros, o MS Conta recusa com 422
qualquer valor acima de 999.999.999.999.999,9999 e qualquer crédito que faria o saldo passar desse
teto. O campo de valor do front aceita até R$ 9.999.999.999,99.

**30. Operações concorrentes.** Em caso de conflito de versão no event store, a operação é repetida
até quatro vezes, com espera aleatória de 10 a 50 ms entre as tentativas. Cada tentativa refaz o
replay e revalida o saldo.

**31. Evento gravado e não publicado.** O evento é gravado no event store e depois publicado em
`ms.conta.events`. Se o RabbitMQ cair entre as duas coisas, o evento continua gravado, a falha vai para
o log e o read model daquela conta é reconstruído manualmente pela rota interna `/admin/reprojetar` do
MS Conta.

**32. Saldo insuficiente e transferência para si mesmo.** Saque ou transferência sem saldo e
transferência para a própria conta devolvem 422.

**33. Data e hora das operações.** A operação é registrada com o horário do servidor, com precisão de
segundo. Na transferência, os eventos de saída e de entrada levam o mesmo horário.

**34. Período do extrato (R7).** Sem datas informadas, o extrato vai de 29 dias antes até hoje, o que
dá 30 dias contando as duas pontas. Com datas informadas, a diferença entre início e fim pode ser de
até 365 dias, e uma data final anterior à inicial devolve 422.

**35. Saldo de abertura do extrato.** É o saldo depois da última movimentação anterior ao início do
período, ou zero se não houver nenhuma. Movimentações no mesmo instante são ordenadas pela ordem em
que foram gravadas.

**36. Exibição do extrato.** As movimentações são agrupadas por dia: a data aparece no cabeçalho do
dia e a hora em cada linha. Todos os dias do período aparecem, inclusive os sem movimentação, sempre
com o saldo do dia. Uma transferência é entrada ou saída conforme o CPF de destino, já que cada
cliente tem uma única conta.

## Gerentes e relatórios (R11 a R16)

**37. Busca de clientes (R11).** A busca é feita no servidor, 400 ms depois que o gerente para de
digitar. Ela encontra um trecho do CPF, digitado só com números, ou um trecho do nome, sem diferenciar
acento nem maiúsculas.

**38. Quantidade de clientes do gerente (R12).** É o número de contas que têm aquele gerente no read
model do MS Conta. O Gateway monta essa contagem na listagem.

**39. Validações da inserção de gerente (R13).** O CPF é validado só pelo formato e o telefone precisa
ter 10 ou 11 dígitos. O e-mail precisa ser único entre os gerentes e os logins do MS Auth.

**40. Conta transferida ao gerente novo (R13).** Sai do gerente com mais contas. No empate, vale o de
menor soma de saldos e, depois, o de menor CPF. Dentro dele, a conta escolhida é a de menor saldo e, no
empate, a de menor número. Se o escolhido tem uma conta só, nada é transferido, e o primeiro gerente
cadastrado fica sem conta. Se a conta mudar de gerente entre a escolha e a transferência, a inserção
inteira falha e é desfeita.

**41. Atualização de gerente (R14).** Só nome e telefone podem ser alterados. CPF e e-mail iguais aos
atuais são aceitos no corpo da requisição; diferentes, devolvem 400. A senha não é alterada por essa
tela.

**42. Remoção de gerente (R15).** O gerente que tenta remover a si mesmo recebe 403 do Gateway, antes de
a SAGA começar. A tentativa de remover o último gerente ativo, ou um gerente inexistente ou já inativo,
termina com o job em FALHA e a mensagem de erro. Os clientes vão para o gerente ativo com menos
clientes, com o mesmo desempate do item 24. Se a consulta dos clientes do gerente removido falhar, a
remoção inteira é desfeita, mas as sessões já encerradas não são restauradas.

**43. Relatório de clientes (R16).** O relatório é montado pelo Gateway como um job assíncrono e é
gerado quando o gerente clica em "Gerar relatório". Um cliente aprovado cuja conta ainda não chegou ao
read model aparece com saldo 0.00 e sem número de conta e gerente, o mesmo critério usado no R11.

## Mensageria, SAGAs e jobs

**44. Formato das mensagens.** Comandos e respostas seguem o envelope do enunciado. Nos comandos aos
microsserviços, o `tipo` é o nome da ação, sem prefixo do serviço (`aprovar-solicitacao`,
`criar-usuario`), porque a fila já identifica o destino; os comandos ao MS Email usam o prefixo
`email.` (`email.senha-nova`). A resposta repete o `tipo` do comando. Os
eventos da fila `ms.conta.events` levam `id`, `objetoId`, `tipo`, `payload`, `versao` e `timestamp`,
porque a projeção precisa do identificador e da versão para ser idempotente; quando o evento nasce de
uma SAGA, o `sagaId` vai dentro do `payload`.

**45. Retentativa e DLQ.** Uma mensagem que falha é entregue de novo mais 3 vezes, com 5 segundos entre
as entregas, o que dá cerca de 15 segundos até a DLQ. Uma mensagem de comando que cai na DLQ faz o
Orquestrador tratar o passo como falho e compensar; ele consome as DLQs de comando na hora, então
elas ficam vazias. Uma mensagem de evento do CQRS que cai na DLQ fica parada, não gera compensação e é
reprocessada manualmente com `tools/dlq.sh`.

**46. Falha técnica dentro de um comando.** No MS Cliente e no MS Gerente, uma exceção durante o
processamento do comando vira resposta de FALHA, sem passar pela retentativa. No MS Auth e no MS
Conta, ela passa pela retentativa e pela DLQ. Nos dois casos o Orquestrador compensa. Para o usuário,
o job mostra uma frase sobre o que aconteceu; o detalhe técnico fica no log.

**47. Tempo dos passos.** Cada passo de SAGA tem 30 segundos para responder, e o prazo também vale para
os passos de compensação. A verificação roda a cada 5 segundos, então o timeout dispara entre 30 e 35
segundos. Quando o resultado de um passo fica incerto (timeout ou DLQ), o Orquestrador manda também a
compensação desse passo, além das anteriores. Uma compensação que falha não interrompe as seguintes.

**48. Notificação repetida.** Se o mesmo passo recebe duas notificações de falha (timeout e DLQ), a
segunda é ignorada e a compensação roda uma vez só. Um comando repetido em `saga.cmd`, com o mesmo
`sagaId`, também é ignorado.

**49. Estado da SAGA e job.** O estado da SAGA fica no Redis por 1 hora e o job, por 5 minutos, contados
a partir da última atualização. O `jobId` devolvido no 202 é o próprio identificador da SAGA, o
`Location` aponta para `/jobs/<id>/status`, e o job nasce PENDENTE com `resourceId` vazio. O
Orquestrador grava o resultado direto no job, no Redis, e é dali que o Gateway o lê.
`GET /jobs/<id>/result` devolve 409 se o job ainda não terminou e 404 se ele não existe. As rotas de
job exigem login, sem conferir quem iniciou a SAGA.

**50. Broker fora do ar.** Se o RabbitMQ estiver indisponível quando uma SAGA vai começar, o Gateway
responde 503 e fecha o job como FALHA, em vez de devolver 202.

**51. Espera no front.** O front consulta o job a partir de 300 ms, aumenta o intervalo até 2 segundos
e desiste em 60 segundos, mostrando que o processamento demorou. Depois de uma operação na conta, ele
espera até 15 segundos pelo saldo atualizado no lado de consulta.

**52. Senha em trânsito.** A senha gerada no R9 só existe na resposta do MS Auth e no comando ao MS
Email. O Orquestrador a mantém apenas em memória entre esses dois passos e nunca a grava no Redis nem
no log.

**53. Invalidação do cache.** O cache de cliente e de gerente vale 5 minutos e nunca guarda dados do
MS Conta. Na atualização de gerente (R14), quem apaga a chave é o Gateway. Nas SAGAs (R9, R13 e R15),
quem apaga é o Orquestrador, no fim da SAGA, porque o Gateway responde 202 antes de os dados mudarem.

**54. Compensações no event store.** Desfazer a criação de uma conta acrescenta ao event store o
evento `CriacaoCompensada`, além dos seis tipos do enunciado. O histórico fica preservado, e a
projeção remove a conta do read model. Essa compensação só é automática se a conta ainda não teve
nenhuma movimentação. Nas compensações do R13 e do R15, a conta volta ao gerente anterior por um novo
`GerenteAlterado`, e a compensação é recusada se a conta já tiver mudado de gerente por outro motivo.

**55. Links HATEOAS.** Os microsserviços geram links relativos, e o Gateway os reescreve com o seu
endereço público. As listas que o próprio Gateway compõe recebem links criados por ele. Ficam sem
`_links`, além do login, dos jobs e do health previstos no enunciado, o retorno do `/reboot` e as
respostas de erro, que seguem o formato `{status, erro, mensagem}`.

## Dados iniciais

**56. Endereço e telefone do seed.** O enunciado deixa esses dados à escolha da equipe.

| Cliente | Telefone | Endereço |
|---|---|---|
| Catharyna | (41) 99999-9999 | Rua das Flores, 123, Apto 101, Curitiba/PR, CEP 80000-000 |
| Cleuddônio | (41) 99899-9999 | Avenida Brasil, 456, Sala 202, Curitiba/PR, CEP 80000-001 |
| Catianna | (41) 99799-9999 | Travessa das Laranjeiras, 789, Casa 303, Curitiba/PR, CEP 80000-002 |
| Cutardo | (41) 99699-9999 | Rua dos Ipês, 1010, Loja 10, Curitiba/PR, CEP 80000-003 |
| Coândrya | (41) 99599-9999 | Alameda dos Anjos, 1111, Apartamento 202, Curitiba/PR, CEP 80000-004 |

Os gerentes Geniéve, Godophredo, Gyândula e Gadamântio usam os telefones (41) 99999-9999,
(41) 99899-9999, (41) 99799-9999 e (41) 99699-9999, nessa ordem.

**57. Eventos do seed.** Cada conta começa com um evento de criação às 00:00 da data de criação do
enunciado, com saldo inicial zero, seguido das movimentações da tabela. O replay desses eventos
reproduz exatamente os saldos do enunciado, e o read model é carregado com os mesmos valores. A
transferência do seed vira dois eventos com o mesmo horário, um em cada conta.

**58. O que o reboot apaga.** O `POST /reboot` recarrega os bancos com o seed e apaga do Redis as
sessões, os tokens revogados, o cache, os jobs e o estado das SAGAs. Ele não esvazia as filas do
RabbitMQ.

**59. Dados além do mínimo.** Além dos campos do enunciado, o MS Conta guarda a última versão
aplicada de cada conta, o saldo depois de cada movimentação e o evento de origem de cada linha do
read model. Cliente, Gerente e Conta guardam os comandos já processados, e o usuário do MS Auth
guarda o identificador da SAGA que o criou, para que uma mensagem repetida não seja executada duas
vezes.
