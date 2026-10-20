const express = require("express");

const { exigirPerfil, injetarIdentidade } = require("../auth");
const { criarJob, concluirJob, falharJob } = require("../jobs");
const { montarUrl, identidadeDe, consultar } = require("../microsservicos");
const { responderAceito } = require("../saga");

const router = express.Router();

const COLLATOR = new Intl.Collator("pt-BR", { sensitivity: "base" });

const SEM_CONTA = "0.00";

const FORMATO_DINHEIRO = /^\d+\.\d{2}$/;

const FALHA_PARA_HUMANO = "Não foi possível montar o relatório de clientes agora. Tente novamente.";

// o contrato exige string com duas casas; só reformata se o MS devolver outra coisa
function dinheiro(valor) {
  const texto = String(valor ?? SEM_CONTA);

  return FORMATO_DINHEIRO.test(texto) ? texto : Number(texto).toFixed(2);
}

async function contaDe(cpf, identidade) {
  try {
    return await consultar(montarUrl(process.env.MS_CONTA_URL, "clientes", cpf, "conta"), identidade);
  } catch (erro) {
    if (erro.response?.status === 404) return null;

    throw erro;
  }
}

async function linhaDe(cpf, nomesGerentes, identidade) {
  const [cliente, conta] = await Promise.all([
    consultar(montarUrl(process.env.MS_CLIENTE_URL, "clientes", cpf), identidade),
    contaDe(cpf, identidade)
  ]);

  return {
    cpf: cliente.cpf,
    nome: cliente.nome,
    email: cliente.email,
    salario: dinheiro(cliente.salario),
    numeroConta: conta?.numero ?? null,
    saldo: dinheiro(conta?.saldo),
    cpfGerente: conta?.cpfGerente ?? null,
    nomeGerente: nomesGerentes.get(conta?.cpfGerente) ?? null
  };
}

// MS Cliente + MS Gerente em paralelo; depois, por cliente, MS Cliente (e-mail e
// salário, que a listagem resumida não traz) + MS Conta query (conta e saldo),
// também em paralelo — nada de await em sequência
async function montarRelatorio(identidade) {
  const [resumos, gerentes] = await Promise.all([
    consultar(montarUrl(process.env.MS_CLIENTE_URL, "clientes"), identidade),
    consultar(montarUrl(process.env.MS_GERENTE_URL, "gerentes"), identidade)
  ]);

  const nomesGerentes = new Map(gerentes.map((gerente) => [gerente.cpf, gerente.nome]));

  const linhas = await Promise.all(
    resumos.map(({ cpf }) => linhaDe(cpf, nomesGerentes, identidade))
  );

  linhas.sort((a, b) => COLLATOR.compare(a.nome, b.nome));

  return { clientes: linhas };
}

async function gerarRelatorio(req, res) {
  // capturada antes de responder: a composição continua depois do 202
  const identidade = identidadeDe(req);

  const job = await criarJob("clientes");

  responderAceito(res, job);

  montarRelatorio(identidade)
    .then((resultado) => concluirJob(job.jobId, resultado))
    .catch(async (erro) => {
      console.error(`[relatorios] jobId=${job.jobId} falhou: ${erro.message}`);

      await falharJob(job.jobId, FALHA_PARA_HUMANO).catch(() => {});
    });
}

router.get("/clientes",
  exigirPerfil("GERENTE"), injetarIdentidade,
  gerarRelatorio);

module.exports = router;
