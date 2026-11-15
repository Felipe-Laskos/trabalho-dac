# Orçamento de memória — medido × orçado

Tabela real, contêiner a contêiner, de quanto cada serviço gasta contra o
`mem_limit` que ele tem no `docker-compose.yml` — e a configuração que
mantém cada um dentro do próprio teto.

## Onde e quando foi medido

- **Data:** 06/10/2026, ~22:08 (-03:00)
- **Máquina:** `nathaly-IdeaPad-3-15ALC6`, Linux 6.8.0-146-generic, 12 CPUs, **5,6 GiB de RAM total**
- ⚠️ **Esta NÃO é a máquina de 8 GB da defesa** (§5.12.1 assume isso). Os
  números de uso de cada contêiner valem — são medidos, não dependem do
  host. Mas o item "≥ 2 GB de folga no host" do checklist **precisa ser
  remedido na máquina real da defesa**: nesta aqui, com só 5,6 GB de RAM
  total pra um orçamento de 4,8 GB de contêineres, o host já está sob
  pressão (ver "Teste da máquina" abaixo).
- **Condição:** `docker compose up -d` (frota completa, 12 contêineres),
  seguido de `./tools/verificar/verificar.sh` rodando por inteiro como
  carga (reboot + os 5 módulos da bateria, 51 critérios, todos OK) no
  momento da medição. Sem Firefox real aberto (ambiente sem GUI) — ver
  nota abaixo.

## Medido × orçado, contêiner a contêiner

| Contêiner | `mem_limit` (orçado) | Medido (`docker stats --no-stream`) | % do limite |
|---|---:|---:|---:|
| postgres | 384 MiB | 97,9 MiB | 25,5% |
| mongo | 384 MiB | 114,9 MiB | 29,9% |
| redis | 128 MiB | 6,3 MiB | 4,9% |
| rabbitmq | 512 MiB | 134,2 MiB | 26,2% |
| ms-auth | 512 MiB | 203,7 MiB | 39,8% |
| ms-orquestrador | 512 MiB | 177,5 MiB | 34,7% |
| ms-email | 512 MiB | 132,5 MiB | 25,9% |
| ms-cliente | 512 MiB | 237,8 MiB | 46,4% |
| ms-gerente | 512 MiB | 204,6 MiB | 40,0% |
| ms-conta | 512 MiB | 250,1 MiB | 48,9% (o mais próximo do teto) |
| gateway | 256 MiB | 80,7 MiB | 31,5% |
| front | 64 MiB | 10,6 MiB | 16,6% |
| **Total** | **4800 MiB (4,8 GB)** | **≈ 1642 MiB (1,6 GB)** | **34,2%** |

Nenhum contêiner passou de 50% do próprio `mem_limit`, mesmo com a bateria
inteira rodando contra a frota. `ms-conta` é o que mais usa (CQRS com dois
`DataSource` + replay), seguido de `ms-cliente`.

## `redis-cli CONFIG GET maxmemory-policy`

```
maxmemory-policy
noeviction
```

Confirmado: nenhuma chave é descartada sob pressão de memória — sessão,
job e estado de SAGA ficam inteiros até expirar por TTL.

## Teste da máquina (host, não contêiner)

```
free -h (06/10/2026, com a frota + bateria rodando)
               total        used        free      shared  buff/cache   available
Mem:           5,6Gi       3,7Gi       366Mi       102Mi       1,6Gi       1,6Gi
Swap:          2,0Gi       1,3Gi       765Mi
```

Nesta máquina (5,6 GB) o host **não** teve os "≥ 2 GB de folga" do
checklist — só ~400 MB livres e swap já em uso. Isso não é sintoma de
vazamento dos contêineres (eles somaram só 1,6 GB dos 4,8 GB orçados) — é
o host em si ser menor que os 8 GB que o enunciado assume para a máquina
da defesa, sobrando pouco depois do SO + outros processos do sistema. Como
dito acima, **este item específico precisa ser remedido na máquina real**.

## Remedição na máquina da defesa (15/11/2026)

Notebook do Felipe: WSL2 com 7,6 GiB, Docker enxergando 8,16 GB e 12 CPUs
(o cenário de 8 GB do §5.12.1). Frota completa de 12 contêineres, com a
suíte oficial rodando duas vezes (81/81) e a bateria inteira (60/60). O
`docker stats` foi lido a cada 3 a 5 s durante a carga; a tabela traz o pico
de cada contêiner.

| Contêiner | `mem_limit` | Pico medido | % do limite |
|---|---:|---:|---:|
| postgres | 384 MiB | 119,9 MiB | 31,2% |
| mongo | 384 MiB | 162,1 MiB | 42,2% |
| redis | 128 MiB | 16,2 MiB | 12,7% |
| rabbitmq | 512 MiB | 218,8 MiB | 42,7% |
| ms-auth | 512 MiB | 245,9 MiB | 48,0% |
| ms-orquestrador | 512 MiB | 186,9 MiB | 36,5% |
| ms-email | 512 MiB | 142,1 MiB | 27,8% |
| ms-cliente | 512 MiB | 251,9 MiB | 49,2% |
| ms-gerente | 512 MiB | 262,4 MiB | 51,3% |
| ms-conta | 512 MiB | 283,5 MiB | 55,4% |
| gateway | 256 MiB | 61,2 MiB | 23,9% |
| front | 64 MiB | 13,4 MiB | 20,9% |
| **Soma dos picos** | **4800 MiB** | **≈ 1964 MiB** | **40,9%** |

Nenhum contêiner chegou perto do teto; o mais alto foi o `ms-conta`, com
55%. O host é que ficou apertado:

```
free -m (15/11/2026, durante a suíte)
               total        used        free      shared  buff/cache   available
Mem:            7787        6538         274          55        1322        1248
```

Os ~1,2 GiB disponíveis não vêm da frota (ela somou menos de 2 GB): no
momento da medição havia, dentro do mesmo WSL, outras sessões de terminal e
de IDE abertas, cada uma com algumas centenas de MiB. **Na defesa, deixar no
WSL só a frota**: fechar o que mais estiver rodando dentro dele, já que o
Firefox, a IDE e o cliente de banco rodam do lado do Windows.

## Decisão: watermark do RabbitMQ — testado `relative`, revertido pra `absolute`

A ideia inicial era trocar `vm_memory_high_watermark.absolute = 307MiB`
(fixo, calculado como 60% do `mem_limit: 512m` de hoje) por
`vm_memory_high_watermark.relative = 0.6`, que é a forma mais legível e
não fica presa a recalcular manualmente se o `mem_limit` mudar.

Testado ao vivo e revertido. Dentro do contêiner:

```
cgroup memory.max:                    536870912 bytes (= 512 MiB, correto)
vm_memory_monitor:get_total_memory(): 6065065984 bytes (≈ 5,65 GiB — a RAM do HOST)
```

O RabbitMQ deste ambiente **não enxerga o cgroup do contêiner** — a
detecção de memória total do BEAM/Erlang devolve a RAM do host inteiro,
não os 512 MiB do `mem_limit`. Com `relative = 0.6`, o teto de alarme vira
~60% de 5,65 GiB (≈ 3,4 GiB) — um valor que o contêiner **nunca alcança**
antes de ser morto por OOM pelo cgroup em 512 MiB. Na prática, a proteção
de memória do RabbitMQ (pausar publishers antes de estourar) ficaria
decorativa.

O valor absoluto original (`307MiB`, 60% de 512 MiB) é o que protege de
verdade, porque está calibrado contra o limite real do contêiner, não
contra o que o processo (erroneamente) acha que é "memória total". Mantido
como estava. **Se o `mem_limit` do rabbitmq mudar no `docker-compose.yml`,
recalcular este valor a mão** (60% do novo limite) — não há detecção
automática aqui.

## Heap da JVM

Todo serviço Java ganhou, em `docker-compose.yml`:

```
JAVA_TOOL_OPTIONS: "-XX:MaxRAMPercentage=60 -XX:+UseSerialGC"
```

`MaxRAMPercentage=60` já existia desde a S1/S2 (o heap máximo fica em 60%
do que a JVM enxerga via cgroup — isso aqui a JVM enxerga corretamente,
diferente do RabbitMQ acima). `UseSerialGC` é novo nesta tarefa: coletor de
GC de thread única, menor overhead de memória que o G1 (default), adequado
pra contêineres pequenos (512m) com pouca concorrência — troca throughput
de pico por previsibilidade de memória, que é o que importa aqui.

## Gateway (Node)

```
NODE_OPTIONS: "--max-old-space-size=192"
```

Já configurado desde a S2, dentro do `mem_limit: 256m` do gateway — sobra
margem pro resto do processo Node (stack nativo, buffers) além do heap V8.

## Cache interno de cada banco/broker

| Serviço | Configuração | Onde |
|---|---|---|
| postgres | `shared_buffers=128MB` | `docker-compose.yml` (command) |
| mongo | `--wiredTigerCacheSizeGB 0.25` | `docker-compose.yml` (command) |
| redis | `--maxmemory 100mb --maxmemory-policy noeviction` | `docker-compose.yml` (command) |
| rabbitmq | `vm_memory_high_watermark.absolute = 307MiB` | `config/rabbitmq/20-bantads.conf` |

Já estava tudo certo desde o início do projeto (Felipe, S1) — conferido de
novo nesta tarefa, sem mudança.

## Nota: Firefox

O checklist original pede medir "com a frota, a suíte e o Firefox no ar" —
este ambiente não tem GUI, então a medição acima não inclui um Firefox
real aberto. Isso só afeta a RAM do **host** (fora do orçamento dos
contêineres, que é o que este documento mede) — vale rodar com o Firefox
aberto de verdade na máquina da defesa antes de confiar no número de
folga do host.
