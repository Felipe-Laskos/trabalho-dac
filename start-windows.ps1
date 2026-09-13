#Requires -Version 5.1

<#
  Pre-requisito: Docker Desktop instalado e ABERTO

  Como rodar, no PowerShell, dentro da pasta do repositorio:

      powershell -ExecutionPolicy Bypass -File .\start-windows.ps1
#>

$TENTATIVAS = 60
$INTERVALO  = 3

Set-Location -LiteralPath $PSScriptRoot

function Abortar {
  param([string[]]$Linhas)

  Write-Host ""
  foreach ($linha in $Linhas) { Write-Host $linha }
  Write-Host ""
  exit 1
}

function ConferirEtapa {
  param([string]$Etapa)

  if ($LASTEXITCODE -ne 0) {
    Abortar @("ERRO: $Etapa falhou (docker saiu com codigo $LASTEXITCODE).")
  }
}

Write-Host "-> BANTADS: build e subida da frota"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Abortar @(
    "ERRO: 'docker' nao esta no PATH.",
    "      Instale o Docker Desktop e reabra o PowerShell."
  )
}

docker info *>$null
if ($LASTEXITCODE -ne 0) {
  Abortar @(
    "ERRO: o Docker nao respondeu.",
    "      Abra o Docker Desktop e espere o motor ficar 'Engine running'."
  )
}

if (-not (Test-Path -LiteralPath ".env")) {
  Abortar @(
    "ERRO: arquivo .env nao encontrado.",
    "      Copie .env.example para .env e preencha os segredos:",
    "      Copy-Item .env.example .env"
  )
}

$servicos = @(docker compose config --services)
ConferirEtapa "docker compose config"

$total = $servicos.Count
Write-Host "-> $total servicos declarados no compose"

Write-Host "-> Derrubando containers antigos ..."
docker compose down --remove-orphans
ConferirEtapa "docker compose down"

Write-Host "-> Build das imagens ..."
docker compose build
ConferirEtapa "docker compose build"

Write-Host "-> Subindo a frota ..."
docker compose up -d
if ($LASTEXITCODE -ne 0) {
  Abortar @(
    "ERRO: 'docker compose up' falhou (codigo $LASTEXITCODE).",
    "      Se a mensagem citar 'forbidden by its access permissions', o Windows",
    "      reservou a porta para o Hyper-V. Confira as faixas com:",
    "        netsh interface ipv4 show excludedportrange protocol=tcp",
    "      As portas que o projeto publica sao 4200, 8000 e 15672."
  )
}

Write-Host "-> Aguardando healthchecks ..."
$saudaveis = 0
for ($tentativa = 1; $tentativa -le $TENTATIVAS; $tentativa++) {
  $estados = @(docker compose ps --format '{{.Health}}' 2>$null)
  $saudaveis = @($estados | Where-Object { $_ -eq "healthy" }).Count
  if ($saudaveis -eq $total) { break }
  Start-Sleep -Seconds $INTERVALO
}

Write-Host ""
docker compose ps
Write-Host ""
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}'

if ($saudaveis -ne $total) {
  Write-Host ""
  Write-Host "ERRO: $saudaveis de $total healthy. Quem ficou de fora:"
  docker compose ps --format 'table {{.Service}}\t{{.Status}}' | Select-String -Pattern '\(healthy\)' -NotMatch
  exit 1
}

Write-Host ""
Write-Host "-> Frota no ar: $total conteineres healthy."
Write-Host "    Front:            http://localhost:4200"
Write-Host "    API Gateway:      http://localhost:8000/health"
Write-Host "    RabbitMQ console: http://localhost:15672  (guest/guest)"
Write-Host "    PostgreSQL, MongoDB e Redis: sem porta no host, so na rede 'bantads'."
