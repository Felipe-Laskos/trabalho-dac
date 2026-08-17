-- =============================================================
-- TABELA DE CONFERÊNCIA DO REPLAY
-- =============================================================
-- Conta | Versão | Tipo                    | Valor     | Saldo acumulado
-- 1291  | 1      | Criado                  | -         | 0.00
-- 1291  | 2      | Depósito                | 1000.00   | 1000.00
-- 1291  | 3      | Depósito                | 900.00    | 1900.00
-- 1291  | 4      | Saque                   | 550.00    | 1350.00
-- 1291  | 5      | Saque                   | 350.00    | 1000.00
-- 1291  | 6      | Depósito                | 2000.00   | 3000.00
-- 1291  | 7      | Saque                   | 500.00    | 2500.00
-- 1291  | 8      | TransferênciaOrigem     | 1700.00   | 800.00
--
-- 0950  | 1      | Criado                  | -         | 0.00
-- 0950  | 2      | TransferênciaDestino    | 1700.00   | 1700.00
-- 0950  | 3      | Depósito                | 1000.00   | 2700.00
-- 0950  | 4      | Depósito                | 5000.00   | 7700.00
-- 0950  | 5      | Saque                   | 200.00    | 7500.00
-- 0950  | 6      | Depósito                | 7000.00   | 14500.00
-- 0950  | 7      | Saque                   | 4500.00   | 10000.00
--
-- 8573  | 1      | Criado                  | -         | 0.00
-- 8573  | 2      | Depósito                | 1000.00   | 1000.00
-- 8573  | 3      | Saque                   | 800.00    | 200.00
--
-- 5887  | 1      | Criado                  | -         | 0.00
-- 5887  | 2      | Depósito                | 150000.00 | 150000.00
--
-- 7617  | 1      | Criado                  | -         | 0.00
-- 7617  | 2      | Depósito                | 1500.00   | 1500.00
-- =============================================================

BEGIN;

INSERT INTO conta_command.eventos
    (id, objeto_id, tipo, payload, versao, timestamp)
VALUES
-- Conta 1291 - Catharyna
(1, '1291', 'Criado',
 '{"cpfCliente":"12912861012","cpfGerente":"98574307084","dataCriacao":"2000-01-01","saldoInicial":"0.00"}',
 1, '2000-01-01 00:00:00'),
(2, '1291', 'Depósito', '{"valor":"1000.00"}', 2, '2020-01-01 10:00:00'),
(3, '1291', 'Depósito', '{"valor":"900.00"}', 3, '2020-01-01 11:00:00'),
(4, '1291', 'Saque', '{"valor":"550.00"}', 4, '2020-01-01 12:00:00'),
(5, '1291', 'Saque', '{"valor":"350.00"}', 5, '2020-01-01 13:00:00'),
(6, '1291', 'Depósito', '{"valor":"2000.00"}', 6, '2020-01-10 15:00:00'),
(7, '1291', 'Saque', '{"valor":"500.00"}', 7, '2020-01-15 08:00:00'),
(8, '1291', 'TransferênciaOrigem',
 '{"valor":"1700.00","origem":{"numeroConta":"1291","cpf":"12912861012","nome":"Catharyna"},"destino":{"numeroConta":"0950","cpf":"09506382000","nome":"Cleuddônio"}}',
 8, '2020-01-20 12:00:00'),

-- Conta 0950 - Cleuddônio
(9, '0950', 'Criado',
 '{"cpfCliente":"09506382000","cpfGerente":"64065268052","dataCriacao":"1990-10-10","saldoInicial":"0.00"}',
 1, '1990-10-10 00:00:00'),
(10, '0950', 'TransferênciaDestino',
 '{"valor":"1700.00","origem":{"numeroConta":"1291","cpf":"12912861012","nome":"Catharyna"},"destino":{"numeroConta":"0950","cpf":"09506382000","nome":"Cleuddônio"}}',
 2, '2020-01-20 12:00:00'),
(11, '0950', 'Depósito', '{"valor":"1000.00"}', 3, '2025-01-01 12:00:00'),
(12, '0950', 'Depósito', '{"valor":"5000.00"}', 4, '2025-01-02 10:00:00'),
(13, '0950', 'Saque', '{"valor":"200.00"}', 5, '2025-01-10 10:00:00'),
(14, '0950', 'Depósito', '{"valor":"7000.00"}', 6, '2025-02-05 10:00:00'),
(15, '0950', 'Saque', '{"valor":"4500.00"}', 7, '2025-03-06 11:00:00'),

-- Conta 8573 - Catianna
(16, '8573', 'Criado',
 '{"cpfCliente":"85733854057","cpfGerente":"23862179060","dataCriacao":"2012-12-12","saldoInicial":"0.00"}',
 1, '2012-12-12 00:00:00'),
(17, '8573', 'Depósito', '{"valor":"1000.00"}', 2, '2025-05-05 10:00:00'),
(18, '8573', 'Saque', '{"valor":"800.00"}', 3, '2025-05-06 10:00:00'),

-- Conta 5887 - Cutardo
(19, '5887', 'Criado',
 '{"cpfCliente":"58872160006","cpfGerente":"98574307084","dataCriacao":"2022-02-22","saldoInicial":"0.00"}',
 1, '2022-02-22 00:00:00'),
(20, '5887', 'Depósito', '{"valor":"150000.00"}', 2, '2025-06-01 10:00:00'),

-- Conta 7617 - Coândrya
(21, '7617', 'Criado',
 '{"cpfCliente":"76179646090","cpfGerente":"64065268052","dataCriacao":"2025-01-01","saldoInicial":"0.00"}',
 1, '2025-01-01 00:00:00'),
(22, '7617', 'Depósito', '{"valor":"1500.00"}', 2, '2025-07-01 10:00:00');

SELECT setval(
    pg_get_serial_sequence('conta_command.eventos', 'id'),
    (SELECT MAX(id) FROM conta_command.eventos),
    true
);

-- Estado atual das cinco contas no Read Model.
INSERT INTO conta_query.contas
    (numero, cpf_cliente, cpf_gerente, data_criacao, saldo, ultima_versao)
VALUES
('1291', '12912861012', '98574307084', '2000-01-01',    800.0000, 8),
('0950', '09506382000', '64065268052', '1990-10-10',  10000.0000, 7),
('8573', '85733854057', '23862179060', '2012-12-12',    200.0000, 3),
('5887', '58872160006', '98574307084', '2022-02-22', 150000.0000, 2),
('7617', '76179646090', '64065268052', '2025-01-01',   1500.0000, 2);

-- Histórico desnormalizado. A transferência aparece nas duas contas.
INSERT INTO conta_query.movimentacoes
    (id, evento_id, numero_conta, data_hora, tipo, valor, saldo_apos,
     conta_origem, cpf_origem, nome_origem,
     conta_destino, cpf_destino, nome_destino)
VALUES
(1,  2, '1291', '2020-01-01 10:00:00', 'DEPOSITO', 1000.0000, 1000.0000,
 NULL, NULL, NULL, NULL, NULL, NULL),
(2,  3, '1291', '2020-01-01 11:00:00', 'DEPOSITO', 900.0000, 1900.0000,
 NULL, NULL, NULL, NULL, NULL, NULL),
(3,  4, '1291', '2020-01-01 12:00:00', 'SAQUE', 550.0000, 1350.0000,
 NULL, NULL, NULL, NULL, NULL, NULL),
(4,  5, '1291', '2020-01-01 13:00:00', 'SAQUE', 350.0000, 1000.0000,
 NULL, NULL, NULL, NULL, NULL, NULL),
(5,  6, '1291', '2020-01-10 15:00:00', 'DEPOSITO', 2000.0000, 3000.0000,
 NULL, NULL, NULL, NULL, NULL, NULL),
(6,  7, '1291', '2020-01-15 08:00:00', 'SAQUE', 500.0000, 2500.0000,
 NULL, NULL, NULL, NULL, NULL, NULL),
(7,  8, '1291', '2020-01-20 12:00:00', 'TRANSFERENCIA', 1700.0000, 800.0000,
 '1291', '12912861012', 'Catharyna', '0950', '09506382000', 'Cleuddônio'),
(8, 10, '0950', '2020-01-20 12:00:00', 'TRANSFERENCIA', 1700.0000, 1700.0000,
 '1291', '12912861012', 'Catharyna', '0950', '09506382000', 'Cleuddônio'),
(9, 11, '0950', '2025-01-01 12:00:00', 'DEPOSITO', 1000.0000, 2700.0000,
 NULL, NULL, NULL, NULL, NULL, NULL),
(10, 12, '0950', '2025-01-02 10:00:00', 'DEPOSITO', 5000.0000, 7700.0000,
 NULL, NULL, NULL, NULL, NULL, NULL),
(11, 13, '0950', '2025-01-10 10:00:00', 'SAQUE', 200.0000, 7500.0000,
 NULL, NULL, NULL, NULL, NULL, NULL),
(12, 14, '0950', '2025-02-05 10:00:00', 'DEPOSITO', 7000.0000, 14500.0000,
 NULL, NULL, NULL, NULL, NULL, NULL),
(13, 15, '0950', '2025-03-06 11:00:00', 'SAQUE', 4500.0000, 10000.0000,
 NULL, NULL, NULL, NULL, NULL, NULL),
(14, 17, '8573', '2025-05-05 10:00:00', 'DEPOSITO', 1000.0000, 1000.0000,
 NULL, NULL, NULL, NULL, NULL, NULL),
(15, 18, '8573', '2025-05-06 10:00:00', 'SAQUE', 800.0000, 200.0000,
 NULL, NULL, NULL, NULL, NULL, NULL),
(16, 20, '5887', '2025-06-01 10:00:00', 'DEPOSITO', 150000.0000, 150000.0000,
 NULL, NULL, NULL, NULL, NULL, NULL),
(17, 22, '7617', '2025-07-01 10:00:00', 'DEPOSITO', 1500.0000, 1500.0000,
 NULL, NULL, NULL, NULL, NULL, NULL);

SELECT setval(
    pg_get_serial_sequence('conta_query.movimentacoes', 'id'),
    (SELECT MAX(id) FROM conta_query.movimentacoes),
    true
);

COMMIT;
