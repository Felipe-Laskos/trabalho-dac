require("dotenv-safe").config({ quiet: true });

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const httpProxy = require("express-http-proxy");

const redis = require("./redis");
const rabbit = require("./rabbit");
const { verifyJWT, limparIdentidade, exigirPerfil, injetarIdentidade } = require("./auth");
const { login, logout } = require("./login");
const axios = require("axios");
const { buscarCliente } = require("./cliente")

const proxyGerente = httpProxy(process.env.MS_GERENTE_URL);

const PORTA = Number(process.env.PORT);

const REBOOT_REDIS = ["sessao:*", "job:*", "cache:*", "revogado:*", "saga:*"];

const app = express();

app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(limparIdentidade);

app.get("/health", (_req, res) => res.json({ status: "UP" }));

app.post("/reboot", reboot);

app.post("/login", login);

app.use(verifyJWT);

app.get("/clientes/:cpf", exigirPerfil("CLIENTE"), injetarIdentidade, buscarCliente);

app.get("/gerentes", exigirPerfil("GERENTE"), injetarIdentidade, proxyGerente);

app.post("/logout", logout);

app.use((erro, _req, res, _next) => {
  console.error(`[gateway] erro nao tratado: ${erro.stack || erro.message}`);
  res.status(500).json({
    status: 500, erro: "Internal Server Error", mensagem: "Erro interno"
  });
});

async function reboot(req, res) {
  const chavesRemovidas = await redis.limpar(...REBOOT_REDIS);

  const ROTA_SEED = "/admin/seed";

  const [ms_cliente, ms_gerente, ms_conta, ms_auth] = await Promise.all([
    axios.post(process.env.MS_CLIENTE_URL + ROTA_SEED),
    axios.post(process.env.MS_GERENTE_URL + ROTA_SEED),
    axios.post(process.env.MS_CONTA_URL + ROTA_SEED),
    axios.post(process.env.MS_AUTH_URL + ROTA_SEED),
  ]);

  // console.log(ms_cliente.data, ms_gerente.data, ms_conta.data, ms_auth.data);

  return res.status(200).json({
    status: "ok",
    clientes: ms_cliente.data.total,
    gerentes: ms_gerente.data.total,
    contas: ms_conta.data.total
  });
}

async function subir() {
  await redis.conectar();
  console.log(`Redis: conectado em ${process.env.REDIS_URL}`);

  const { filas, dlqs } = await rabbit.conectar();
  console.log(`RabbitMQ: conectado em ${process.env.RABBIT_URL}`);
  console.log(`RabbitMQ: topologia declarada: ${filas} filas + ${dlqs} DLQs`);

  app.listen(PORTA, () => console.log(`[gateway] ouvindo na porta ${PORTA}`));
}

subir().catch((erro) => {
  console.error(`Gateway: falha na subida: ${erro.message}`);
  process.exit(1);
});
