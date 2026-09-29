package br.ufpr.dac.grupo2.auth.dto;

import java.util.HashMap;
import java.util.Map;

public record RespostaSagaDTO(String sagaId, String tipo, Map<String, Object> payload,
    String timestamp, String status, String erro) {

  public RespostaSagaDTO semSenha() {
    Map<String, Object> copia = new HashMap<>(payload);
    copia.remove("senha");
    return new RespostaSagaDTO(sagaId, tipo, copia, timestamp, status, erro);
  }
}
