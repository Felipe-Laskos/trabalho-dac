const express = require("express");

const { CPF, exigirPerfil, exigirFormato, injetarIdentidade } = require("../auth");
const { montarUrl, identidadeDe, consultar, criar, responderErro } = require("../microsservicos");

// o POST é público; os GET são do gerente
const publica = express.Router();
const gerente = express.Router();

// os dois status que o POST /solicitacoes produz
const REPASSAR = [400, 409];

async function criarSolicitacao(req, res) {
  try {
    const { corpo, location } = await criar(
      montarUrl(process.env.MS_CLIENTE_URL, "solicitacoes"), req.body
    );

    if (location) res.set("Location", location);

    return res.status(201).json(corpo);
  } catch (erro) {
    return responderErro(erro, res, REPASSAR);
  }
}

async function listarSolicitacoes(req, res) {
  const { status } = req.query;

  try {
    const lista = await consultar(
      montarUrl(process.env.MS_CLIENTE_URL, "solicitacoes"),
      identidadeDe(req),
      status ? { status } : undefined
    );

    return res.json(lista);
  } catch (erro) {
    return responderErro(erro, res);
  }
}

async function buscarSolicitacao(req, res) {
  const { cpf } = req.params;

  try {
    const solicitacao = await consultar(
      montarUrl(process.env.MS_CLIENTE_URL, "solicitacoes", cpf), identidadeDe(req)
    );

    return res.json(solicitacao);
  } catch (erro) {
    return responderErro(erro, res);
  }
}

publica.post("/", criarSolicitacao);

gerente.get("/",
  exigirPerfil("GERENTE"), injetarIdentidade,
  listarSolicitacoes);

gerente.get("/:cpf",
  exigirPerfil("GERENTE"), exigirFormato("cpf", CPF), injetarIdentidade,
  buscarSolicitacao);

module.exports = { publica, gerente };
