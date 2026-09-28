package br.ufpr.dac.grupo2.orquestrador.service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

@Component
public class SenhasEmTransito {

	private final Map<String, String> senhas = new ConcurrentHashMap<>();

	public void guardar(String sagaId, String senha) {
		senhas.put(sagaId, senha);
	}

	public String consultar(String sagaId) {
		return senhas.get(sagaId);
	}

	public void descartar(String sagaId) {
		senhas.remove(sagaId);
	}

}
