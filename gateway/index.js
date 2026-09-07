require("dotenv-safe").config({ quiet: true });

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

const redis = require("./redis");
const rabbit = require("./rabbit");
const { verifyJWT, limparIdentidade } = require("./auth");
const { reescreverRespostas } = require("./links");
const { login, logout } = require("./login");
const { reboot } = require("./reboot");

const rotasClientes = require("./rotas/clientes");
const rotasContas = require("./rotas/contas");
const rotasGerentes = require("./rotas/gerentes");

const PORTA = Number(process.env.PORT);

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

app.use(reescreverRespostas);

app.post("/logout", logout);

app.use("/clientes", rotasClientes);

app.use("/contas", rotasContas);

app.use("/gerentes", rotasGerentes);

app.use((_req, res) => {
  res.status(404).json({
    status: 404, erro: "Not Found", mensagem: "Rota inexistente"
  });
});

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
