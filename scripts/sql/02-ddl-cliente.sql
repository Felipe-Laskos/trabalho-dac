--- SCHEMA CLIENTE

CREATE TABLE IF NOT EXISTS cliente.clientes (
    cpf VARCHAR(11) PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    telefone VARCHAR(20) NOT NULL,
    salario NUMERIC(19,4) NOT NULL,
    logradouro VARCHAR(120) NOT NULL,
    numero VARCHAR(10) NOT NULL,
    complemento VARCHAR(60),
    cep VARCHAR(8) NOT NULL,
    cidade VARCHAR(80) NOT NULL,
    uf CHAR(2) NOT NULL
);

CREATE TABLE IF NOT EXISTS cliente.solicitacoes (
    cpf VARCHAR(11) PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    telefone VARCHAR(20) NOT NULL,
    salario NUMERIC(19,4) NOT NULL,
    logradouro VARCHAR(120) NOT NULL,
    numero VARCHAR(10) NOT NULL,
    complemento VARCHAR(60),
    cep VARCHAR(8) NOT NULL,
    cidade VARCHAR(80) NOT NULL,
    uf CHAR(2) NOT NULL,
    -- check usado para criar regra de validação de status
    status VARCHAR(15) NOT NULL CHECK (status IN ('PENDENTE','APROVADA','NAO_APROVADA')),
    motivo VARCHAR(255),
    data_hora_processamento TIMESTAMP
);

-- criando index para facilitar a busca da solicitação por status e do cliente por nome
CREATE INDEX IF NOT EXISTS ix_solicitacoes_status ON cliente.solicitacoes (status);
CREATE INDEX IF NOT EXISTS ix_clientes_nome ON cliente.clientes (nome);

CREATE TABLE IF NOT EXISTS cliente.comandos_processados (
saga_id VARCHAR(36) NOT NULL,
tipo VARCHAR(80) NOT NULL,
processado_em TIMESTAMP NOT NULL DEFAULT now(),
PRIMARY KEY (saga_id, tipo)
);
