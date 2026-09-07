const { createClient } = require('redis');

const cliente = createClient({ url: process.env.REDIS_URL });

cliente.on('error', (erro) => console.error(`Redis: erro: ${erro.message}`));

async function conectar() {
  await cliente.connect();
  await cliente.ping();
  return cliente;
}

async function limpar(...padroes) {
  let removidas = 0;

  for (const padrao of padroes) {
    for await (const chaves of cliente.scanIterator({ MATCH: padrao, COUNT: 500 })) {
      if (chaves.length) removidas += await cliente.unlink(chaves);
    }
  }

  return removidas;
}

module.exports = { cliente, conectar, limpar };
