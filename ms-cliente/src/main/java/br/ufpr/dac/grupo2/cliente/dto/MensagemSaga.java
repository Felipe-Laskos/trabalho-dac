package br.ufpr.dac.grupo2.cliente.dto;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MensagemSaga(String sagaId, String tipo, String timestamp, Map<String, Object> payload) {

	public static MensagemSaga semSaga(String tipo, Map<String, Object> payload) {
        return new MensagemSaga(null, tipo, java.time.LocalDateTime.now().toString(), payload);
    }

	public String texto(String chave) {
		if (payload == null) {
			return null;
		}
		Object valor = payload.get(chave);
		return valor == null ? null : valor.toString();
	}

}
