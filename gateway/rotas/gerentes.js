const express = require("express");

const { CPF, exigirPerfil, exigirFormato, injetarIdentidade } = require("../auth");
const { cacheAside } = require("../redis");
const { montarUrl, identidadeDe, consultar, responderErro } = require("../microsservicos");

const router = express.Router();

async function buscarGerente(req, res) {
  const { cpf } = req.params;

  try {
    const gerente = await cacheAside(`cache:gerente:${cpf}`,
      () => consultar(
        montarUrl(process.env.MS_GERENTE_URL, "gerentes", cpf), identidadeDe(req)
      )
    );

    return res.json(gerente);
  } catch (erro) {
    return responderErro(erro, res);
  }
}

router.get("/:cpf",
  exigirPerfil("GERENTE"), exigirFormato("cpf", CPF), injetarIdentidade,
  buscarGerente);

module.exports = router;
