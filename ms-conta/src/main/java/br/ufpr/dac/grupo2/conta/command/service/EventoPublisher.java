package br.ufpr.dac.grupo2.conta.command.service;

import br.ufpr.dac.grupo2.conta.command.exception.EventoInvalidoException;
import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.messaging.dto.EventoPublicado;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
public class EventoPublisher {

    public static final String FILA_EVENTOS = "ms.conta.events";

    private static final Logger log =
            LoggerFactory.getLogger(EventoPublisher.class);

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
                        try {
                            rabbitTemplate.convertAndSend(
                                    FILA_EVENTOS,
                                    json
                            );
                        } catch (AmqpException e) {
                            log.error(
                                    "Evento {} da conta {} commitado mas "
                                            + "NAO publicado - rode POST "
                                            + "/admin/reprojetar?conta={}",
                                    evento.getId(),
                                    evento.getObjetoId(),
                                    evento.getObjetoId(),
                                    e
                            );
                        }
                    }
                }
        );
    }

    public void publicarAgora(Evento evento) {
        rabbitTemplate.convertAndSend(
                FILA_EVENTOS,
                serializar(EventoPublicado.de(evento))
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
