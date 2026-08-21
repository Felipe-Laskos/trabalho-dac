package br.ufpr.dac.grupo2.conta.query.dto;

public record ContaDTO(
        String numero,
        String cpfCliente,
        String cpfGerente,
        String saldo,
        String dataCriacao
) {
}