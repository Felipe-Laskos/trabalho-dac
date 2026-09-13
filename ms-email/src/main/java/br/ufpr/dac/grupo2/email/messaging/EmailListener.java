package br.ufpr.dac.grupo2.email.messaging;

import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

import br.ufpr.dac.grupo2.email.dto.MensagemSaga;
import br.ufpr.dac.grupo2.email.service.EmailService;

@Component
public class EmailListener {

	private static final Logger log = LoggerFactory.getLogger(EmailListener.class);

	public static final String FILA = "ms.email.cmd";

	private final EmailService servico;
	private final ObjectMapper json;

	public EmailListener(EmailService servico, ObjectMapper json) {
		this.servico = servico;
		this.json = json;
	}

	@RabbitListener(queues = FILA)
	public void receber(Message mensagem) {
		String corpo = new String(mensagem.getBody(), StandardCharsets.UTF_8);
		MensagemSaga saga = null;

		try {
			saga = json.readValue(corpo, MensagemSaga.class);
			servico.enviar(saga);
		} catch (Exception e) {
			log.error("sagaId={} tipo={} resultado=FALHA causa={}",
					saga == null ? "?" : saga.sagaId(),
					saga == null ? "?" : saga.tipo(),
					e.getMessage());
		}
	}

}
