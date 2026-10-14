const assert = require("node:assert/strict");
const { after, before, beforeEach, test } = require("node:test");

const { GER1, subirGateway, derrubarGateway, zerar, chamar, logar } = require("./bancada");
const { criarJob, concluirJob, falharJob } = require("../jobs");

let token;

before(subirGateway);
after(derrubarGateway);

beforeEach(async () => {
  zerar();
  token = await logar(GER1);
});

test("/result de job PENDENTE → 409", async () => {
  const { jobId } = await criarJob("clientes");

  const { status } = await chamar("GET", `/jobs/${jobId}/result`, { token });

  assert.equal(status, 409);
});

test("concluirJob fecha o job inline e o /result devolve o resultado", async () => {
  const { jobId } = await criarJob("clientes");
  const resultado = { clientes: [{ cpf: "12912861012", nome: "Catharyna" }] };

  assert.equal(await concluirJob(jobId, resultado), true);

  const status = await chamar("GET", `/jobs/${jobId}/status`, { token });
  assert.equal(status.corpo.status, "CONCLUIDO");
  assert.equal(status.corpo.resultType, "inline");

  const { status: http, corpo } = await chamar("GET", `/jobs/${jobId}/result`, { token });
  assert.equal(http, 200);
  assert.deepEqual(corpo, resultado);
});

test("falharJob grava a frase no job e o /result continua 409", async () => {
  const { jobId } = await criarJob("clientes");

  await falharJob(jobId, "MS Gerente indisponível");

  const status = await chamar("GET", `/jobs/${jobId}/status`, { token });
  assert.equal(status.corpo.status, "FALHA");
  assert.equal(status.corpo.erro, "MS Gerente indisponível");
  assert.equal((await chamar("GET", `/jobs/${jobId}/result`, { token })).status, 409);
});

test("concluirJob de job expirado devolve false", async () => {
  assert.equal(await concluirJob("job-que-expirou", {}), false);
});
