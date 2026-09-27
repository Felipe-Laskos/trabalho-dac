package br.ufpr.dac.grupo2.conta.messaging.dto;
import java.util.Map;
public record ComandoSaga(String sagaId, String tipo,
        String timestamp, Map<String, Object> payload) {}