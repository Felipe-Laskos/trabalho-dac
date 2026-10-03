package br.ufpr.dac.grupo2.orquestrador.model;

import java.util.List;
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

	@SuppressWarnings("unchecked")
	public List<Map<String, Object>> lista(String chave) {
		return payload.get(chave) instanceof List<?> lista ? (List<Map<String, Object>>) lista : List.of();
	}

	@SuppressWarnings("unchecked")
	public Map<String, Object> mapa(String chave) {
		return payload.get(chave) instanceof Map<?, ?> mapa ? (Map<String, Object>) mapa : Map.of();
	}

	public String senha() {
		if (senhaEmTransito == null) {
			throw new IllegalStateException("senha indisponível (resposta do MS Auth sem senha ou Orquestrador reiniciado)");
		}
		return senhaEmTransito;
	}

}
