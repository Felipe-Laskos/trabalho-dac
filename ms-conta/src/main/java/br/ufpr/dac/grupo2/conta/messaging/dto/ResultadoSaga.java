package br.ufpr.dac.grupo2.conta.messaging.dto;
import java.util.List;
import java.util.Map;

public record ResultadoSaga(Resposta resposta, EventoPublicado evento,
        List<EventoPublicado> eventos) {

    public ResultadoSaga(Resposta resposta, EventoPublicado evento) {
        this(resposta, evento, evento == null ? List.of() : List.of(evento));
    }

    public ResultadoSaga {
        eventos = eventos == null ? List.of() : List.copyOf(eventos);
    }

    public static ResultadoSaga lote(Resposta resposta,
            List<EventoPublicado> eventos) {
        return new ResultadoSaga(resposta, null, eventos);
    }

    public record Resposta(String sagaId, String tipo, String timestamp,
            Map<String, Object> payload, String status, String erro) {}
}
