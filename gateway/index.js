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

const proxyGerente = httpProxy(process.env.MS_GERENTE_URL);

const PORTA = Number(process.env.PORT);

const app = express();

app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(limparIdentidade);

app.get("/health", (_req, res) => res.json({ status: "UP" }));

app.post("/reboot", (_req, res) => res.json({ status: "ok" }));

app.post("/login", login);

app.use(verifyJWT);

app.get("/gerentes", exigirPerfil("GERENTE"), injetarIdentidade, proxyGerente);

app.post("/logout", logout);

app.use((erro, _req, res, _next) => {
  console.error(`[gateway] erro nao tratado: ${erro.stack || erro.message}`);
  res.status(500).json({
    status: 500, erro: "Internal Server Error", mensagem: "Erro interno"
  });
});

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
