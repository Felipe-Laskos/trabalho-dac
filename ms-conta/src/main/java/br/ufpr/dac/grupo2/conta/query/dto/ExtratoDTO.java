package br.ufpr.dac.grupo2.conta.query.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;

public record ExtratoDTO(
        String numeroConta,
        String dataInicio,
        String dataFim,
        String saldoAbertura,
        List<Item> movimentacoes,
        Map<String, Link> _links) {

    public record Parte(String numeroConta, String cpf, String nome) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Item(
            String dataHora,
            String tipo,
            String valor,
            Parte origem,
            Parte destino) {}
}