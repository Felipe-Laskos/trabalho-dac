package br.ufpr.dac.grupo2.orquestrador.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

final class Avisos {

	private Avisos() {
	}

	static List<Map<String, Object>> gerenteAlterado(List<Map<String, Object>> clientes, String gerente) {
		return clientes.stream()
				.filter(cliente -> cliente.get("email") != null)
				.map(cliente -> {
					Map<String, Object> payload = new HashMap<>();
					payload.put("para", cliente.get("email"));
					payload.put("gerente", gerente);
					if (cliente.get("nome") != null) {
						payload.put("nome", cliente.get("nome"));
					}
					return payload;
				})
				.toList();
	}

}
