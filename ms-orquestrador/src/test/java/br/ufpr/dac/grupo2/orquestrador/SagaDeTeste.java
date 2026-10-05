package br.ufpr.dac.grupo2.orquestrador;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

import br.ufpr.dac.grupo2.orquestrador.model.DadosSaga;
import br.ufpr.dac.grupo2.orquestrador.model.Passo;
import br.ufpr.dac.grupo2.orquestrador.service.Saga;

record SagaDeTeste(List<Passo> passos, Optional<Passo> emailDeFalha,
		Function<DadosSaga, Map<String, Object>> inline) implements Saga {

	static final String TIPO = "saga-de-teste";

	SagaDeTeste(Passo... passos) {
		this(List.of(passos), Optional.empty(), null);
	}

	SagaDeTeste comEmailDeFalha(Passo email) {
		return new SagaDeTeste(passos, Optional.of(email), inline);
	}

	SagaDeTeste comResultadoInline(Function<DadosSaga, Map<String, Object>> resultado) {
		return new SagaDeTeste(passos, emailDeFalha, resultado);
	}

	@Override
	public String tipo() {
		return TIPO;
	}

	@Override
	public String dominio() {
		return "testes";
	}

	@Override
	public String recurso(DadosSaga dados) {
		return dados.texto("id");
	}

	@Override
	public List<String> cacheInvalidado(DadosSaga dados) {
		return List.of("cache:teste:" + dados.texto("id"));
	}

	@Override
	public Optional<Map<String, Object>> resultadoInline(DadosSaga dados) {
		return inline == null ? Optional.empty() : Optional.of(inline.apply(dados));
	}

}
