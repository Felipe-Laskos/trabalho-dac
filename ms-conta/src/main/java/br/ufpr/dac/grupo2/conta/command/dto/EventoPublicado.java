package br.ufpr.dac.grupo2.conta.command.dto;

import java.time.LocalDateTime;
import java.util.Map;

import br.ufpr.dac.grupo2.conta.command.model.Evento;

public record EventoPublicado(
        Long id,
        String objetoId,
        String tipo,
        Map<String, Object> payload,
        Integer versao,
        LocalDateTime timestamp) {

    public static EventoPublicado de(Evento evento) {
        return new EventoPublicado(
                evento.getId(),
                evento.getObjetoId(),
                evento.getTipo(),
                evento.getPayload(),
                evento.getVersao(),
                evento.getTimestamp()
        );
    }
}