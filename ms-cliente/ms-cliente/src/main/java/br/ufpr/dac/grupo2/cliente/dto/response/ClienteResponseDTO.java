package br.ufpr.dac.grupo2.cliente.dto.response;

public record ClienteResponseDTO (
    String cpf,
    String nome,
    String email,
    String telefone,
    String salario,
    String logradouro,
    String numero,
    String complemento,
    String cep,
    String cidade,
    String uf
) {

}
