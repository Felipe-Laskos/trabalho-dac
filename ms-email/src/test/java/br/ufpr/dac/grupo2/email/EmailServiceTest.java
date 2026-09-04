package br.ufpr.dac.grupo2.email;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import tools.jackson.databind.ObjectMapper;

import br.ufpr.dac.grupo2.email.dto.MensagemSaga;
import br.ufpr.dac.grupo2.email.messaging.EmailListener;
import br.ufpr.dac.grupo2.email.service.EmailService;

class EmailServiceTest {

	private JavaMailSender remetente;
	private EmailService servico;
	private EmailListener listener;

	@BeforeEach
	void preparar() {
		remetente = mock(JavaMailSender.class);
		servico = new EmailService(remetente);
		listener = new EmailListener(servico, new ObjectMapper());
	}

	private SimpleMailMessage enviado() {
		ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
		verify(remetente).send(captor.capture());
		return captor.getValue();
	}

	@Test
	void senhaNovaLevaASenhaNoCorpo() {
		servico.enviar(new MensagemSaga("saga-1", "email.senha-nova", "2026-09-02T10:00:00",
				Map.of("para", "cli1@bantads.com.br", "nome", "Catharyna", "senha", "xY7kP2qm")));

		SimpleMailMessage email = enviado();
		assertThat(email.getTo()).containsExactly("cli1@bantads.com.br");
		assertThat(email.getSubject()).isEqualTo("BANTADS — sua conta foi aprovada");
		assertThat(email.getText()).contains("Catharyna").contains("xY7kP2qm");
	}

	@Test
	void solicitacaoNaoEfetuadaTemAssuntoProprio() {
		servico.enviar(new MensagemSaga("saga-2", "email.solicitacao-nao-efetuada", "2026-09-02T10:00:00",
				Map.of("para", "cli2@bantads.com.br", "nome", "Cleuddônio")));

		SimpleMailMessage email = enviado();
		assertThat(email.getSubject()).isEqualTo("BANTADS — sua solicitação não foi efetuada");
		assertThat(email.getText()).contains("Não foi possível concluir sua solicitação");
	}

	@Test
	void solicitacaoRejeitadaLevaOMotivo() {
		servico.enviar(new MensagemSaga("saga-3", "email.solicitacao-rejeitada", "2026-09-02T10:00:00",
				Map.of("para", "cli3@bantads.com.br", "nome", "Catianna", "motivo", "Salário insuficiente")));

		SimpleMailMessage email = enviado();
		assertThat(email.getSubject()).isEqualTo("BANTADS — sua solicitação foi rejeitada");
		assertThat(email.getText()).contains("Salário insuficiente");
	}

	@Test
	void gerenteAlteradoLevaONomeDoNovoGerente() {
		servico.enviar(new MensagemSaga("saga-4", "email.gerente-alterado", "2026-09-02T10:00:00",
				Map.of("para", "cli4@bantads.com.br", "nome", "Cutardo", "gerente", "Geniéve")));

		SimpleMailMessage email = enviado();
		assertThat(email.getSubject()).isEqualTo("BANTADS — seu gerente foi alterado");
		assertThat(email.getText()).contains("Geniéve");
	}

	@Test
	void osQuatroAssuntosSaoDiferentesEntreSi() {
		assertThat(java.util.Arrays.stream(br.ufpr.dac.grupo2.email.dto.TipoEmail.values())
				.map(br.ufpr.dac.grupo2.email.dto.TipoEmail::assunto)
				.distinct()
				.count()).isEqualTo(4);
	}

	@Test
	void falhaDeEnvioNaoSobeDoListener() {
		doThrow(new MailSendException("Gmail fora do ar")).when(remetente).send(any(SimpleMailMessage.class));

		listener.receber(mensagem("""
				{"sagaId":"saga-5","tipo":"email.senha-nova","timestamp":"2026-09-02T10:00:00",
				 "payload":{"para":"cli1@bantads.com.br","nome":"Catharyna","senha":"xY7kP2qm"}}"""));
	}

	@Test
	void corpoInvalidoNaoSobeDoListener() {
		listener.receber(mensagem("isto não é json"));
		verify(remetente, never()).send(any(SimpleMailMessage.class));
	}

	@Test
	void tipoDesconhecidoEDescartadoSemEnviar() {
		listener.receber(mensagem("""
				{"sagaId":"saga-6","tipo":"email.inexistente","timestamp":"2026-09-02T10:00:00",
				 "payload":{"para":"cli1@bantads.com.br"}}"""));
		verify(remetente, never()).send(any(SimpleMailMessage.class));
	}

	@Test
	void payloadSemDestinatarioEDescartadoSemEnviar() {
		listener.receber(mensagem("""
				{"sagaId":"saga-7","tipo":"email.senha-nova","timestamp":"2026-09-02T10:00:00",
				 "payload":{"nome":"Catharyna","senha":"xY7kP2qm"}}"""));
		verify(remetente, never()).send(any(SimpleMailMessage.class));
	}

	private org.springframework.amqp.core.Message mensagem(String corpo) {
		return org.springframework.amqp.core.MessageBuilder
				.withBody(corpo.getBytes(java.nio.charset.StandardCharsets.UTF_8))
				.build();
	}

}
