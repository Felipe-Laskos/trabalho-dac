--cpf nome email senha salário dados de endereço
--12912861012 Catharyna cli1@bantads.com.br tads R$ 10.000,00 você escolhe
--09506382000 Cleuddônio cli2@bantads.com.br tads R$ 20.000,00 você escolhe
--85733854057 Catianna cli3@bantads.com.br tads R$ 3.000,00 você escolhe
--58872160006 Cutardo cli4@bantads.com.br tads R$ 500,00 você escolhe
--76179646090 Coândrya cli5@bantads.com.br tads R$ 1.500,00 você escolhe

INSERT INTO cliente.clientes (cpf, nome, email, telefone, salario, logradouro, numero, complemento, cep, cidade, uf) VALUES
('12912861012', 'Catharyna', 'cli1@bantads.com.br', '41999999999', 10000.00, 'Rua das Flores', '123', 'Apto 101', '80000-000', 'Curitiba', 'PR'),
('09506382000', 'Cleuddônio', 'cli2@bantads.com.br', '41998999999', 20000.00, 'Avenida Brasil', '456', 'Sala 202', '80000-001', 'Curitiba', 'PR'),
('85733854057', 'Catianna', 'cli3@bantads.com.br', '41997999999', 3000.00, 'Travessa das Laranjeiras', '789', 'Casa 303', '80000-002', 'Curitiba', 'PR'),
('58872160006', 'Cutardo', 'cli4@bantads.com.br', '41996999999', 500.00, 'Rua dos Ipês', '1010', 'Loja 10', '80000-003', 'Curitiba', 'PR'),
('76179646090', 'Coândrya', 'cli5@bantads.com.br', '41995999999', 1500.00, 'Alameda dos Anjos', '1111', 'Apartamento 202', '80000-004', 'Curitiba', 'PR');