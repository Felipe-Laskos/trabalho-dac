package br.ufpr.dac.grupo2.conta.messaging.dto;

import br.ufpr.dac.grupo2.conta.command.model.Evento;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

public record EventoPublicado(
        Long id,
        String objetoId,
        String tipo,
        Map<String, Object> payload,
        Integer versao,
        LocalDateTime timestamp) {

    private static final Set<String> EVENTOS_MONETARIOS = Set.of(
            "Depósito", "Saque", "TransferênciaOrigem", "TransferênciaDestino");

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

    public static EventoPublicado deParaApi(Evento evento) {
        Map<String, Object> payloadApi = new LinkedHashMap<>(evento.getPayload());
        if (EVENTOS_MONETARIOS.contains(evento.getTipo())
                && payloadApi.get("valor") instanceof String valor) {
            payloadApi.put("valor", new BigDecimal(valor)
                    .setScale(2, RoundingMode.HALF_UP).toPlainString());
        }
        EventoPublicado publicado = de(evento);
        return new EventoPublicado(publicado.id(), publicado.objetoId(),
                publicado.tipo(), payloadApi, publicado.versao(), publicado.timestamp());
    }
}
