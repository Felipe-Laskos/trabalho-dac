const amqp = require('amqplib');
const topologia = require('./topologia');

const TENTATIVAS = 10;
const ESPERA_MS = 3000;

let canal;

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

class BrokerIndisponivel extends Error {}

async function abrir() {
  const conexao = await amqp.connect(process.env.RABBIT_URL);

  conexao.on('error', (erro) => console.warn(`RabbitMQ: erro na conexão: ${erro.message}`));

  try {
    const novo = await conexao.createConfirmChannel();
    novo.on('error', (erro) => console.warn(`RabbitMQ: erro no canal: ${erro.message}`));
    novo.once('close', () => conexao.close().catch(() => {}));

    const declarada = await topologia.declarar(novo);

    conexao.once('close', reconectar);
    canal = novo;

    return declarada;
  } catch (erro) {
    await conexao.close().catch(() => {});
    throw erro;
  }
}

async function conectar() {
  let ultimoErro;

  for (let i = 1; i <= TENTATIVAS; i += 1) {
    try {
      return await abrir();
    } catch (erro) {
      ultimoErro = erro;
      console.warn(`RabbitMQ: tentativa ${i}/${TENTATIVAS} falhou: ${erro.message}`);
      await espera(ESPERA_MS);
    }
  }

  throw ultimoErro;
}

async function reconectar() {
  canal = null;
  console.warn('RabbitMQ: conexão perdida, reconectando');

  for (let i = 1; ; i += 1) {
    await espera(ESPERA_MS);

    try {
      await abrir();
      console.log(`RabbitMQ: reconectado na tentativa ${i}`);
      return;
    } catch (erro) {
      console.warn(`RabbitMQ: reconexão ${i} falhou: ${erro.message}`);
    }
  }
}

async function publicar(fila, mensagem) {
  if (!canal) throw new BrokerIndisponivel('RabbitMQ: sem conexão');

  try {
    canal.sendToQueue(fila, Buffer.from(JSON.stringify(mensagem)), {
      persistent: true, contentType: 'application/json',
    });
    await canal.waitForConfirms();
  } catch (erro) {
    throw new BrokerIndisponivel(`RabbitMQ: publicação em ${fila} falhou: ${erro.message}`);
  }
}

module.exports = { BrokerIndisponivel, conectar, publicar, obterCanal: () => canal };
