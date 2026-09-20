INSERT INTO cliente.clientes (cpf, nome, email, telefone, salario, logradouro, numero, complemento, cep, cidade, uf) VALUES
('12912861012', 'Catharyna', 'cli1@bantads.com.br', '41999999999', 10000.00, 'Rua das Flores', '123', 'Apto 101', '80000000', 'Curitiba', 'PR'),
('09506382000', 'Cleuddônio', 'cli2@bantads.com.br', '41998999999', 20000.00, 'Avenida Brasil', '456', 'Sala 202', '80000001', 'Curitiba', 'PR'),
('85733854057', 'Catianna', 'cli3@bantads.com.br', '41997999999', 3000.00, 'Travessa das Laranjeiras', '789', 'Casa 303', '80000002', 'Curitiba', 'PR'),
('58872160006', 'Cutardo', 'cli4@bantads.com.br', '41996999999', 500.00, 'Rua dos Ipês', '1010', 'Loja 10', '80000003', 'Curitiba', 'PR'),
('76179646090', 'Coândrya', 'cli5@bantads.com.br', '41995999999', 1500.00, 'Alameda dos Anjos', '1111', 'Apartamento 202', '80000004', 'Curitiba', 'PR');

INSERT INTO cliente.solicitacoes (cpf, nome, email, telefone, salario, logradouro, numero, complemento, cep, cidade, uf, status, motivo, data_hora_processamento) VALUES
('38491027481', 'Mariana Souza', 'mariana.souza@email.com', '41988776655', 7500.00, 'Rua Marechal Deodoro', '500', 'Apto 42', '80010010', 'Curitiba', 'PR', 'PENDENTE', NULL, NULL),
('92817463520', 'Lucas Ferreira', 'lucas.ferreira@email.com', '41977665544', 3200.00, 'Avenida Sete de Setembro', '1200', 'Bloco B', '80230010', 'Curitiba', 'PR', 'PENDENTE', NULL, NULL),
('61524398701', 'Beatriz Lima', 'beatriz.lima@email.com', '41966554433', 12500.00, 'Rua XV de Novembro', '850', 'Conjunto 12', '80020310', 'Curitiba', 'PR', 'PENDENTE', NULL, NULL),
('47382910563', 'Rodrigo Alves', 'rodrigo.alves@email.com', '41955443322', 2800.00, 'Rua Brigadeiro Franco', '310', NULL, '80420120', 'Curitiba', 'PR', 'PENDENTE', NULL, NULL),
('80192837465', 'Camila Rocha', 'camila.rocha@email.com', '41944332211', 9400.00, 'Avenida Visconde de Guarapuava', '2100', 'Apto 801', '80060060', 'Curitiba', 'PR', 'PENDENTE', NULL, NULL);

