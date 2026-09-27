package br.ufpr.dac.grupo2.orquestrador.service;

import java.util.List;
import java.util.Optional;

import br.ufpr.dac.grupo2.orquestrador.model.DadosSaga;
import br.ufpr.dac.grupo2.orquestrador.model.Passo;

public interface Saga {

	String tipo();

	String dominio();

	List<Passo> passos();

	String recurso(DadosSaga dados);

	Optional<Passo> emailDeFalha();

	List<String> cacheInvalidado(DadosSaga dados);

	default Passo passo(int numero) {
		return passos().stream().filter(passo -> passo.numero() == numero).findFirst().orElse(null);
	}

}
