const { createClient } = require('redis');

const cliente = createClient({ url: process.env.REDIS_URL });

cliente.on('error', (erro) => console.error(`Redis: erro: ${erro.message}`));

async function conectar() {
  await cliente.connect();
  await cliente.ping();
  return cliente;
}

module.exports = { cliente, conectar };
