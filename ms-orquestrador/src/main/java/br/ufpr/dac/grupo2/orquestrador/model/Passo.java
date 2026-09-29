package br.ufpr.dac.grupo2.orquestrador.model;

import java.util.Map;
import java.util.function.Function;

import br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig;

public record Passo(int numero, String fila, String tipo, Function<DadosSaga, Map<String, Object>> payload,
		String compensacao, Function<DadosSaga, Map<String, Object>> payloadCompensacao) {

	public static Passo consulta(int numero, String fila, String tipo, Function<DadosSaga, Map<String, Object>> payload) {
		return new Passo(numero, fila, tipo, payload, null, null);
	}

	public static Passo transacional(int numero, String fila, String tipo, Function<DadosSaga, Map<String, Object>> payload,
			String compensacao, Function<DadosSaga, Map<String, Object>> payloadCompensacao) {
		return new Passo(numero, fila, tipo, payload, compensacao, payloadCompensacao);
	}

	public static Passo email(int numero, String tipo, Function<DadosSaga, Map<String, Object>> payload) {
		return new Passo(numero, RabbitConfig.EMAIL_CMD, tipo, payload, null, null);
	}

	public boolean fireAndForget() {
		return RabbitConfig.EMAIL_CMD.equals(fila);
	}

	public boolean compensavel() {
		return compensacao != null;
	}

}
