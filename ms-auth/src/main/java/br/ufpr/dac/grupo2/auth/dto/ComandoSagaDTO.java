package br.ufpr.dac.grupo2.auth.dto;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ComandoSagaDTO(String sagaId, String tipo, String timestamp, Map<String, Object> payload) {

  public String texto(String chave) {
    Object valor = payload == null ? null : payload.get(chave);
    return valor == null ? null : valor.toString();
  }
}
