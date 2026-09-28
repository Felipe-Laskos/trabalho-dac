package br.ufpr.dac.grupo2.auth.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import br.ufpr.dac.grupo2.auth.config.RabbitConfig;
import br.ufpr.dac.grupo2.auth.dto.ComandoSagaDTO;
import br.ufpr.dac.grupo2.auth.dto.RespostaSagaDTO;
import br.ufpr.dac.grupo2.auth.service.UsuarioSagaService;
import tools.jackson.databind.ObjectMapper;

@Component
public class AuthSagaListener {
  private static final Logger log = LoggerFactory.getLogger(AuthSagaListener.class);

  private final UsuarioSagaService servico;

  private final RabbitTemplate rabbit;

  private final ObjectMapper json;

  public AuthSagaListener(UsuarioSagaService servico, RabbitTemplate rabbit, ObjectMapper json) {
    this.servico = servico;
    this.rabbit = rabbit;
    this.json = json;
  }

  @RabbitListener(queues = RabbitConfig.FILA_COMANDOS, concurrency = "1")
  public void receber(Message mensagem) {
    ComandoSagaDTO cmd = json.readValue(mensagem.getBody(), ComandoSagaDTO.class);
    if (cmd.sagaId() == null || cmd.tipo() == null) {
      throw new IllegalArgumentException("Envelope de SAGA sem sagaId ou tipo");
    }

    RespostaSagaDTO resposta = servico.processar(cmd);

    rabbit.send("", RabbitConfig.FILA_RESPOSTAS, MessageBuilder
      .withBody(json.writeValueAsBytes(resposta))
      .setContentType(MessageProperties.CONTENT_TYPE_JSON)
      .setDeliveryMode(MessageDeliveryMode.PERSISTENT)
      .build());

    log.info("sagaId={} tipo={} status={}", resposta.sagaId(), resposta.tipo(), resposta.status());
  }
}
