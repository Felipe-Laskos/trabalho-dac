const express = require("express");

const { CPF, exigirPerfil, exigirGerenteOuProprio, exigirFormato, injetarIdentidade } = require("../auth");
const { cacheAside } = require("../redis");
const { montarUrl, identidadeDe, consultar, responderErro } = require("../microsservicos");

const router = express.Router();

const SEM_CONTA = "0.00";

async function saldoDe(cpf, req) {
  try {
    const { saldo } = await consultar(
      montarUrl(process.env.MS_CONTA_URL, "clientes", cpf, "conta"), identidadeDe(req)
    );

    return saldo;
  } catch (erro) {
    if (erro.response?.status === 404) return SEM_CONTA;

    throw erro;
  }
}

async function listarClientes(req, res) {
  const { busca } = req.query;

  try {
    const clientes = await consultar(
      montarUrl(process.env.MS_CLIENTE_URL, "clientes"),
      identidadeDe(req),
      busca ? { busca } : undefined
    );

    const comSaldo = await Promise.all(clientes.map(
      async (cliente) => ({ ...cliente, saldo: await saldoDe(cliente.cpf, req) })
    ));

    return res.json({ clientes: comSaldo, _links: { self: { href: "/clientes" } } });
  } catch (erro) {
    return responderErro(erro, res);
  }
}

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

router.get("/",
  exigirPerfil("GERENTE"), injetarIdentidade,
  listarClientes);

router.get("/:cpf",
  exigirGerenteOuProprio("cpf"), exigirFormato("cpf", CPF), injetarIdentidade,
  buscarCliente);

router.get("/:cpf/conta",
  exigirGerenteOuProprio("cpf"), exigirFormato("cpf", CPF), injetarIdentidade,
  buscarContaDoCliente);

module.exports = router;
