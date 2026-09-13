package br.ufpr.dac.grupo2.email.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import br.ufpr.dac.grupo2.email.dto.MensagemSaga;
import br.ufpr.dac.grupo2.email.dto.TipoEmail;

@Service
public class EmailService {

	private static final Logger log = LoggerFactory.getLogger(EmailService.class);

	private final JavaMailSender remetente;

	public EmailService(JavaMailSender remetente) {
		this.remetente = remetente;
	}

	public void enviar(MensagemSaga mensagem) {
		TipoEmail tipo = TipoEmail.de(mensagem.tipo());
		if (tipo == null) {
			log.warn("sagaId={} tipo='{}' desconhecido — mensagem descartada", mensagem.sagaId(), mensagem.tipo());
			return;
		}

		String para = mensagem.texto("para");
		if (para == null || para.isBlank()) {
			log.warn("sagaId={} tipo={} sem campo 'para' no payload — mensagem descartada",
					mensagem.sagaId(), tipo.tipo());
			return;
		}

		SimpleMailMessage email = new SimpleMailMessage();
		email.setTo(para);
		email.setSubject(tipo.assunto());
		email.setText(corpo(tipo, mensagem));

		remetente.send(email);
		log.info("sagaId={} tipo={} para={} resultado=ENVIADO", mensagem.sagaId(), tipo.tipo(), para);
	}

	private String corpo(TipoEmail tipo, MensagemSaga mensagem) {
		String nome = ou(mensagem.texto("nome"), "cliente");

		return switch (tipo) {
			case SENHA_NOVA -> tipo.modelo().formatted(nome, ou(mensagem.texto("senha"), ""));
			case SOLICITACAO_NAO_EFETUADA -> tipo.modelo().formatted(nome);
			case SOLICITACAO_REJEITADA -> tipo.modelo().formatted(nome, ou(mensagem.texto("motivo"), "não informado"));
			case GERENTE_ALTERADO -> tipo.modelo().formatted(nome, ou(mensagem.texto("gerente"), "não informado"));
		};
	}

	private String ou(String valor, String padrao) {
		return valor == null || valor.isBlank() ? padrao : valor;
	}

}
