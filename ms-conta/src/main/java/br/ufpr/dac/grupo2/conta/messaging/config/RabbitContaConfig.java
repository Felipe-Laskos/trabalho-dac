package br.ufpr.dac.grupo2.conta.messaging.config;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitContaConfig {

    public static final String FILA_EVENTOS = "ms.conta.events";
    public static final String FILA_EVENTOS_DLQ = "ms.conta.events.dlq";

    @Bean
    public Queue contaEventsQueue() {
        return QueueBuilder.durable(FILA_EVENTOS)
                .withArgument("x-dead-letter-exchange", "")
                .withArgument(
                        "x-dead-letter-routing-key",
                        FILA_EVENTOS_DLQ
                )
                .build();
    }

    @Bean
    public Queue contaEventsDlqQueue() {
        return QueueBuilder.durable(FILA_EVENTOS_DLQ)
                .build();
    }

    @Bean
    public ObjectMapper objectMapper() {
        return JsonMapper.builder()
                .findAndAddModules()
                .build();
    }
}
