const { criarJob, falharJob } = require("./jobs");
const { publicar } = require("./rabbit");

const NAO_PUBLICADA = "Não foi possível iniciar a operação agora. Tente novamente em instantes.";

const dois = (n) => String(n).padStart(2, "0");

function agora() {
  const d = new Date();

  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`
    + `T${dois(d.getHours())}:${dois(d.getMinutes())}:${dois(d.getSeconds())}`;
}

async function iniciarSaga(tipo, dominio, payload) {
  const job = await criarJob(dominio);

  try {
    await publicar("saga.cmd", { sagaId: job.jobId, tipo, timestamp: agora(), payload });
  } catch (erro) {
    await falharJob(job.jobId, NAO_PUBLICADA).catch(() => {});
    throw erro;
  }

  return job;
}

function responderAceito(res, job) {
  return res.status(202).location(`/jobs/${job.jobId}/status`).json(job);
}

module.exports = { iniciarSaga, responderAceito };
