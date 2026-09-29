const { criarJob } = require("./jobs");
const { publicar } = require("./rabbit");

const dois = (n) => String(n).padStart(2, "0");

function agora() {
  const d = new Date();

  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`
    + `T${dois(d.getHours())}:${dois(d.getMinutes())}:${dois(d.getSeconds())}`;
}

async function iniciarSaga(tipo, dominio, payload) {
  const job = await criarJob(dominio);

  await publicar("saga.cmd", { sagaId: job.jobId, tipo, timestamp: agora(), payload });

  return job;
}

function responderAceito(res, job) {
  return res.status(202).location(`/jobs/${job.jobId}/status`).json(job);
}

module.exports = { iniciarSaga, responderAceito };
