package br.ufpr.dac.grupo2.orquestrador.repository;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Repository
public class JobRepository {

	private static final Logger log = LoggerFactory.getLogger(JobRepository.class);

	private static final String PREFIXO = "job:";
	private static final Duration TTL = Duration.ofMinutes(5);

	private final StringRedisTemplate redis;
	private final ObjectMapper json;

	public JobRepository(StringRedisTemplate redis, ObjectMapper json) {
		this.redis = redis;
		this.json = json;
	}

	public void concluir(String jobId, String dominio, String resourceId) {
		Map<String, Object> desfecho = new LinkedHashMap<>();
		desfecho.put("status", "CONCLUIDO");
		desfecho.put("resultType", "resource");
		desfecho.put("dominio", dominio);
		desfecho.put("resourceId", resourceId);
		desfecho.put("erro", null);
		atualizar(jobId, desfecho);
	}

	public void falhar(String jobId, String erro) {
		Map<String, Object> desfecho = new LinkedHashMap<>();
		desfecho.put("status", "FALHA");
		desfecho.put("resultType", null);
		desfecho.put("resourceId", null);
		desfecho.put("erro", erro);
		atualizar(jobId, desfecho);
	}

	private void atualizar(String jobId, Map<String, Object> desfecho) {
		String salvo = redis.opsForValue().get(PREFIXO + jobId);
		if (salvo == null) {
			log.warn("jobId={} expirado antes do fim da SAGA; desfecho {} descartado", jobId, desfecho.get("status"));
			return;
		}

		Map<String, Object> job = json.readValue(salvo, new TypeReference<LinkedHashMap<String, Object>>() {});
		job.putAll(desfecho);

		redis.opsForValue().setIfPresent(PREFIXO + jobId, json.writeValueAsString(job), TTL);
	}

}
