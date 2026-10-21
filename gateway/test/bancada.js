const { once } = require("node:events");
const { mock } = require("node:test");

Object.assign(process.env, {
  PORT: "8000",
  SECRET: "segredo-da-bancada",
  JWT_EXPIRES_IN: "8h",
  PUBLIC_URL: "http://localhost:8000",
  REDIS_URL: "redis://redis:6379",
  RABBIT_URL: "amqp://guest:guest@rabbitmq:5672",
  MS_AUTH_URL: "http://ms-auth:8080",
  MS_CLIENTE_URL: "http://ms-cliente:8080",
  MS_GERENTE_URL: "http://ms-gerente:8080",
  MS_CONTA_URL: "http://ms-conta:8080"
});

const axios = require("axios");
const rabbit = require("../rabbit");
const { cliente } = require("../redis");

const GER1 = { cpf: "98574307084", nome: "Geniéve", email: "ger1@bantads.com.br" };

class RedisFalso {
  constructor() {
    this.limpar();
  }

  limpar() {
    this.valores = new Map();
    this.conjuntos = new Map();
    this.ttls = new Map();
  }

  async get(chave) {
    return this.valores.get(chave) ?? null;
  }

  async setEx(chave, ttl, valor) {
    this.valores.set(chave, valor);
    this.ttls.set(chave, ttl);
    return "OK";
  }

  async exists(chave) {
    return this.valores.has(chave) || this.conjuntos.has(chave) ? 1 : 0;
  }

  async expire(chave, ttl) {
    if (!(await this.exists(chave))) return 0;
    this.ttls.set(chave, ttl);
    return 1;
  }

  async del(chave) {
    const removida = this.valores.delete(chave) || this.conjuntos.delete(chave);
    this.ttls.delete(chave);
    return removida ? 1 : 0;
  }

  async type(chave) {
    if (this.valores.has(chave)) return "string";
    return this.conjuntos.has(chave) ? "set" : "none";
  }

  async sAdd(chave, membro) {
    const conjunto = this.conjuntos.get(chave) ?? new Set();
    const novo = conjunto.has(membro) ? 0 : 1;
    this.conjuntos.set(chave, conjunto.add(membro));
    return novo;
  }

  async sRem(chave, membro) {
    const conjunto = this.conjuntos.get(chave);
    if (!conjunto?.delete(membro)) return 0;
    if (!conjunto.size) await this.del(chave);
    return 1;
  }

  async sMembers(chave) {
    return [...(this.conjuntos.get(chave) ?? [])];
  }

  multi() {
    const comandos = [];
    const transacao = {
      sAdd: (...args) => (comandos.push(() => this.sAdd(...args)), transacao),
      expire: (...args) => (comandos.push(() => this.expire(...args)), transacao),
      exec: async () => {
        const resultados = [];
        for (const comando of comandos) resultados.push(await comando());
        return resultados;
      }
    };
    return transacao;
  }
}

class UpstreamFalso {
  constructor() {
    this.limpar();
  }

  limpar() {
    this.respostas = new Map();
    this.chamadas = [];
  }

  responder(metodo, url, corpo) {
    this.respostas.set(`${metodo} ${url}`, { corpo });
  }

  falhar(metodo, url, status) {
    this.respostas.set(`${metodo} ${url}`, { status });
  }

  calar(metodo, url, code) {
    this.respostas.set(`${metodo} ${url}`, { code });
  }

  async atender(metodo, url, corpo) {
    const chave = `${metodo} ${url}`;
    this.chamadas.push({ chave, corpo });

    const resposta = this.respostas.get(chave);

    if (!resposta) {
      throw Object.assign(new Error(`sem resposta falsa para ${chave}`), { code: "ECONNREFUSED" });
    }

    if (resposta.code) {
      throw Object.assign(new Error(`${resposta.code} em ${chave}`), { code: resposta.code });
    }

    if (resposta.status) {
      throw Object.assign(new Error(`Request failed with status code ${resposta.status}`),
                          { response: { status: resposta.status, data: null } });
    }

    return { data: structuredClone(resposta.corpo), headers: {} };
  }
}

const redis = new RedisFalso();
const upstream = new UpstreamFalso();
const publicadas = [];

for (const comando of ["get", "setEx", "exists", "expire", "del", "type", "sAdd", "sRem", "sMembers", "multi"]) {
  mock.method(cliente, comando, redis[comando].bind(redis));
}

mock.method(axios, "get", (url) => upstream.atender("GET", url));
mock.method(axios, "post", (url, corpo) => upstream.atender("POST", url, corpo));
mock.method(axios, "put", (url, corpo) => upstream.atender("PUT", url, corpo));

mock.method(rabbit, "publicar", async (fila, mensagem) => {
  publicadas.push({ fila, mensagem });
});

const app = require("../index");

let base;
let servidor;

async function subirGateway() {
  servidor = app.listen(0, "127.0.0.1");
  await once(servidor, "listening");
  base = `http://127.0.0.1:${servidor.address().port}`;
}

function derrubarGateway() {
  return new Promise((ok) => servidor.close(ok));
}

function zerar() {
  redis.limpar();
  upstream.limpar();
  publicadas.length = 0;
}

async function chamar(metodo, caminho, { token, corpo } = {}) {
  const headers = {};
  if (token) headers["x-access-token"] = token;
  if (corpo !== undefined) headers["content-type"] = "application/json";

  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
  });

  const texto = await resposta.text();

  return {
    status: resposta.status,
    headers: resposta.headers,
    corpo: texto ? JSON.parse(texto) : null
  };
}

async function logar(gerente) {
  upstream.responder("POST", `${process.env.MS_AUTH_URL}/auth/login`,
                     { cpf: gerente.cpf, tipo: "GERENTE", ativo: true });
  upstream.responder("GET", `${process.env.MS_GERENTE_URL}/gerentes/${gerente.cpf}`,
                     { cpf: gerente.cpf, nome: gerente.nome, email: gerente.email });

  const resposta = await chamar("POST", "/login", { corpo: { email: gerente.email, senha: "tads" } });

  if (resposta.status !== 200) throw new Error(`login de ${gerente.email} deu ${resposta.status}`);

  return resposta.corpo.token;
}

module.exports = {
  GER1, redis, upstream, publicadas,
  subirGateway, derrubarGateway, zerar, chamar, logar
};
