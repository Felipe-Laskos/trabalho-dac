package br.ufpr.dac.grupo2.conta.query.dto;

import java.util.Map;

public record ContaDTO(
        String numero,
        String cpfCliente,
        String cpfGerente,
        String saldo,
        String dataCriacao,
        Map<String, Link> _links
) {
}