package br.ufpr.dac.grupo2.auth.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.data.mongodb.core.MongoTemplate;

@Configuration
public class LogDeConexoes {

	private static final Logger log = LoggerFactory.getLogger(LogDeConexoes.class);

	private final MongoTemplate mongo;

	public LogDeConexoes(MongoTemplate mongo) {
		this.mongo = mongo;
	}

	@EventListener(ApplicationReadyEvent.class)
	public void verificar() {
		try {
			mongo.executeCommand("{ ping: 1 }");
			log.info("MongoDB: conectado ao banco '{}'", mongo.getDb().getName());
		} catch (RuntimeException e) {
			log.error("MongoDB: falha ao conectar: {}", e.getMessage());
		}
	}

}
