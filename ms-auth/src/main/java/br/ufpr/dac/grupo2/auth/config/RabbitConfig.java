package br.ufpr.dac.grupo2.auth.config;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {
  public static final String FILA_COMANDOS = "ms.auth.cmd";
  public static final String FILA_COMANDOS_DLQ = "ms.auth.cmd.dlq";
  public static final String FILA_RESPOSTAS = "orquestrador.reply";

  @Bean
  public Queue authCmd() {
    return QueueBuilder.durable(FILA_COMANDOS)
      .withArgument("x-dead-letter-exchange", "")
      .withArgument("x-dead-letter-routing-key", FILA_COMANDOS_DLQ)
      .build();
  }

  @Bean
  public Queue authCmdDlq() {
    return QueueBuilder.durable(FILA_COMANDOS_DLQ).build();
  }

  @Bean
  public Queue orquestradorReply() {
    return QueueBuilder.durable(FILA_RESPOSTAS).build();
  }
}
