package br.ufpr.dac.grupo2.cliente.messaging.config;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SagaRabbitConfig {

    public static final String FILA_COMANDOS = "ms.cliente.cmd";
    public static final String FILA_COMANDOS_DLQ = "ms.cliente.cmd.dlq";
    public static final String FILA_RESPOSTAS = "orquestrador.reply";

    @Bean
    public Queue clienteCmdQueue() {
        return QueueBuilder.durable(FILA_COMANDOS)
                .withArgument("x-dead-letter-exchange", "")
                .withArgument("x-dead-letter-routing-key", FILA_COMANDOS_DLQ)
                .build();
    }

    @Bean
    public Queue clienteCmdDlqQueue() {
        return QueueBuilder.durable(FILA_COMANDOS_DLQ).build();
    }

    @Bean
    public Queue sagaReplyQueue() {
        return QueueBuilder.durable(FILA_RESPOSTAS).build();
    }
}
