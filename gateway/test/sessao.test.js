const assert = require("node:assert/strict");
const { after, before, beforeEach, test } = require("node:test");

const jwt = require("jsonwebtoken");

const { GER1, redis, subirGateway, derrubarGateway, zerar, chamar, logar } = require("./bancada");

const REVERSA = `sessao:cpf:${GER1.cpf}`;

const jtiDe = (token) => jwt.decode(token).jti;

const tokenVale = async (token) => (await chamar("GET", "/jobs/qualquer/status", { token })).status === 404;

before(subirGateway);
after(derrubarGateway);
beforeEach(zerar);

test("dois logins do mesmo CPF entram no SET e os dois tokens valem", async () => {
  const primeiro = await logar(GER1);
  const segundo = await logar(GER1);

  assert.equal(await redis.type(REVERSA), "set");
  assert.deepEqual((await redis.sMembers(REVERSA)).sort(), [jtiDe(primeiro), jtiDe(segundo)].sort());
  assert.ok(await tokenVale(primeiro));
  assert.ok(await tokenVale(segundo));
});

test("logout de um derruba só aquele token e tira só o jti dele do SET", async () => {
  const primeiro = await logar(GER1);
  const segundo = await logar(GER1);

  const { status } = await chamar("POST", "/logout", { token: primeiro });

  assert.equal(status, 204);
  assert.equal(await tokenVale(primeiro), false);
  assert.ok(await tokenVale(segundo));
  assert.deepEqual(await redis.sMembers(REVERSA), [jtiDe(segundo)]);
  assert.equal(await redis.exists(`sessao:${jtiDe(primeiro)}`), 0);
  assert.equal(await redis.exists(`revogado:${jtiDe(primeiro)}`), 1);
});
