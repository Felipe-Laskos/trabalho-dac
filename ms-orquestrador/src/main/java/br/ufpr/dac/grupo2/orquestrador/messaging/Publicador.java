package br.ufpr.dac.grupo2.orquestrador.messaging;

import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

@Component
public class Publicador {

	private final RabbitTemplate rabbit;
	private final ObjectMapper json;

	public Publicador(RabbitTemplate rabbit, ObjectMapper json) {
		this.rabbit = rabbit;
		this.json = json;
	}

	public void publicar(String fila, Object corpo) {
		rabbit.send("", fila, MessageBuilder
				.withBody(json.writeValueAsBytes(corpo))
				.setContentType(MessageProperties.CONTENT_TYPE_JSON)
				.setDeliveryMode(MessageDeliveryMode.PERSISTENT)
				.build());
	}

}
