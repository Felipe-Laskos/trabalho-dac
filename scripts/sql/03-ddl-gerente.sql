--- SCHEMA GERENTE

CREATE TABLE gerente.gerentes (
    cpf VARCHAR(11) PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    telefone VARCHAR(20) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

-- criando index para facilitar a busca dos gerentes ativos por nome
CREATE INDEX ix_gerentes_ativo_nome ON gerente.gerentes (ativo, nome);

CREATE TABLE gerente.comandos_processados (
saga_id VARCHAR(36) NOT NULL,
tipo VARCHAR(80) NOT NULL,
processado_em TIMESTAMP NOT NULL DEFAULT now(),
PRIMARY KEY (saga_id, tipo)
);
