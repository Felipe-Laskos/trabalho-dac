const DLQS = {
  'ms.cliente.cmd': 'ms.cliente.cmd.dlq',
  'ms.conta.cmd': 'ms.conta.cmd.dlq',
  'ms.gerente.cmd': 'ms.gerente.cmd.dlq',
  'ms.auth.cmd': 'ms.auth.cmd.dlq',
  'ms.conta.events': 'ms.conta.events.dlq',
};

const FILAS = [
  'saga.cmd',
  'ms.cliente.cmd',
  'ms.conta.cmd',
  'ms.gerente.cmd',
  'ms.auth.cmd',
  'ms.email.cmd',
  'orquestrador.reply',
  'ms.conta.events',
];

async function declarar(canal) {
  for (const dlq of Object.values(DLQS)) {
    await canal.assertQueue(dlq, { durable: true });
  }

  for (const fila of FILAS) {
    const argumentos = DLQS[fila]
      ? { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': DLQS[fila] }
      : {};
    await canal.assertQueue(fila, { durable: true, arguments: argumentos });
  }

  return { filas: FILAS.length, dlqs: Object.keys(DLQS).length };
}

module.exports = { FILAS, DLQS, declarar };
