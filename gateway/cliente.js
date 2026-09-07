const axios = require("axios");
const { cacheAside } = require("./redis");

const httpProxy = require("express-http-proxy");

const getCliente = async (cpf) => {
    const cliente = await cacheAside(`cache:cliente:${cpf}`,
        () => axios.get(`${process.env.MS_CLIENTE_URL}/clientes/${cpf}`).then(r => r.data)
    );

    return cliente;
};

const proxyCliente = httpProxy(`${process.env.MS_CLIENTE_URL}`, {
    proxyReqPathResolver: (req) => {
        return `/clientes/${req.params.cpf}`;
    },
});

const buscarCliente = async (req, res, next) => {
    try {
        const data = await getCliente(req.params.cpf);

        res.json(data);
    } catch (error) {
        next(error);
    }
};

module.exports = { getCliente, proxyCliente, buscarCliente };