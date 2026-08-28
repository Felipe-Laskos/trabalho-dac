TRUNCATE TABLE conta_command.eventos RESTART IDENTITY CASCADE;

INSERT INTO conta_command.eventos
    (id, objeto_id, tipo, payload, versao, timestamp)
VALUES
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
 '{"valor":"1700.00","origem":{"numeroConta":"1291","cpf":"12912861012","nome":"Catharyna"},"destino":{"numeroConta":"0950","cpf":"09506382000","nome":"Cleuddonio"}}',
 8, '2020-01-20 12:00:00'),
(9, '0950', 'Criado',
 '{"cpfCliente":"09506382000","cpfGerente":"64065268052","dataCriacao":"1990-10-10","saldoInicial":"0.00"}',
 1, '1990-10-10 00:00:00'),
(10, '0950', 'TransferênciaDestino',
 '{"valor":"1700.00","origem":{"numeroConta":"1291","cpf":"12912861012","nome":"Catharyna"},"destino":{"numeroConta":"0950","cpf":"09506382000","nome":"Cleuddonio"}}',
 2, '2020-01-20 12:00:00'),
(11, '0950', 'Depósito', '{"valor":"1000.00"}', 3, '2025-01-01 12:00:00'),
(12, '0950', 'Depósito', '{"valor":"5000.00"}', 4, '2025-01-02 10:00:00'),
(13, '0950', 'Saque', '{"valor":"200.00"}', 5, '2025-01-10 10:00:00'),
(14, '0950', 'Depósito', '{"valor":"7000.00"}', 6, '2025-02-05 10:00:00'),
(15, '0950', 'Saque', '{"valor":"4500.00"}', 7, '2025-03-06 11:00:00'),
(16, '8573', 'Criado',
 '{"cpfCliente":"85733854057","cpfGerente":"23862179060","dataCriacao":"2012-12-12","saldoInicial":"0.00"}',
 1, '2012-12-12 00:00:00'),
(17, '8573', 'Depósito', '{"valor":"1000.00"}', 2, '2025-05-05 10:00:00'),
(18, '8573', 'Saque', '{"valor":"800.00"}', 3, '2025-05-06 10:00:00'),
(19, '5887', 'Criado',
 '{"cpfCliente":"58872160006","cpfGerente":"98574307084","dataCriacao":"2022-02-22","saldoInicial":"0.00"}',
 1, '2022-02-22 00:00:00'),
(20, '5887', 'Depósito', '{"valor":"150000.00"}', 2, '2025-06-01 10:00:00'),
(21, '7617', 'Criado',
 '{"cpfCliente":"76179646090","cpfGerente":"64065268052","dataCriacao":"2025-01-01","saldoInicial":"0.00"}',
 1, '2025-01-01 00:00:00'),
(22, '7617', 'Depósito', '{"valor":"1500.00"}', 2, '2025-07-01 10:00:00');

SELECT setval(
    pg_get_serial_sequence('conta_command.eventos', 'id'),
    (SELECT MAX(id) FROM conta_command.eventos),
    true
);