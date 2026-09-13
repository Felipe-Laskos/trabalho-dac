const PUBLIC_URL = process.env.PUBLIC_URL || "http://localhost:8000";

function prefixar(href) {
  if (typeof href !== "string") return href;

  if (!href.startsWith("http")) return PUBLIC_URL + href;

  const { pathname, search } = new URL(href);

  return PUBLIC_URL + pathname + search;
}

function reescreverLinks(obj) {
  if (Array.isArray(obj)) return obj.map(reescreverLinks);

  if (!obj || typeof obj !== "object") return obj;

  if (obj._links) {
    for (const rel of Object.keys(obj._links)) {
      obj._links[rel].href = prefixar(obj._links[rel].href);
    }
  }

  for (const chave of Object.keys(obj)) {
    if (chave !== "_links") obj[chave] = reescreverLinks(obj[chave]);
  }

  return obj;
}

function reescreverRespostas(_req, res, next) {
  const json = res.json.bind(res);

  res.json = (corpo) => json(reescreverLinks(corpo));

  return next();
}

module.exports = { reescreverRespostas };
