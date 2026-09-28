package br.ufpr.dac.grupo2.orquestrador.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.amqp.core.Declarable;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

	public static final String SAGA_CMD = "saga.cmd";
	public static final String ORQUESTRADOR_REPLY = "orquestrador.reply";
	public static final String EMAIL_CMD = "ms.email.cmd";

	public static final String CLIENTE_CMD = "ms.cliente.cmd";
	public static final String GERENTE_CMD = "ms.gerente.cmd";
	public static final String CONTA_CMD = "ms.conta.cmd";
	public static final String AUTH_CMD = "ms.auth.cmd";

	public static final String CLIENTE_CMD_DLQ = "ms.cliente.cmd.dlq";
	public static final String GERENTE_CMD_DLQ = "ms.gerente.cmd.dlq";
	public static final String CONTA_CMD_DLQ = "ms.conta.cmd.dlq";
	public static final String AUTH_CMD_DLQ = "ms.auth.cmd.dlq";

	@Bean
	public Declarables filas() {
		List<Declarable> filas = new ArrayList<>(List.of(
				QueueBuilder.durable(SAGA_CMD).build(),
				QueueBuilder.durable(ORQUESTRADOR_REPLY).build(),
				QueueBuilder.durable(EMAIL_CMD).build()));

		for (String fila : List.of(CLIENTE_CMD, GERENTE_CMD, CONTA_CMD, AUTH_CMD)) {
			filas.add(QueueBuilder.durable(fila)
					.withArgument("x-dead-letter-exchange", "")
					.withArgument("x-dead-letter-routing-key", fila + ".dlq")
					.build());
			filas.add(QueueBuilder.durable(fila + ".dlq").build());
		}

		return new Declarables(filas);
	}

}
