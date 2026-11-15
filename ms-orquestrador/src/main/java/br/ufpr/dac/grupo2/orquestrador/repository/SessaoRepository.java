package br.ufpr.dac.grupo2.orquestrador.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SessaoRepository {

	private final StringRedisTemplate redis;

	public SessaoRepository(StringRedisTemplate redis) {
		this.redis = redis;
	}

	public int encerrarTodas(String cpf) {
		String reversa = "sessao:cpf:" + cpf;

		List<String> chaves = new ArrayList<>();
		for (String jti : jtisDe(reversa)) {
			chaves.add("sessao:" + jti);
		}
		chaves.add(reversa);

		redis.delete(chaves);
		return chaves.size() - 1;
	}

	private Set<String> jtisDe(String reversa) {
		Set<String> jtis = redis.opsForSet().members(reversa);
		return jtis == null ? Set.of() : jtis;
	}

}
