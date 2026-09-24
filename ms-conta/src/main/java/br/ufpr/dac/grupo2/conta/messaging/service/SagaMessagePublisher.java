package br.ufpr.dac.grupo2.conta.messaging.service;

import br.ufpr.dac.grupo2.conta.messaging.config.RabbitContaConfig;
import br.ufpr.dac.grupo2.conta.messaging.config.SagaRabbitConfig;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class SagaMessagePublisher {

    public static final String FILA_EVENTOS = RabbitContaConfig.FILA_EVENTOS;
    public static final String FILA_RESPOSTAS = SagaRabbitConfig.FILA_RESPOSTAS;

    private static final long CONFIRMACAO_TIMEOUT_MS = 5_000;

    private final ObjectMapper objectMapper;
    private final RabbitTemplate rabbitTemplate;

    public SagaMessagePublisher(ObjectMapper objectMapper, RabbitTemplate rabbitTemplate) {
        this.objectMapper = objectMapper;
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publicar(String fila, Object corpo) {
        Message mensagem = MessageBuilder
                .withBody(objectMapper.writeValueAsBytes(corpo))
                .setContentType(MessageProperties.CONTENT_TYPE_JSON)
                .setDeliveryMode(MessageDeliveryMode.PERSISTENT)
                .build();

        rabbitTemplate.invoke(operacoes -> {
            operacoes.send("", fila, mensagem);
            operacoes.waitForConfirmsOrDie(CONFIRMACAO_TIMEOUT_MS);
            return null;
        });
    }
}
