const { randomUUID } = require("node:crypto");

const axios = require("axios");
const jwt = require("jsonwebtoken");

const { cliente: redis } = require("./redis");
const { TTL_SESSAO } = require("./auth");

const LOGIN_INVALIDO = { auth: false, message: "Login inválido!" };

async function login(req, res) {
  const { email, senha } = req.body || {};

  if (!email || !senha) {
    return res.status(400).json({
      status: 400, erro: "Bad Request", mensagem: "email e senha são obrigatórios"
    });
  }

  let credencial;
  try {
    const resposta = await axios.post(`${process.env.MS_AUTH_URL}/auth/login`,
                                      { login: email, senha });
    credencial = resposta.data;
  } catch {
    return res.status(401).json(LOGIN_INVALIDO);
  }

  if (!credencial || credencial.ativo === false) {
    return res.status(401).json(LOGIN_INVALIDO);
  }

  const ehCliente = credencial.tipo === "CLIENTE";
  const base = ehCliente ? process.env.MS_CLIENTE_URL : process.env.MS_GERENTE_URL;
  const recurso = ehCliente ? "clientes" : "gerentes";

  let pessoa;
  try {
    const resposta = await axios.get(`${base}/${recurso}/${credencial.cpf}`);
    pessoa = resposta.data;
  } catch (erro) {
    console.error(`[login] ${credencial.tipo} ${credencial.cpf} existe no MS Auth `
                + `mas nao em ${base}/${recurso}: ${erro.message}`);
    return res.status(500).json({
      status: 500, erro: "Internal Server Error", mensagem: "Cadastro indisponível"
    });
  }

  const jti = randomUUID();
  const token = jwt.sign(
    { cpf: credencial.cpf, tipo: credencial.tipo, jti },
    process.env.SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );

  const sessao = JSON.stringify({ cpf: credencial.cpf, tipo: credencial.tipo });

  const jtiAnterior = await redis.get(`sessao:cpf:${credencial.cpf}`);

  if (jtiAnterior) await redis.del(`sessao:${jtiAnterior}`);

  await Promise.all([
    redis.setEx(`sessao:${jti}`, TTL_SESSAO, sessao),
    redis.setEx(`sessao:cpf:${credencial.cpf}`, TTL_SESSAO, jti)
  ]);

  return res.json({
    auth: true,
    token,
    tipo: credencial.tipo,
    usuario: { cpf: credencial.cpf, nome: pessoa.nome, email: pessoa.email }
  });
}

async function logout(req, res) {
  const { jti, cpf, exp } = req.usuario;

  const restante = Math.max(1, exp - Math.floor(Date.now() / 1000));

  await Promise.all([
    redis.del(`sessao:${jti}`),
    redis.del(`sessao:cpf:${cpf}`),
    redis.setEx(`revogado:${jti}`, restante, "1")
  ]);

  return res.status(204).send();
}

module.exports = { login, logout }
