const express = require("express");

const { exigirGerenteOuProprio, injetarIdentidade } = require("../auth");
const { cacheAside } = require("../redis");
const { identidadeDe, consultar, responderErro } = require("../microsservicos");

const router = express.Router();

async function buscarCliente(req, res) {
  const { cpf } = req.params;

  try {
    const cliente = await cacheAside(`cache:cliente:${cpf}`,
      () => consultar(`${process.env.MS_CLIENTE_URL}/clientes/${cpf}`, identidadeDe(req))
    );

    return res.json(cliente);
  } catch (erro) {
    return responderErro(erro, res);
  }
}

async function buscarContaDoCliente(req, res) {
  const { cpf } = req.params;

  try {
    const conta = await consultar(
      `${process.env.MS_CONTA_URL}/clientes/${cpf}/conta`, identidadeDe(req)
    );

    return res.json(conta);
  } catch (erro) {
    return responderErro(erro, res);
  }
}

router.get("/:cpf", exigirGerenteOuProprio("cpf"), injetarIdentidade, buscarCliente);

router.get("/:cpf/conta", exigirGerenteOuProprio("cpf"), injetarIdentidade, buscarContaDoCliente);

module.exports = router;
