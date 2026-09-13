const express = require("express");

const { CPF, exigirGerenteOuProprio, exigirFormato, injetarIdentidade } = require("../auth");
const { cacheAside } = require("../redis");
const { montarUrl, identidadeDe, consultar, responderErro } = require("../microsservicos");

const router = express.Router();

async function buscarCliente(req, res) {
  const { cpf } = req.params;

  try {
    const cliente = await cacheAside(`cache:cliente:${cpf}`,
      () => consultar(
        montarUrl(process.env.MS_CLIENTE_URL, "clientes", cpf), identidadeDe(req)
      )
    );

    return res.json(cliente);
  } catch (erro) {
    return responderErro(erro, res);
  }
}

// sem cache: lado query do CQRS
async function buscarContaDoCliente(req, res) {
  const { cpf } = req.params;

  try {
    const conta = await consultar(
      montarUrl(process.env.MS_CONTA_URL, "clientes", cpf, "conta"), identidadeDe(req)
    );

    return res.json(conta);
  } catch (erro) {
    return responderErro(erro, res);
  }
}

router.get("/:cpf",
  exigirGerenteOuProprio("cpf"), exigirFormato("cpf", CPF), injetarIdentidade,
  buscarCliente);

router.get("/:cpf/conta",
  exigirGerenteOuProprio("cpf"), exigirFormato("cpf", CPF), injetarIdentidade,
  buscarContaDoCliente);

module.exports = router;
