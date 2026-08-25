package br.ufpr.dac.grupo2.gerente.dto.response;

public record GerenteResponseDTO (
    Long id,
    String cpf,
    String nome,
    String email,
    String telefone,
    String ativo
) {

}
