package br.ufpr.dac.grupo2.conta.command.service;

import br.ufpr.dac.grupo2.conta.command.dto.EventoPublicado;
import br.ufpr.dac.grupo2.conta.command.exception.EventoInvalidoException;
import br.ufpr.dac.grupo2.conta.command.model.Evento;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
public class EventoPublisher {

    public static final String FILA_EVENTOS = "ms.conta.events";

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    public EventoPublisher(
            RabbitTemplate rabbitTemplate,
            ObjectMapper objectMapper) {
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
    }

    public void publicarDepoisDoCommit(Evento evento) {
        if (!TransactionSynchronizationManager
                .isActualTransactionActive()
                || !TransactionSynchronizationManager
                .isSynchronizationActive()) {
            throw new IllegalStateException(
                    "A publicação deve ser registrada dentro de uma transação"
            );
        }

        String json = serializar(EventoPublicado.de(evento));

        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        rabbitTemplate.convertAndSend(
                                FILA_EVENTOS,
                                json
                        );
                    }
                }
        );
    }

    private String serializar(EventoPublicado evento) {
        try {
            return objectMapper.writeValueAsString(evento);
        } catch (JacksonException e) {
            throw new EventoInvalidoException(
                    "Não foi possível serializar o evento"
            );
        }
    }
}