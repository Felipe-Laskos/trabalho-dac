package br.ufpr.dac.grupo2.orquestrador.dto;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record Comando(String sagaId, String tipo, String timestamp, Map<String, Object> payload) {
}
