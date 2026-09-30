const crypto = require("node:crypto");
const express = require("express");

const { exigirPerfil } = require("./auth");
const { cliente: redis } = require("./redis");

const TTL_JOB = 5 * 60;

const JOB_INEXISTENTE = {
  status: 404, erro: "Not Found", mensagem: "Job inexistente ou expirado"
};

const SEM_RESULTADO = {
  status: 409, erro: "Conflict", mensagem: "Job não concluído, com falha ou sem resultado inline"
};

const router = express.Router();

async function criarJob(dominio) {
  const job = {
    jobId: crypto.randomUUID(), status: "PENDENTE",
    resultType: null, dominio, resourceId: null, erro: null
  };

  await redis.setEx(`job:${job.jobId}`, TTL_JOB, JSON.stringify(job));

  return job;
}

async function lerJob(jobId) {
  const salvo = await redis.get(`job:${jobId}`);

  return salvo ? JSON.parse(salvo) : null;
}

async function fecharJob(jobId, desfecho) {
  const job = await lerJob(jobId);

  if (!job) return false;

  await redis.setEx(`job:${jobId}`, TTL_JOB, JSON.stringify({ ...job, ...desfecho }));

  return true;
}

function concluirJob(jobId, resultado) {
  return fecharJob(jobId, {
    status: "CONCLUIDO", resultType: "inline", resourceId: null, erro: null, resultado
  });
}

function falharJob(jobId, erro) {
  return fecharJob(jobId, { status: "FALHA", resultType: null, resourceId: null, erro });
}

async function consultarStatus(req, res) {
  const job = await lerJob(req.params.jobId);

  if (!job) return res.status(404).json(JOB_INEXISTENTE);

  return res.json(job);
}

async function consultarResultado(req, res) {
  const job = await lerJob(req.params.jobId);

  if (!job) return res.status(404).json(JOB_INEXISTENTE);

  if (job.status !== "CONCLUIDO" || job.resultType !== "inline") {
    return res.status(409).json(SEM_RESULTADO);
  }

  return res.json(job.resultado);
}

router.get("/:jobId/status", exigirPerfil("CLIENTE", "GERENTE"), consultarStatus);

router.get("/:jobId/result", exigirPerfil("CLIENTE", "GERENTE"), consultarResultado);

module.exports = { router, criarJob, concluirJob, falharJob };
