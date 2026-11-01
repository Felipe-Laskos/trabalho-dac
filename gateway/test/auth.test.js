const assert = require("node:assert/strict");
const { after, before, beforeEach, describe, test } = require("node:test");

const jwt = require("jsonwebtoken");

const { GER1, redis, upstream, subirGateway, derrubarGateway, zerar, chamar, logar } = require("./bancada");

const { MS_AUTH_URL, MS_CLIENTE_URL, SECRET } = process.env;

const CLI1 = { cpf: "12912861012", nome: "Catharyna", email: "cli1@bantads.com.br" };
const CPF_CLI2 = "09506382000";

const SEM_TOKEN = { auth: false, message: "Token não fornecido." };
const TOKEN_RUIM = { auth: false, message: "Falha ao autenticar o token." };
const LOGIN_INVALIDO = { auth: false, message: "Login inválido!" };

const SONDA = "/jobs/qualquer/status";

const jtiDe = (token) => jwt.decode(token).jti;

const chamadasA = (prefixo) => upstream.chamadas.filter(({ chave }) => chave.startsWith(prefixo));

async function logarCliente(cliente) {
  upstream.responder("POST", `${MS_AUTH_URL}/auth/login`, { cpf: cliente.cpf, tipo: "CLIENTE", ativo: true });
  upstream.responder("GET", `${MS_CLIENTE_URL}/clientes/${cliente.cpf}`, cliente);

  const { corpo } = await chamar("POST", "/login", { corpo: { email: cliente.email, senha: "tads" } });

  return corpo.token;
}

before(subirGateway);
after(derrubarGateway);
beforeEach(zerar);

describe("verifyJWT", () => {
  test("sem x-access-token → 401 'Token não fornecido.'", async () => {
    const { status, corpo } = await chamar("GET", SONDA);

    assert.equal(status, 401);
    assert.deepEqual(corpo, SEM_TOKEN);
  });

  for (const [caso, token] of [
    ["texto que não é JWT", "isto-nao-e-um-jwt"],
    ["assinado com outro SECRET", jwt.sign({ cpf: GER1.cpf, tipo: "GERENTE", jti: "j1" }, "outro-segredo")]
  ]) {
    test(`${caso} → 401 'Falha ao autenticar o token.'`, async () => {
      const { status, corpo } = await chamar("GET", SONDA, { token });

      assert.equal(status, 401);
      assert.deepEqual(corpo, TOKEN_RUIM);
    });
  }

  test("token expirado → 401, mesmo com a sessão ainda no Redis", async () => {
    const jti = "jti-expirado";
    await redis.setEx(`sessao:${jti}`, 1800, JSON.stringify({ cpf: GER1.cpf, tipo: "GERENTE" }));
    const token = jwt.sign(
      { cpf: GER1.cpf, tipo: "GERENTE", jti, exp: Math.floor(Date.now() / 1000) - 60 }, SECRET
    );

    const { status, corpo } = await chamar("GET", SONDA, { token });

    assert.equal(status, 401);
    assert.deepEqual(corpo, TOKEN_RUIM);
  });

  test("jti em revogado: → 401, mesmo com a sessão viva", async () => {
    const token = await logar(GER1);
    await redis.setEx(`revogado:${jtiDe(token)}`, 60, "1");

    assert.equal((await chamar("GET", SONDA, { token })).status, 401);
  });

  test("assinatura válida sem sessao:<jti> → 401 (sessão apagada pelo /reboot ou pelo R15)", async () => {
    const token = await logar(GER1);
    await redis.del(`sessao:${jtiDe(token)}`);

    assert.equal((await chamar("GET", SONDA, { token })).status, 401);
  });

  test("cada requisição renova sessao:<jti> e sessao:cpf: para 30 min", async () => {
    const token = await logar(GER1);
    redis.ttls.set(`sessao:${jtiDe(token)}`, 5);
    redis.ttls.set(`sessao:cpf:${GER1.cpf}`, 5);

    assert.equal((await chamar("GET", SONDA, { token })).status, 404);
    assert.equal(redis.ttls.get(`sessao:${jtiDe(token)}`), 1800);
    assert.equal(redis.ttls.get(`sessao:cpf:${GER1.cpf}`), 1800);
  });
});

describe("autorização e identidade", () => {
  test("cliente lendo o cadastro de outro CPF → 403, sem chamar o MS Cliente", async () => {
    const token = await logarCliente(CLI1);

    const { status } = await chamar("GET", `/clientes/${CPF_CLI2}`, { token });

    assert.equal(status, 403);
    assert.equal(chamadasA(`GET ${MS_CLIENTE_URL}/clientes/${CPF_CLI2}`).length, 0);
  });

  test("cliente lendo o próprio cadastro → 200", async () => {
    const token = await logarCliente(CLI1);

    const { status, corpo } = await chamar("GET", `/clientes/${CLI1.cpf}`, { token });

    assert.equal(status, 200);
    assert.equal(corpo.nome, "Catharyna");
  });

  test("CPF fora do formato (..%2F) → 404 antes de chegar ao MS", async () => {
    const token = await logar(GER1);

    const { status } = await chamar("GET", "/clientes/..%2F", { token });

    assert.equal(status, 404);
    assert.equal(chamadasA(`GET ${MS_CLIENTE_URL}/clientes/.`).length, 0);
  });

  test("X-User-CPF e X-User-Tipo forjados são trocados pelos do token", async () => {
    const token = await logarCliente(CLI1);

    const { status } = await chamar("GET", `/clientes/${CLI1.cpf}`, {
      token, headers: { "X-User-CPF": CPF_CLI2, "X-User-Tipo": "GERENTE" }
    });

    const consulta = chamadasA(`GET ${MS_CLIENTE_URL}/clientes/${CLI1.cpf}`).at(-1);
    assert.equal(status, 200);
    assert.equal(consulta.headers["X-User-CPF"], CLI1.cpf);
    assert.equal(consulta.headers["X-User-Tipo"], "CLIENTE");
  });
});

describe("POST /login", () => {
  test("MS Auth recusa a credencial (401) → 401 'Login inválido!'", async () => {
    upstream.falhar("POST", `${MS_AUTH_URL}/auth/login`, 401);

    const { status, corpo } = await chamar("POST", "/login", { corpo: { email: GER1.email, senha: "errada" } });

    assert.equal(status, 401);
    assert.deepEqual(corpo, LOGIN_INVALIDO);
  });

  for (const falha of [500, 400, 404]) {
    test(`MS Auth respondendo ${falha} → 500 com log, não 'Login inválido!'`, async (t) => {
      const log = t.mock.method(console, "error", () => {});
      upstream.falhar("POST", `${MS_AUTH_URL}/auth/login`, falha);

      const { status, corpo } = await chamar("POST", "/login", { corpo: { email: GER1.email, senha: "tads" } });

      assert.equal(status, 500);
      assert.deepEqual(corpo, { status: 500, erro: "Internal Server Error", mensagem: "Erro interno" });
      assert.ok(log.mock.calls.some(({ arguments: [texto] }) => texto.includes(`MS Auth respondeu ${falha}`)));
    });
  }

  test("gerente inativo (ativo: false) → 401", async () => {
    upstream.responder("POST", `${MS_AUTH_URL}/auth/login`, { cpf: GER1.cpf, tipo: "GERENTE", ativo: false });

    assert.equal((await chamar("POST", "/login", { corpo: { email: GER1.email, senha: "tads" } })).status, 401);
  });

  test("sem email ou sem senha → 400, sem chamar o MS Auth", async () => {
    for (const corpo of [{ email: GER1.email }, { senha: "tads" }, {}]) {
      assert.equal((await chamar("POST", "/login", { corpo })).status, 400);
    }
    assert.equal(chamadasA(`POST ${MS_AUTH_URL}`).length, 0);
  });

  test("token de 8 h, e o usuario volta sem senha", async () => {
    await logar(GER1);

    const { corpo } = await chamar("POST", "/login", { corpo: { email: GER1.email, senha: "tads" } });
    const { exp, iat } = jwt.decode(corpo.token);

    assert.equal(exp - iat, 8 * 3600);
    assert.equal("senha" in corpo.usuario, false);
  });
});
