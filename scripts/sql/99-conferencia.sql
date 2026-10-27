-- Conferencia do seed: guia/10-modelagem-dados, secao 9.
-- Executar apos a carga inicial e apos cada /reboot.

-- 5 contas, 22 eventos e 17 movimentacoes.
SELECT (SELECT count(*) FROM conta_query.contas)        AS contas,
       (SELECT count(*) FROM conta_command.eventos)     AS eventos,
       (SELECT count(*) FROM conta_query.movimentacoes) AS movimentacoes;

-- Saldos do read model conforme a tabela do enunciado.
SELECT numero, saldo FROM conta_query.contas ORDER BY numero;
-- 0950 |  10000.0000
-- 1291 |    800.0000
-- 5887 | 150000.0000
-- 7617 |   1500.0000
-- 8573 |    200.0000

-- Replay do event store, independente do read model.
SELECT objeto_id,
       SUM(CASE WHEN tipo IN ('Depósito', 'TransferênciaDestino')
                THEN (payload->>'valor')::numeric
                WHEN tipo IN ('Saque', 'TransferênciaOrigem')
                THEN -(payload->>'valor')::numeric
                ELSE 0 END) AS saldo_por_replay
FROM conta_command.eventos GROUP BY objeto_id ORDER BY objeto_id;

-- Evidencia conjunta: as cinco contas devem retornar true nas duas colunas finais.
WITH esperado(numero, saldo) AS (
    VALUES ('0950', 10000.0000::numeric), ('1291', 800.0000::numeric),
           ('5887', 150000.0000::numeric), ('7617', 1500.0000::numeric),
           ('8573', 200.0000::numeric)
), replay AS (
    SELECT objeto_id AS numero,
           SUM(CASE WHEN tipo IN ('Depósito', 'TransferênciaDestino')
                    THEN (payload->>'valor')::numeric
                    WHEN tipo IN ('Saque', 'TransferênciaOrigem')
                    THEN -(payload->>'valor')::numeric
                    ELSE 0 END) AS saldo
    FROM conta_command.eventos GROUP BY objeto_id
)
SELECT e.numero, e.saldo AS saldo_enunciado,
       r.saldo AS saldo_replay, c.saldo AS saldo_read_model,
       r.saldo = e.saldo AS replay_confere,
       c.saldo = e.saldo AS read_model_confere
FROM esperado e
LEFT JOIN replay r ON r.numero = e.numero
LEFT JOIN conta_query.contas c ON c.numero = e.numero
ORDER BY e.numero;

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
