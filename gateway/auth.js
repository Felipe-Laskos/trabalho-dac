const jwt = require("jsonwebtoken");

const { cliente: redis } = require("./redis");

const TTL_SESSAO = 30 * 60;

const SEM_TOKEN = { auth: false, message: "Token não fornecido."};

const TOKEN_RUIM = { auth: false, message: "Falha ao autenticar o token."};

async function verifyJWT(req, res, next) {
  const token = req.headers["x-access-token"];

  if(!token) {
    return res.status(401).json(SEM_TOKEN);
  }

  let decodificado;

  try {
    decodificado = jwt.verify(token, process.env.SECRET);
  } catch {
    return res.status(401).json(TOKEN_RUIM);
  }

  const { jti, cpf } = decodificado;

  if (await redis.exists(`revogado:${jti}`)) {
    return res.status(401).json(TOKEN_RUIM);
  }


  const sessao = await redis.get(`sessao:${jti}`);

  if(!sessao) {
    return res.status(401).json(TOKEN_RUIM);
  }

  const dados = JSON.parse(sessao);

  await Promise.all([
    redis.expire(`sessao:${jti}`, TTL_SESSAO),
    redis.expire(`sessao:cpf:${dados.cpf}`, TTL_SESSAO)
  ]);

  req.usuario = { cpf: dados.cpf, tipo: dados.tipo, jti, exp: decodificado.exp };
  return next();
}

function exigirPerfil(...perfis) {
  return (req, res, next) => {
    if (!perfis.includes(req.usuario.tipo)) {
      return res.status(403).json({
        status: 403, erro: "Forbidden", mensagem: "Perfil sem permissão"
      });
    }
    return next();
  };
}

function limparIdentidade(req, _res, next) {
  delete req.headers["x-user-cpf"];
  delete req.headers["x-user-tipo"];
  return next();
}

function injetarIdentidade(req, _res, next) {
  req.headers["x-user-cpf"] = req.usuario.cpf;
  req.headers["x-user-tipo"] = req.usuario.tipo;
  return next();
}

module.exports = { TTL_SESSAO, verifyJWT, exigirPerfil, limparIdentidade, injetarIdentidade };
