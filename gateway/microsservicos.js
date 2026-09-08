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

async function consultar(url, headers = {}) {
  const resposta = await axios.get(url, { headers, timeout: TIMEOUT_MS });

  return resposta.data;
}

async function recriarSeed(base) {
  const resposta = await axios.post(
    montarUrl(base, "admin", "seed"), null, { timeout: TIMEOUT_MS }
  );

  return resposta.data;
}

function responderErro(erro, res) {
  if (erro.response?.status === 404) {
    return res.status(404).json(NAO_ENCONTRADO);
  }

  const status = erro.response?.status ?? erro.code;
  console.error(`[gateway] MS respondeu ${status}: ${erro.message}`);

  return res.status(500).json(ERRO_INTERNO);
}

module.exports = { montarUrl, identidadeDe, consultar, recriarSeed, responderErro };
