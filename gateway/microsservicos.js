const axios = require("axios");

const TIMEOUT_MS = 10_000;

const ROTA_SEED = "/admin/seed";

const ERROS = {
  400: { status: 400, erro: "Bad Request", mensagem: "Requisição malformada" },
  403: { status: 403, erro: "Forbidden", mensagem: "Perfil sem permissão" },
  404: { status: 404, erro: "Not Found", mensagem: "Recurso não encontrado" },
  409: { status: 409, erro: "Conflict", mensagem: "Conflito de estado" },
  422: { status: 422, erro: "Unprocessable Entity", mensagem: "Regra de negócio violada" }
};

const ERRO_INTERNO = {
  status: 500, erro: "Internal Server Error", mensagem: "Erro interno"
};

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

async function recriarSeed(baseUrl) {
  const resposta = await axios.post(baseUrl + ROTA_SEED, null, { timeout: TIMEOUT_MS });

  return resposta.data;
}

function responderErro(erro, res) {
  const status = erro.response?.status;

  if (ERROS[status]) {
    return res.status(status).json(ERROS[status]);
  }

  console.error(`[gateway] MS respondeu ${status ?? erro.code}: ${erro.message}`);
  return res.status(500).json(ERRO_INTERNO);
}

module.exports = { TIMEOUT_MS, identidadeDe, consultar, recriarSeed, responderErro };
