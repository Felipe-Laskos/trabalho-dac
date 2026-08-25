package br.ufpr.dac.grupo2.cliente.dto.response;

public record SolicitacaoResponseDTO (
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
    String uf,
    String status,
    String motivo,
    String data_hora_processamento
) {

}
