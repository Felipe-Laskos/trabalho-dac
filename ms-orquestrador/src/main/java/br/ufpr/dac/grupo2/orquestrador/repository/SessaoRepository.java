package br.ufpr.dac.grupo2.orquestrador.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.springframework.data.redis.connection.DataType;
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

	// a reversa era uma string com o último jti antes da S9; o login a regrava como SET
	private Set<String> jtisDe(String reversa) {
		DataType tipo = redis.type(reversa);
		if (tipo == DataType.SET) {
			return redis.opsForSet().members(reversa);
		}
		if (tipo == DataType.STRING) {
			String jti = redis.opsForValue().get(reversa);
			return jti == null ? Set.of() : Set.of(jti);
		}
		return Set.of();
	}

}
