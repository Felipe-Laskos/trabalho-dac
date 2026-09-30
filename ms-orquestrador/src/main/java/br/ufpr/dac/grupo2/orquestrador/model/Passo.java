package br.ufpr.dac.grupo2.orquestrador.model;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;

import br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig;

public record Passo(int numero, String fila, String tipo, Function<DadosSaga, Map<String, Object>> payload,
		String compensacao, Function<DadosSaga, Map<String, Object>> payloadCompensacao,
		Predicate<DadosSaga> condicao, Consumer<DadosSaga> acaoLocal,
		Function<DadosSaga, List<Map<String, Object>>> lote) {

	private static final Predicate<DadosSaga> SEMPRE = dados -> true;

	public static Passo consulta(int numero, String fila, String tipo, Function<DadosSaga, Map<String, Object>> payload) {
		return new Passo(numero, fila, tipo, payload, null, null, SEMPRE, null, null);
	}

	public static Passo transacional(int numero, String fila, String tipo, Function<DadosSaga, Map<String, Object>> payload,
			String compensacao, Function<DadosSaga, Map<String, Object>> payloadCompensacao) {
		return new Passo(numero, fila, tipo, payload, compensacao, payloadCompensacao, SEMPRE, null, null);
	}

	public static Passo email(int numero, String tipo, Function<DadosSaga, Map<String, Object>> payload) {
		return new Passo(numero, RabbitConfig.EMAIL_CMD, tipo, payload, null, null, SEMPRE, null, null);
	}

	public static Passo emailParaCada(int numero, String tipo, Function<DadosSaga, List<Map<String, Object>>> lote) {
		return new Passo(numero, RabbitConfig.EMAIL_CMD, tipo, null, null, null, SEMPRE, null, lote);
	}

	public static Passo local(int numero, String tipo, Consumer<DadosSaga> acao) {
		return new Passo(numero, null, tipo, null, null, null, SEMPRE, acao, null);
	}

	public Passo somenteSe(Predicate<DadosSaga> condicao) {
		return new Passo(numero, fila, tipo, payload, compensacao, payloadCompensacao, condicao, acaoLocal, lote);
	}

	public boolean fireAndForget() {
		return RabbitConfig.EMAIL_CMD.equals(fila);
	}

	public boolean local() {
		return acaoLocal != null;
	}

	public boolean compensavel() {
		return compensacao != null;
	}

	public List<Map<String, Object>> payloads(DadosSaga dados) {
		return lote != null ? lote.apply(dados) : List.of(payload.apply(dados));
	}

}
