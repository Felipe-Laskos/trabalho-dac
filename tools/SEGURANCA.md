# Segurança de plataforma e imagens

O que foi varrido, o que foi achado, o que foi corrigido — tarefa S6.

## Varredura do histórico do Git

```bash
git log -p --all | grep -niE "SECRET=|PASSWORD=|APP_PASSWORD|senha.*=.*[a-z0-9]{8}"
```

**Executada em 13/10/2026. Nenhum segredo real commitado em nenhum momento
do histórico.** Os únicos resultados são:

- `SPRING_RABBITMQ_PASSWORD:guest` / `spring.rabbitmq.password=guest` —
  default público do RabbitMQ pra ambiente local, não um segredo
- `.env.example` com as chaves sempre vazias (`SECRET=`,
  `GMAIL_APP_PASSWORD=`), como deveria ser
  - hashes Argon2 do seed do MS Auth (`scripts/mongo/01-seed-auth.js`) — são
  hashes de sentido único da senha `tads`, já documentada publicamente no
  enunciado do trabalho; não dá pra reverter pro texto puro
- uma linha gerando `SECRET` aleatório em tempo de execução no workflow de
  CI (`echo "SECRET=$(openssl rand -hex 32)" >> .env`) — efêmero, não
  commitado
- `private static final String SENHA = "Xk7pQ2mZ";` em
  `ms-orquestrador/src/test/java/.../SagaAprovarClienteTest.java` (e
  equivalentes em `MotorSagaTest.java`, `UsuarioSagaServiceTest.java`) —
  investigado: é um valor fixo usado só em testes unitários pra simular a
  senha aleatória gerada pelo MS Auth durante o SAGA R9, igual aos CPFs e
  e-mails falsos usados no resto da suíte. Não é credencial de nada real.

**Conclusão: não houve necessidade de trocar segredo nenhum.** Se algum dia
aparecer um resultado real nessa varredura, o procedimento é: apagar o
arquivo não resolve (o histórico guarda pra sempre) — o certo é trocar o
segredo em si (nova senha de aplicativo no Gmail, nova `SECRET`).

## `.env.example` — conferido linha a linha

```
DB_PASS=
SECRET=
GMAIL_USER=
GMAIL_APP_PASSWORD=
```

Batem exatamente com as 4 variáveis que `docker-compose.yml` realmente lê
(`grep -oE '\$\{[A-Z_]+' docker-compose.yml | sort -u`) — nenhuma chave
faltando, nenhum valor presente.

## `.gitignore` / `.dockerignore` — auditados

- `.gitignore` (raiz): cobre `.env`, `node_modules/`, `target/`, `build/`,
  `dist/`, `*.log` — confirmado.
- `.dockerignore` em cada um dos 8 serviços que tem build (`ms-auth`,
  `ms-cliente`, `ms-gerente`, `ms-conta`, `ms-orquestrador`, `ms-email`,
  `gateway`, `frontend`) — todos existem e cobrem pelo menos `target`/
  `node_modules`, `.git` e arquivos de IDE. `gateway` e `frontend` também
  ignoram `*.log`; `gateway` ignora `.env` explicitamente.

## Hardening dos Dockerfiles

### Os 6 serviços Java (`ms-auth`, `ms-cliente`, `ms-gerente`, `ms-conta`, `ms-orquestrador`, `ms-email`)

Já estava certo desde o início: multi-stage (build com Maven, runtime
`eclipse-temurin:21-jre-alpine`), `wget` presente pro healthcheck do
compose. Faltava só o usuário não-root — adicionado nesta tarefa:

```dockerfile
RUN apk add --no-cache wget && \
    addgroup -S app && adduser -S app -G app
...
COPY --from=build --chown=app:app /app/target/<servico>.jar app.jar
USER app
```

### `gateway` (Node)

Já era single-stage simples com `wget` presente. A imagem `node:alpine`
já vem com um usuário não-privilegiado pronto (`node`, uid 1000) — só
precisava ser usado:

```dockerfile
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node . ./
USER node
```

### `frontend` (Angular + nginx) — exceção justificada

**Não virou totalmente não-root, e isso é deliberado.** O nginx precisa
bindar a porta 80 (privilegiada, < 1024) pra servir o SPA — rodar o
processo master inteiro como usuário sem privilégio exigiria trocar a
porta (mexendo em `nginx.conf` e no mapeamento `4200:80` do
`docker-compose.yml`, que não é deste serviço) ou usar capabilities Linux
extras, as duas opções aumentando a superfície de mudança sem reduzir
risco de verdade. A imagem `nginx:alpine` já separa privilégio do jeito
que o nginx foi desenhado pra isso: o processo **master** sobe como root
só pra abrir a porta 80, e os processos **worker** — que são os que de
fato processam requisição — já rodam como o usuário `nginx`
(não-privilegiado) por padrão, sem configuração extra. É o modelo de
segurança padrão do nginx, não um container rodando tudo como root à toa.

## Verificação do usuário não-root (ao vivo, frota completa em pé)

```
ms-auth:          app
ms-cliente:        app
ms-gerente:        app
ms-conta:          app
ms-orquestrador:   app
ms-email:          app
gateway:           node
front (workers):   nginx  (master segue root só pra bindar a porta 80 — ver acima)
```

Depois do hardening, subi a frota completa (12 contêineres) e rodei a
bateria de verificação inteira
(`tools/verificar/verificar.sh`) como teste funcional — **51/51, sem
nenhuma regressão de permissão** (nenhum serviço precisa escrever em
disco além do que os volumes já cobrem, então a troca de usuário não
quebrou nada).

## Tamanho das imagens (13/10/2026, depois do hardening)

| Imagem | Tamanho |
|---|---:|
| ms-cliente | 406 MB |
| ms-conta | 398 MB |
| ms-gerente | 396 MB |
| ms-auth | 366 MB |
| ms-email | 338 MB |
| ms-orquestrador | 355 MB |
| gateway | 265 MB |
| front | 96,8 MB |

O multi-stage e a imagem de runtime `-jre`/`-alpine` já existiam desde a
S1 — não mudaram nesta tarefa, então não há uma redução de tamanho pra
reportar por causa do hardening em si (`addgroup`/`adduser` adiciona
poucos KB, irrelevante). O número acima é a referência atual, caso algum
Dockerfile mude depois e alguém queira comparar.

## Pronto quando

- [x] A varredura rodou e o resultado está registrado acima, com data
- [x] `git ls-files | grep -c "^\.env$"` → `0`
- [x] Toda chave lida por algum contêiner existe no `.env.example`, sem valor
- [x] Os 8 serviços buildam depois do hardening e respondem `/health`
      (frota completa saudável + bateria 51/51, ver acima)
- [x] `docker images` com o tamanho das imagens anotado
