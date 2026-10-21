const assert = require("node:assert/strict");
const { after, before, beforeEach, describe, test } = require("node:test");

const {
  GER1, redis, upstream, publicadas,
  subirGateway, derrubarGateway, zerar, chamar, logar
} = require("./bancada");

const axios = require("axios");
const { ClientOfflineError } = require("redis");

const rabbit = require("../rabbit");
const { cliente } = require("../redis");

const { MS_AUTH_URL, MS_CLIENTE_URL } = process.env;

const CPF = "12912861012";

const INDISPONIVEL = {
  status: 503, erro: "Service Unavailable",
  mensagem: "Serviço indisponível no momento. Tente novamente em instantes."
};

const jobsGravados = () => [...redis.valores]
  .filter(([chave]) => chave.startsWith("job:"))
  .map(([, valor]) => JSON.parse(valor));

let token;

before(subirGateway);
after(derrubarGateway);

beforeEach(async () => {
  zerar();
  token = await logar(GER1);
});

describe("MS sem resposta → 503 com o corpo padronizado", () => {
  for (const [caso, code] of [
    ["parado (o nome não resolve na rede)", "ENOTFOUND"],
    ["recusando conexão", "ECONNREFUSED"],
    ["mudo até estourar o prazo", "ECONNABORTED"]
  ]) {
    test(`MS Cliente ${caso} → 503`, async () => {
      upstream.calar("GET", `${MS_CLIENTE_URL}/clientes/${CPF}`, code);

      const { status, corpo } = await chamar("GET", `/clientes/${CPF}`, { token });

      assert.equal(status, 503);
      assert.deepEqual(corpo, INDISPONIVEL);
    });
  }

  test("MS que respondeu 500 continua 500: 503 é só para quem não respondeu", async () => {
    upstream.falhar("GET", `${MS_CLIENTE_URL}/clientes/${CPF}`, 500);

    const { status } = await chamar("GET", `/clientes/${CPF}`, { token });

    assert.equal(status, 500);
  });

  test("MS Auth fora no login → 503, não 'Login inválido'", async () => {
    upstream.calar("POST", `${MS_AUTH_URL}/auth/login`, "ENOTFOUND");

    const { status, corpo } = await chamar("POST", "/login", { corpo: { email: GER1.email, senha: "tads" } });

    assert.equal(status, 503);
    assert.deepEqual(corpo, INDISPONIVEL);
  });

  test("toda chamada ao MS sai com prazo, inclusive as do login", async () => {
    upstream.responder("GET", `${MS_CLIENTE_URL}/clientes/${CPF}`, { cpf: CPF });
    await chamar("GET", `/clientes/${CPF}`, { token });

    const chamadas = [...axios.get.mock.calls, ...axios.post.mock.calls];
    const configs = chamadas.map(({ arguments: args }) => (args.length === 3 ? args[2] : args[1]));

    assert.ok(chamadas.length >= 3);
    assert.ok(configs.every((config) => config?.timeout > 0), "chamada sem timeout");
  });
});

describe("RabbitMQ fora → 503, e o job não fica PENDENTE", () => {
  test("publicação recusada no R15 → 503 e o job que já existia fecha FALHA", async () => {
    rabbit.publicar.mock.mockImplementationOnce(async () => {
      throw new rabbit.BrokerIndisponivel("RabbitMQ: sem conexão");
    });

    const { status, corpo } = await chamar("DELETE", "/gerentes/64065268052", { token });

    assert.equal(status, 503);
    assert.deepEqual(corpo, INDISPONIVEL);
    assert.equal(publicadas.length, 0);
    assert.deepEqual(jobsGravados().map((job) => job.status), ["FALHA"]);
  });
});

describe("Redis fora → 503 na hora, sem pendurar", () => {
  test("sessão que não dá para conferir → 503", async () => {
    cliente.exists.mock.mockImplementationOnce(async () => {
      throw new ClientOfflineError();
    });

    const { status, corpo } = await chamar("GET", `/clientes/${CPF}`, { token });

    assert.equal(status, 503);
    assert.deepEqual(corpo, INDISPONIVEL);
  });

  test("cache-aside sem Redis → 503", async () => {
    cliente.get.mock.mockImplementation(async (chave) => {
      if (chave.startsWith("cache:")) throw new ClientOfflineError();
      return redis.get(chave);
    });

    try {
      const { status } = await chamar("GET", `/clientes/${CPF}`, { token });

      assert.equal(status, 503);
    } finally {
      cliente.get.mock.mockImplementation(redis.get.bind(redis));
    }
  });
});
