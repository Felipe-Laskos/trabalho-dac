const { createClient } = require('redis');

const cliente = createClient({ url: process.env.REDIS_URL });

const TTL_CACHE = 5 * 60;

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

async function cacheAside(chave, buscar) {
  const hit = await cliente.get(chave);

  if(hit) return JSON.parse(hit);

  const dado = await buscar();

  await cliente.setEx(chave, TTL_CACHE, JSON.stringify(dado));

  return dado;
}

module.exports = { cliente, conectar, limpar, cacheAside };
