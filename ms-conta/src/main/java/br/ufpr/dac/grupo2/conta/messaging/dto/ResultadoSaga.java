package br.ufpr.dac.grupo2.conta.messaging.dto;
import java.util.Map;
public record ResultadoSaga(Resposta resposta, EventoPublicado evento) {
    public record Resposta(String sagaId, String tipo, String timestamp,
            Map<String, Object> payload, String status, String erro) {}
}