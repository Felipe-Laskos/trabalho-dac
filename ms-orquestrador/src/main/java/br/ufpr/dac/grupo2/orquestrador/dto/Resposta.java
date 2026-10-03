package br.ufpr.dac.grupo2.orquestrador.dto;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record Resposta(String sagaId, String tipo, Map<String, Object> payload,
		String timestamp, String status, String erro) {

	public boolean sucesso() {
		return "SUCESSO".equals(status);
	}

}
