CREATE SCHEMA IF NOT EXISTS conta_command;
CREATE SCHEMA IF NOT EXISTS conta_query;

CREATE TABLE IF NOT EXISTS conta_command.eventos (
    id BIGSERIAL PRIMARY KEY,
    objeto_id VARCHAR(4) NOT NULL,
    tipo VARCHAR(30) NOT NULL
        CHECK (
            tipo IN (
                'Criado',
                'Saque',
                'Depósito',
                'TransferênciaOrigem',
                'TransferênciaDestino',
                'GerenteAlterado'
            )
        ),
    payload JSONB NOT NULL,
    versao INTEGER NOT NULL,
    timestamp TIMESTAMP NOT NULL,

    CONSTRAINT uk_evento_versao
        UNIQUE (objeto_id, versao)
);

CREATE INDEX IF NOT EXISTS ix_eventos_replay
    ON conta_command.eventos (objeto_id, versao);

CREATE TABLE IF NOT EXISTS conta_command.comandos_processados (
    saga_id VARCHAR(36) NOT NULL,
    tipo VARCHAR(80) NOT NULL,
    processado_em TIMESTAMP NOT NULL DEFAULT now(),

    PRIMARY KEY (saga_id, tipo)
);

CREATE TABLE IF NOT EXISTS conta_query.contas (
    numero VARCHAR(4) PRIMARY KEY,
    cpf_cliente VARCHAR(11) NOT NULL UNIQUE,
    cpf_gerente VARCHAR(11) NOT NULL,
    data_criacao DATE NOT NULL,
    saldo NUMERIC(19,4) NOT NULL DEFAULT 0,
    ultima_versao INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_contas_gerente
    ON conta_query.contas (cpf_gerente);

CREATE TABLE IF NOT EXISTS conta_query.movimentacoes (
    id BIGSERIAL PRIMARY KEY,
    evento_id BIGINT NOT NULL UNIQUE,
    numero_conta VARCHAR(4) NOT NULL,
    data_hora TIMESTAMP NOT NULL,
    tipo VARCHAR(20) NOT NULL
        CHECK (
            tipo IN (
                'DEPOSITO',
                'SAQUE',
                'TRANSFERENCIA'
            )
        ),
    valor NUMERIC(19,4) NOT NULL,
    saldo_apos NUMERIC(19,4) NOT NULL,
    conta_origem VARCHAR(4),
    cpf_origem VARCHAR(11),
    nome_origem VARCHAR(120),
    conta_destino VARCHAR(4),
    cpf_destino VARCHAR(11),
    nome_destino VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS ix_movimentacoes_extrato
    ON conta_query.movimentacoes (numero_conta, data_hora);
