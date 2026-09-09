const axios = require("axios");

const TIMEOUT_MS = 10_000;

const NAO_ENCONTRADO = {
  status: 404, erro: "Not Found", mensagem: "Recurso não encontrado"
};

const ERRO_INTERNO = {
  status: 500, erro: "Internal Server Error", mensagem: "Erro interno"
};

// codifica cada segmento
function montarUrl(base, ...segmentos) {
  return [base, ...segmentos.map(encodeURIComponent)].join("/");
}

// lê o que o injetarIdentidade pôs na requisição, os MSs confiam nesses headers
function identidadeDe(req) {
  return {
    "X-User-CPF": req.headers["x-user-cpf"],
    "X-User-Tipo": req.headers["x-user-tipo"]
  };
}

// corpo de erro por status repassado
const DE_NEGOCIO = {
  400: { erro: "Bad Request", mensagem: "Requisição malformada" },
  409: { erro: "Conflict", mensagem: "Recurso já existe" }
};

async function consultar(url, headers = {}, params) {
  const resposta = await axios.get(url, { headers, params, timeout: TIMEOUT_MS });

  return resposta.data;
}

// devolve o Location junto
async function criar(url, corpo, headers = {}) {
  const resposta = await axios.post(url, corpo, { headers, timeout: TIMEOUT_MS });

  return { corpo: resposta.data, location: resposta.headers?.location };
}

async function recriarSeed(base) {
  const resposta = await axios.post(
    montarUrl(base, "admin", "seed"), null, { timeout: TIMEOUT_MS }
  );

  return resposta.data;
}

function mensagemDoUpstream(corpo) {
  if (typeof corpo === "string") return corpo.trim() || null;

  return corpo?.mensagem || corpo?.message || null;
}

// repassar: os status que a rota chamadora realmente produz
function responderErro(erro, res, repassar = []) {
  const status = erro.response?.status;

  if (status === 404) {
    return res.status(404).json(NAO_ENCONTRADO);
  }

  if (repassar.includes(status) && DE_NEGOCIO[status]) {
    return res.status(status).json({
      status,
      erro: DE_NEGOCIO[status].erro,
      mensagem: mensagemDoUpstream(erro.response.data) ?? DE_NEGOCIO[status].mensagem
    });
  }

  console.error(`[gateway] MS respondeu ${status ?? erro.code}: ${erro.message}`);

  return res.status(500).json(ERRO_INTERNO);
}

module.exports = { montarUrl, identidadeDe, consultar, criar, recriarSeed, responderErro };
