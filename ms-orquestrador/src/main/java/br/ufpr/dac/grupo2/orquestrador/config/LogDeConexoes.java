package br.ufpr.dac.grupo2.orquestrador.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;

@Configuration
public class LogDeConexoes {

	private static final Logger log = LoggerFactory.getLogger(LogDeConexoes.class);

	private final RabbitTemplate rabbit;
	private final RedisConnectionFactory redis;

	public LogDeConexoes(RabbitTemplate rabbit, RedisConnectionFactory redis) {
		this.rabbit = rabbit;
		this.redis = redis;
	}

	@EventListener(ApplicationReadyEvent.class)
	public void verificar() {
		try {
			String servidor = rabbit.execute(canal -> canal.getConnection().getAddress().getHostName());
			log.info("RabbitMQ: conectado em '{}'", servidor);
		} catch (RuntimeException e) {
			log.error("RabbitMQ: falha ao conectar: {}", e.getMessage());
		}

		try (RedisConnection conexao = redis.getConnection()) {
			log.info("Redis: conectado, PING respondeu '{}'", conexao.ping());
		} catch (RuntimeException e) {
			log.error("Redis: falha ao conectar: {}", e.getMessage());
		}
	}

}
