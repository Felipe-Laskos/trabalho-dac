package br.ufpr.dac.grupo2.email.config;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import br.ufpr.dac.grupo2.email.messaging.EmailListener;

@Configuration
public class RabbitConfig {

	@Bean
	Queue filaEmail() {
		return QueueBuilder.durable(EmailListener.FILA).build();
	}

}
