const assert = require("node:assert/strict");
const { after, before, beforeEach, describe, test } = require("node:test");

const {
  GER1, redis, upstream, publicadas,
  subirGateway, derrubarGateway, zerar, chamar, logar
} = require("./bancada");

const { MS_GERENTE_URL, MS_CLIENTE_URL, MS_CONTA_URL } = process.env;

const GERENTES = [
  { cpf: "98574307084", nome: "Geniéve", email: "ger1@bantads.com.br", telefone: "41988880001", ativo: true },
  { cpf: "64065268052", nome: "Godophredo", email: "ger2@bantads.com.br", telefone: "41988880002", ativo: true },
  { cpf: "23862179060", nome: "Gyândula", email: "ger3@bantads.com.br", telefone: "41988880003", ativo: true },
  { cpf: "40501740066", nome: "Gadamântio", email: "ger4@bantads.com.br", telefone: "41988880004", ativo: true }
];

const CONTAS = {
  "12912861012": "98574307084",
  "09506382000": "64065268052",
  "85733854057": "23862179060",
  "58872160006": "98574307084",
  "76179646090": "64065268052"
};

function semear(gerentes) {
  upstream.responder("GET", `${MS_GERENTE_URL}/gerentes`, gerentes);
  upstream.responder("GET", `${MS_CLIENTE_URL}/clientes`,
                     Object.keys(CONTAS).map((cpf) => ({ cpf })));

  for (const [cpfCliente, cpfGerente] of Object.entries(CONTAS)) {
    upstream.responder("GET", `${MS_CONTA_URL}/clientes/${cpfCliente}/conta`, { cpfCliente, cpfGerente });
  }
}

const NOVO = {
  cpf: "11122233344", nome: "Gerente Novo", email: "gerente.novo1@bantads.com.br",
  telefone: "41988887777", senha: "tads"
};

let token;

before(subirGateway);
after(derrubarGateway);

beforeEach(async () => {
  zerar();
  token = await logar(GER1);
});

describe("GET /gerentes — composition do R12", () => {
  test("conta os clientes pelo gerente da conta, filtra inativos e ordena por nome", async () => {
    semear([...GERENTES, { cpf: "55566677788", nome: "Efêmero", ativo: false }]);

    const { status, corpo } = await chamar("GET", "/gerentes", { token });

    assert.equal(status, 200);
    assert.deepEqual(
      corpo.gerentes.map(({ nome, quantidadeClientes }) => [nome, quantidadeClientes]),
      [["Gadamântio", 0], ["Geniéve", 2], ["Godophredo", 2], ["Gyândula", 1]]
    );
  });

  test("ordena com a collation pt-BR, não pelo código do caractere", async () => {
    semear(GERENTES.map((g) => (g.nome === "Gadamântio" ? { ...g, nome: "gadamântio" } : g)));

    const { corpo } = await chamar("GET", "/gerentes", { token });

    assert.deepEqual(corpo.gerentes.map((g) => g.nome),
                     ["gadamântio", "Geniéve", "Godophredo", "Gyândula"]);
  });
});

describe("POST /gerentes — R13", () => {
  for (const [caso, corpo] of [
    ["sem senha", { ...NOVO, senha: undefined }],
    ["CPF fora do formato", { ...NOVO, cpf: "123" }]
  ]) {
    test(`${caso} → 400 e nenhuma SAGA publicada`, async () => {
      const resposta = await chamar("POST", "/gerentes", { token, corpo });

      assert.equal(resposta.status, 400);
      assert.equal(publicadas.length, 0);
    });
  }

  test("corpo válido → 202 com Location, job PENDENTE e a SAGA publicada com sagaId == jobId", async () => {
    const { status, headers, corpo } = await chamar("POST", "/gerentes", { token, corpo: NOVO });

    assert.equal(status, 202);
    assert.equal(headers.get("location"), `/jobs/${corpo.jobId}/status`);
    assert.deepEqual(corpo, {
      jobId: corpo.jobId, status: "PENDENTE", resultType: null,
      dominio: "gerentes", resourceId: null, erro: null
    });
    assert.deepEqual(JSON.parse(await redis.get(`job:${corpo.jobId}`)), corpo);
    assert.equal(redis.ttls.get(`job:${corpo.jobId}`), 300);

    assert.equal(publicadas.length, 1);
    const { fila, mensagem } = publicadas[0];
    assert.equal(fila, "saga.cmd");
    assert.equal(mensagem.sagaId, corpo.jobId);
    assert.equal(mensagem.tipo, "inserir-gerente");
    assert.deepEqual(mensagem.payload, { ...NOVO, cpfGerenteSolicitante: GER1.cpf });
  });
});

describe("DELETE /gerentes/{cpf} — R15", () => {
  test("gerente removendo a si mesmo → 403 antes de criar job ou publicar", async () => {
    const { status, corpo } = await chamar("DELETE", `/gerentes/${GER1.cpf}`, { token });

    assert.equal(status, 403);
    assert.equal(corpo.mensagem, "Um gerente não pode remover a si mesmo");
    assert.equal(publicadas.length, 0);
    assert.equal([...redis.valores.keys()].filter((chave) => chave.startsWith("job:")).length, 0);
  });

  test("outro gerente → 202 e publica remover-gerente", async () => {
    const { status, corpo } = await chamar("DELETE", "/gerentes/40501740066", { token });

    assert.equal(status, 202);
    assert.equal(publicadas.length, 1);
    assert.equal(publicadas[0].mensagem.sagaId, corpo.jobId);
    assert.equal(publicadas[0].mensagem.tipo, "remover-gerente");
    assert.deepEqual(publicadas[0].mensagem.payload,
                     { cpf: "40501740066", cpfGerenteSolicitante: GER1.cpf });
  });
});
