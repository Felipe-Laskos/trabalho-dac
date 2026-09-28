package br.ufpr.dac.grupo2.orquestrador.model;

import java.util.Map;
import java.util.Optional;

public record DadosSaga(Map<String, Object> payload, String senhaEmTransito) {

	public String texto(String chave) {
		return opcional(chave).orElseThrow(() -> new IllegalStateException("campo '" + chave + "' ausente na SAGA"));
	}

	public Optional<String> opcional(String chave) {
		Object valor = payload.get(chave);
		return valor == null ? Optional.empty() : Optional.of(valor.toString());
	}

	public Object valor(String chave) {
		Object valor = payload.get(chave);
		if (valor == null) {
			throw new IllegalStateException("campo '" + chave + "' ausente na SAGA");
		}
		return valor;
	}

	public String senha() {
		if (senhaEmTransito == null) {
			throw new IllegalStateException("senha indisponível (resposta do MS Auth sem senha ou Orquestrador reiniciado)");
		}
		return senhaEmTransito;
	}

}
