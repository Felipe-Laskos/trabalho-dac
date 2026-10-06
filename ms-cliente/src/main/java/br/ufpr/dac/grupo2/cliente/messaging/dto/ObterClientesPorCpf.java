package br.ufpr.dac.grupo2.cliente.messaging.dto;

import java.util.List;

public record ObterClientesPorCpf(
        String sagaId,
        String tipo, 
        List<String> cpfs) {
}
