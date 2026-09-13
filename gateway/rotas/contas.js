const express = require("express");

const { NUMERO_CONTA, exigirPerfil, exigirFormato, injetarIdentidade } = require("../auth");
const { montarUrl, identidadeDe, consultar, responderErro, criar } = require("../microsservicos");

const router = express.Router();

const SEM_PERMISSAO = {
  status: 403, erro: "Forbidden", mensagem: "Perfil sem permissão"
};

const DESTINO_INEXISTENTE = {
  status: 422, erro: "Unprocessable Entity", mensagem: "Conta destino inexistente"
};

const REPASSAR = [400, 403, 409, 422];

// a posse só pode ser decidida depois da busca
async function buscarConta(req, res) {
  const { numero } = req.params;

  try {
    const conta = await consultar(
      montarUrl(process.env.MS_CONTA_URL, "contas", numero), identidadeDe(req)
    );

    if (req.usuario.tipo === "CLIENTE" && conta.cpfCliente !== req.usuario.cpf) {
      return res.status(403).json(SEM_PERMISSAO);
    }

    return res.json(conta);
  } catch (erro) {
    return responderErro(erro, res);
  }
}

function operacao(nome) {
  return async (req, res) => {
    try {
      const { corpo } = await criar(
        montarUrl(process.env.MS_CONTA_URL, "contas", req.params.numero, nome),
        req.body, identidadeDe(req)
      );

      return res.status(201).json(corpo);
    } catch (erro) {
      return responderErro(erro, res, REPASSAR);
    }
  };
}

async function transferir(req, res) {
  const { contaDestino, valor } = req.body || {};

  if(!NUMERO_CONTA.test(contaDestino ?? "")) {
    return res.status(422).json(DESTINO_INEXISTENTE);
  }

  let destino;

  try {
    destino = await consultar(
      montarUrl(process.env.MS_CONTA_URL, "contas", contaDestino), identidadeDe(req)
    );
  } catch (erro) {
    if(erro.response?.status !== 404) return responderErro(erro, res, REPASSAR);

    return res.status(422).json(DESTINO_INEXISTENTE);
  }

  try {
    const [clienteOrigem, clienteDestino] = await Promise.all([
      consultar(montarUrl(process.env.MS_CLIENTE_URL, "clientes", req.usuario.cpf),
      identidadeDe(req)),
      consultar(montarUrl(process.env.MS_CLIENTE_URL, "clientes", destino.cpfCliente),
      identidadeDe(req))
    ]);

    const { corpo } = await criar(
      montarUrl(process.env.MS_CONTA_URL, "contas", req.params.numero, "transferencia"),
      {
        contaDestino,
        valor,
        origem: { cpf: req.usuario.cpf, nome: clienteOrigem.nome },
        destino: { cpf: destino.cpfCliente, nome: clienteDestino.nome },
      },
      identidadeDe(req)
    );

    return res.status(201).json(corpo);
  } catch (erro) {
    return responderErro(erro, res, REPASSAR);
  }
}

async function buscarExtrato(req, res) {
  const { numero } = req.params;

  try {
    const extrato = await consultar(
      montarUrl(process.env.MS_CONTA_URL, "contas", numero, "extrato"),
      identidadeDe(req), req.query
    );

    return res.json(extrato);
  } catch (erro) {
    return responderErro(erro, res, REPASSAR);
  }
}

router.get("/:numero",
  exigirPerfil("CLIENTE", "GERENTE"), exigirFormato("numero", NUMERO_CONTA), injetarIdentidade,
  buscarConta);

router.get("/:numero/extrato", exigirPerfil("CLIENTE", "GERENTE"), exigirFormato("numero", NUMERO_CONTA), injetarIdentidade, buscarExtrato);

router.post("/:numero/deposito", exigirPerfil("CLIENTE"), exigirFormato("numero", NUMERO_CONTA), injetarIdentidade, operacao("deposito"));

router.post("/:numero/saque", exigirPerfil("CLIENTE"), exigirFormato("numero", NUMERO_CONTA), injetarIdentidade, operacao("saque"));

router.post("/:numero/transferencia", exigirPerfil("CLIENTE"), exigirFormato("numero", NUMERO_CONTA), injetarIdentidade, transferir);

module.exports = router;
