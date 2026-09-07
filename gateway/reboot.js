const redis = require("./redis");
const { recriarSeed } = require("./microsservicos");

const CHAVES = ["sessao:*", "job:*", "cache:*", "revogado:*", "saga:*"];

async function reboot(_req, res) {
  const removidas = await redis.limpar(...CHAVES);

  console.log(`[gateway] reboot: ${removidas} chaves removidas do Redis`);

  const [cliente, gerente, conta] = await Promise.all([
    recriarSeed(process.env.MS_CLIENTE_URL),
    recriarSeed(process.env.MS_GERENTE_URL),
    recriarSeed(process.env.MS_CONTA_URL),
    recriarSeed(process.env.MS_AUTH_URL)
  ]);

  return res.status(200).json({
    status: "ok",
    clientes: cliente.total,
    gerentes: gerente.total,
    contas: conta.total
  });
}

module.exports = { CHAVES, reboot };
