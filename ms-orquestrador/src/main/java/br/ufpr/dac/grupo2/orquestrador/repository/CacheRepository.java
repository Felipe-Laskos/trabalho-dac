package br.ufpr.dac.grupo2.orquestrador.repository;

import java.util.List;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CacheRepository {

	private final StringRedisTemplate redis;

	public CacheRepository(StringRedisTemplate redis) {
		this.redis = redis;
	}

	public void invalidar(List<String> chaves) {
		if (!chaves.isEmpty()) {
			redis.delete(chaves);
		}
	}

}
