-- Resultado esperado: 5 contas, 22 eventos e 17 movimentações
SELECT
    (SELECT COUNT(*) FROM conta_query.contas) AS contas,
    (SELECT COUNT(*) FROM conta_command.eventos) AS eventos,
    (SELECT COUNT(*) FROM conta_query.movimentacoes) AS movimentacoes;

-- Saldos armazenados no Read Model.
SELECT
    numero,
    saldo,
    ultima_versao
FROM conta_query.contas
ORDER BY numero;

-- Replay do Event Store e comparação com o Read Model
WITH replay AS (
    SELECT
        objeto_id AS numero,
        SUM(
            CASE
                WHEN tipo IN ('Depósito', 'TransferênciaDestino') THEN
                    (payload ->> 'valor')::NUMERIC(19,4)
                WHEN tipo IN ('Saque', 'TransferênciaOrigem') THEN
                    -(payload ->> 'valor')::NUMERIC(19,4)
                ELSE
                    0
            END
        ) AS saldo_replay
    FROM conta_command.eventos
    GROUP BY objeto_id
)
SELECT
    c.numero,
    r.saldo_replay,
    c.saldo AS saldo_read_model,
    r.saldo_replay = c.saldo AS saldos_conferem
FROM conta_query.contas AS c
JOIN replay AS r
    ON r.numero = c.numero
ORDER BY c.numero;

-- Versões por conta: devem começar em 1 e não possuir lacunas
SELECT
    objeto_id,
    MIN(versao) AS primeira_versao,
    MAX(versao) AS ultima_versao,
    COUNT(*) AS quantidade_eventos,
    MIN(versao) = 1
        AND MAX(versao) = COUNT(*) AS versoes_continuas
FROM conta_command.eventos
GROUP BY objeto_id
ORDER BY objeto_id;

-- Idempotência: cada movimentação deve apontar para um evento único
SELECT
    COUNT(*) AS movimentacoes,
    COUNT(DISTINCT evento_id) AS eventos_distintos,
    COUNT(*) = COUNT(DISTINCT evento_id) AS evento_id_unico
FROM conta_query.movimentacoes;

-- ultima_versao do Read Model deve corresponder ao Event Store
SELECT
    c.numero,
    c.ultima_versao AS versao_read_model,
    MAX(e.versao) AS versao_event_store,
    c.ultima_versao = MAX(e.versao) AS versoes_conferem
FROM conta_query.contas AS c
JOIN conta_command.eventos AS e
    ON e.objeto_id = c.numero
GROUP BY c.numero, c.ultima_versao
ORDER BY c.numero;
