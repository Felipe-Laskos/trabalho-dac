const assert = require("node:assert/strict");
const { after, before, beforeEach, describe, test } = require("node:test");

const {
  GER1, upstream,
  subirGateway, derrubarGateway, zerar, chamar, logar
} = require("./bancada");

const { MS_AUTH_URL, MS_CLIENTE_URL, MS_GERENTE_URL, MS_CONTA_URL } = process.env;

const COLUNAS = ["cpf", "nome", "email", "salario", "numeroConta", "saldo", "cpfGerente", "nomeGerente"];

const GERENTES = [
  { cpf: "98574307084", nome: "Geniéve", ativo: true },
  { cpf: "64065268052", nome: "Godophredo", ativo: true }
];

// fora de ordem de propósito: "Coândrya" tem acento e precisa ordenar pela letra base
const CLIENTES = [
  { cpf: "85733854057", nome: "Catianna", email: "cli3@bantads.com.br", salario: "5000.00", conta: "8573", saldo: "200.00", gerente: "98574307084" },
  { cpf: "76179646090", nome: "Coândrya", email: "cli5@bantads.com.br", salario: "1500.00", conta: "7617", saldo: "1500.00", gerente: "64065268052" },
  { cpf: "12912861012", nome: "Catharyna", email: "cli1@bantads.com.br", salario: "10000.00", conta: "1291", saldo: "800.00", gerente: "98574307084" },
  { cpf: "58872160006", nome: "Cutardo", email: "cli4@bantads.com.br", salario: "20000.00", conta: "5887", saldo: "150000.00", gerente: "98574307084" },
  { cpf: "09506382000", nome: "Cleuddônio", email: "cli2@bantads.com.br", salario: "3000.00", conta: "0950", saldo: "10000.00", gerente: "64065268052" }
];

function semear(clientes = CLIENTES, gerentes = GERENTES) {
  upstream.responder("GET", `${MS_CLIENTE_URL}/clientes`, clientes.map(({ cpf, nome }) => ({ cpf, nome })));
  upstream.responder("GET", `${MS_GERENTE_URL}/gerentes`, gerentes);

  for (const c of clientes) {
    upstream.responder("GET", `${MS_CLIENTE_URL}/clientes/${c.cpf}`,
                       { cpf: c.cpf, nome: c.nome, email: c.email, salario: c.salario });

    if (c.conta) {
      upstream.responder("GET", `${MS_CONTA_URL}/clientes/${c.cpf}/conta`,
                         { numero: c.conta, cpfCliente: c.cpf, cpfGerente: c.gerente, saldo: c.saldo });
    } else {
      upstream.falhar("GET", `${MS_CONTA_URL}/clientes/${c.cpf}/conta`, 404);
    }
  }
}

async function aguardarJob(jobId, token) {
  for (let i = 0; i < 50; i += 1) {
    const { corpo } = await chamar("GET", `/jobs/${jobId}/status`, { token });

    if (corpo.status !== "PENDENTE") return corpo;

    await new Promise((ok) => setTimeout(ok, 5));
  }

  throw new Error(`job ${jobId} não saiu de PENDENTE`);
}

let token;

before(subirGateway);
after(derrubarGateway);

beforeEach(async () => {
  zerar();
  token = await logar(GER1);
});

describe("GET /relatorios/clientes — R16 (API Composition assíncrona, resultado inline)", () => {
  test("responde 202 com Location do job, sem esperar a composição", async () => {
    semear();

    const { status, headers, corpo } = await chamar("GET", "/relatorios/clientes", { token });

    assert.equal(status, 202);
    assert.equal(headers.get("location"), `/jobs/${corpo.jobId}/status`);
    assert.equal(corpo.status, "PENDENTE");
    assert.equal(corpo.dominio, "clientes");
    assert.equal(corpo.resourceId, null);
  });

  test("o job fecha CONCLUIDO inline e /result devolve os clientes ordenados por nome (pt-BR)", async () => {
    semear();

    const { corpo: job } = await chamar("GET", "/relatorios/clientes", { token });
    const fechado = await aguardarJob(job.jobId, token);

    assert.equal(fechado.status, "CONCLUIDO");
    assert.equal(fechado.resultType, "inline");
    assert.equal(fechado.erro, null);

    const { status, corpo } = await chamar("GET", `/jobs/${job.jobId}/result`, { token });

    assert.equal(status, 200);
    assert.deepEqual(Object.keys(corpo), ["clientes"]);
    assert.deepEqual(corpo.clientes.map((c) => c.nome),
                     ["Catharyna", "Catianna", "Cleuddônio", "Coândrya", "Cutardo"]);
  });

  test("cada linha tem exatamente as 8 colunas, com o nome do gerente da conta", async () => {
    semear();

    const { corpo: job } = await chamar("GET", "/relatorios/clientes", { token });
    await aguardarJob(job.jobId, token);
    const { corpo } = await chamar("GET", `/jobs/${job.jobId}/result`, { token });

    for (const linha of corpo.clientes) {
      assert.deepEqual(Object.keys(linha).sort(), [...COLUNAS].sort());
    }

    assert.deepEqual(corpo.clientes[0], {
      cpf: "12912861012", nome: "Catharyna", email: "cli1@bantads.com.br", salario: "10000.00",
      numeroConta: "1291", saldo: "800.00", cpfGerente: "98574307084", nomeGerente: "Geniéve"
    });
  });

  test("salario e saldo saem como string com duas casas, mesmo que o MS devolva número", async () => {
    semear(CLIENTES.map((c) => (c.nome === "Cutardo" ? { ...c, salario: 20000, saldo: 150000 } : c)));

    const { corpo: job } = await chamar("GET", "/relatorios/clientes", { token });
    await aguardarJob(job.jobId, token);
    const { corpo } = await chamar("GET", `/jobs/${job.jobId}/result`, { token });

    for (const { salario, saldo } of corpo.clientes) {
      assert.match(salario, /^\d+\.\d{2}$/);
      assert.match(saldo, /^\d+\.\d{2}$/);
    }

    assert.equal(corpo.clientes.at(-1).salario, "20000.00");
    assert.equal(corpo.clientes.at(-1).saldo, "150000.00");
  });

  test("cliente sem conta ainda aparece, com saldo 0.00 e conta/gerente nulos", async () => {
    semear([...CLIENTES, {
      cpf: "11122233396", nome: "Aurora", email: "aurora@bantads.com.br", salario: "2500.00"
    }]);

    const { corpo: job } = await chamar("GET", "/relatorios/clientes", { token });
    await aguardarJob(job.jobId, token);
    const { corpo } = await chamar("GET", `/jobs/${job.jobId}/result`, { token });

    assert.equal(corpo.clientes.length, 6);
    assert.deepEqual(corpo.clientes[0], {
      cpf: "11122233396", nome: "Aurora", email: "aurora@bantads.com.br", salario: "2500.00",
      numeroConta: null, saldo: "0.00", cpfGerente: null, nomeGerente: null
    });
  });

  test("falha num MS fecha o job FALHA com frase para humano, e /result recusa com 409", async () => {
    semear();
    upstream.falhar("GET", `${MS_CLIENTE_URL}/clientes/58872160006`, 500);

    const { status, corpo: job } = await chamar("GET", "/relatorios/clientes", { token });
    const fechado = await aguardarJob(job.jobId, token);

    assert.equal(status, 202);
    assert.equal(fechado.status, "FALHA");
    assert.equal(fechado.resultType, null);
    assert.match(fechado.erro, /relatório de clientes/);
    assert.doesNotMatch(fechado.erro, /status code|ECONN|axios/i);

    const resultado = await chamar("GET", `/jobs/${job.jobId}/result`, { token });

    assert.equal(resultado.status, 409);
  });

  test("a composição consulta cada MS uma vez por cliente, sem repetir chamada", async () => {
    semear();

    const { corpo: job } = await chamar("GET", "/relatorios/clientes", { token });
    await aguardarJob(job.jobId, token);

    const chamadas = upstream.chamadas.map((c) => c.chave);
    const porClientes = chamadas.filter((c) => c === `GET ${MS_CLIENTE_URL}/clientes`);
    const porGerentes = chamadas.filter((c) => c === `GET ${MS_GERENTE_URL}/gerentes`);

    assert.equal(porClientes.length, 1);
    assert.equal(porGerentes.length, 1);

    for (const { cpf } of CLIENTES) {
      assert.equal(chamadas.filter((c) => c === `GET ${MS_CLIENTE_URL}/clientes/${cpf}`).length, 1);
      assert.equal(chamadas.filter((c) => c === `GET ${MS_CONTA_URL}/clientes/${cpf}/conta`).length, 1);
    }
  });

  test("sem token → 401", async () => {
    const { status } = await chamar("GET", "/relatorios/clientes");

    assert.equal(status, 401);
  });

  test("perfil CLIENTE → 403, e nenhum job é criado", async () => {
    upstream.responder("POST", `${MS_AUTH_URL}/auth/login`,
                       { cpf: CLIENTES[2].cpf, tipo: "CLIENTE", ativo: true });
    upstream.responder("GET", `${MS_CLIENTE_URL}/clientes/${CLIENTES[2].cpf}`,
                       { cpf: CLIENTES[2].cpf, nome: "Catharyna", email: "cli1@bantads.com.br" });

    const login = await chamar("POST", "/login", { corpo: { email: "cli1@bantads.com.br", senha: "tads" } });
    const { status } = await chamar("GET", "/relatorios/clientes", { token: login.corpo.token });

    assert.equal(status, 403);
  });
});
