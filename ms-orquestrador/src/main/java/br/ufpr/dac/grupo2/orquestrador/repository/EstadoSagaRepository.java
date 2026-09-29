package br.ufpr.dac.grupo2.orquestrador.repository;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

import br.ufpr.dac.grupo2.orquestrador.model.EstadoSaga;
import tools.jackson.databind.ObjectMapper;

@Repository
public class EstadoSagaRepository {

	private static final String PREFIXO = "saga:";
	private static final Duration TTL = Duration.ofHours(1);

	private final StringRedisTemplate redis;
	private final ObjectMapper json;

	public EstadoSagaRepository(StringRedisTemplate redis, ObjectMapper json) {
		this.redis = redis;
		this.json = json;
	}

	public void salvar(EstadoSaga estado) {
		redis.opsForValue().set(PREFIXO + estado.getSagaId(), json.writeValueAsString(estado), TTL);
	}

	public EstadoSaga ler(String sagaId) {
		return converter(redis.opsForValue().get(PREFIXO + sagaId));
	}

	public List<EstadoSaga> emCurso() {
		List<EstadoSaga> ativas = new ArrayList<>();
		ScanOptions opcoes = ScanOptions.scanOptions().match(PREFIXO + "*").count(500).build();

		try (Cursor<String> chaves = redis.scan(opcoes)) {
			chaves.forEachRemaining(chave -> {
				EstadoSaga estado = converter(redis.opsForValue().get(chave));
				if (estado != null && estado.getStatus().emCurso()) {
					ativas.add(estado);
				}
			});
		}

		return ativas;
	}

	private EstadoSaga converter(String salvo) {
		return salvo == null ? null : json.readValue(salvo, EstadoSaga.class);
	}

}
