const express = require("express");

const { CPF, exigirPerfil, exigirFormato, injetarIdentidade } = require("../auth");
const { cacheAside, cliente: redis } = require("../redis");
const { montarUrl, identidadeDe, consultar, atualizar, responderErro } = require("../microsservicos");
const { iniciarSaga, responderAceito } = require("../saga");

const router = express.Router();

const COLLATOR = new Intl.Collator("pt-BR", { sensitivity: "base" });

const CAMPOS_OBRIGATORIOS = {
  status: 400, erro: "Bad Request",
  mensagem: "cpf (11 dígitos), nome, email, telefone e senha são obrigatórios"
};

const AUTO_REMOCAO = {
  status: 403, erro: "Forbidden", mensagem: "Um gerente não pode remover a si mesmo"
};

async function gerenteDaConta(cpfCliente, req) {
  try {
    const { cpfGerente } = await consultar(
      montarUrl(process.env.MS_CONTA_URL, "clientes", cpfCliente, "conta"), identidadeDe(req)
    );

    return cpfGerente;
  } catch (erro) {
    if (erro.response?.status === 404) return null;

    throw erro;
  }
}

async function clientesPorGerente(req) {
  const clientes = await consultar(montarUrl(process.env.MS_CLIENTE_URL, "clientes"), identidadeDe(req));

  const gerentes = await Promise.all(clientes.map((cliente) => gerenteDaConta(cliente.cpf, req)));

  const contagem = new Map();
  for (const cpf of gerentes.filter(Boolean)) contagem.set(cpf, (contagem.get(cpf) ?? 0) + 1);

  return contagem;
}

async function listarGerentes(req, res) {
  try {
    const [gerentes, contagem] = await Promise.all([
      consultar(montarUrl(process.env.MS_GERENTE_URL, "gerentes"), identidadeDe(req)),
      clientesPorGerente(req)
    ]);

    const ativos = gerentes
      .filter((gerente) => gerente.ativo)
      .map((gerente) => ({ ...gerente, quantidadeClientes: contagem.get(gerente.cpf) ?? 0 }))
      .sort((a, b) => COLLATOR.compare(a.nome, b.nome));

    return res.json({ gerentes: ativos, _links: { self: { href: "/gerentes" } } });
  } catch (erro) {
    return responderErro(erro, res);
  }
}

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

async function inserirGerente(req, res) {
  const { cpf, nome, email, telefone, senha } = req.body || {};

  if (!CPF.test(cpf ?? "") || !nome || !email || !telefone || !senha) {
    return res.status(400).json(CAMPOS_OBRIGATORIOS);
  }

  const job = await iniciarSaga("inserir-gerente", "gerentes", {
    cpf, nome, email, telefone, senha, cpfGerenteSolicitante: req.usuario.cpf
  });

  return responderAceito(res, job);
}

async function atualizarGerente(req, res) {
  const { cpf } = req.params;

  try {
    const gerente = await atualizar(
      montarUrl(process.env.MS_GERENTE_URL, "gerentes", cpf), req.body, identidadeDe(req)
    );

    await redis.del(`cache:gerente:${cpf}`);

    return res.json(gerente);
  } catch (erro) {
    return responderErro(erro, res, [400]);
  }
}

async function removerGerente(req, res) {
  const { cpf } = req.params;

  if (cpf === req.usuario.cpf) return res.status(403).json(AUTO_REMOCAO);

  const job = await iniciarSaga("remover-gerente", "gerentes", {
    cpf, cpfGerenteSolicitante: req.usuario.cpf
  });

  return responderAceito(res, job);
}

router.get("/",
  exigirPerfil("GERENTE"), injetarIdentidade,
  listarGerentes);

router.post("/",
  exigirPerfil("GERENTE"),
  inserirGerente);

router.get("/:cpf",
  exigirPerfil("GERENTE"), exigirFormato("cpf", CPF), injetarIdentidade,
  buscarGerente);

router.put("/:cpf",
  exigirPerfil("GERENTE"), exigirFormato("cpf", CPF), injetarIdentidade,
  atualizarGerente);

router.delete("/:cpf",
  exigirPerfil("GERENTE"), exigirFormato("cpf", CPF),
  removerGerente);

module.exports = router;
