const amqp = require('amqplib');
const topologia = require('./topologia');

const TENTATIVAS = 10;
const ESPERA_MS = 3000;

let conexao;
let canal;

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function conectar() {
  let ultimoErro;

  for (let i = 1; i <= TENTATIVAS; i += 1) {
    try {
      conexao = await amqp.connect(process.env.RABBIT_URL);
      canal = await conexao.createChannel();
      return await topologia.declarar(canal);
    } catch (erro) {
      ultimoErro = erro;
      console.warn(`RabbitMQ: tentativa ${i}/${TENTATIVAS} falhou: ${erro.message}`);
      await espera(ESPERA_MS);
    }
  }

  throw ultimoErro;
}

module.exports = { conectar, obterCanal: () => canal };
