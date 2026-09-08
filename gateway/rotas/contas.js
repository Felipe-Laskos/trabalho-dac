const express = require("express");

const { NUMERO_CONTA, exigirPerfil, exigirFormato, injetarIdentidade } = require("../auth");
const { montarUrl, identidadeDe, consultar, responderErro } = require("../microsservicos");

const router = express.Router();

const SEM_PERMISSAO = {
  status: 403, erro: "Forbidden", mensagem: "Perfil sem permissão"
};

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

router.get("/:numero",
  exigirPerfil("CLIENTE", "GERENTE"), exigirFormato("numero", NUMERO_CONTA), injetarIdentidade,
  buscarConta);

module.exports = router;
