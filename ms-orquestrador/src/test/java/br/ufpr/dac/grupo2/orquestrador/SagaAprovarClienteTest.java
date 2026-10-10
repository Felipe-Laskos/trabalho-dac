package br.ufpr.dac.grupo2.orquestrador;

import static br.ufpr.dac.grupo2.orquestrador.Bancada.SAGA_ID;
import static br.ufpr.dac.grupo2.orquestrador.OrquestradorSaga.FALHA_TECNICA;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.AUTH_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.CLIENTE_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.CONTA_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.EMAIL_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.GERENTE_CMD;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import br.ufpr.dac.grupo2.orquestrador.Bancada.Jobs.Desfecho;
import br.ufpr.dac.grupo2.orquestrador.service.SagaAprovarCliente;

class SagaAprovarClienteTest {

	private static final String CPF = "11122233396";
	private static final String NOME = "Fulano de Tal";
	private static final String EMAIL = "fulano@exemplo.com.br";
	private static final String GADAMANTIO = "40501740066";
	private static final List<String> ATIVOS = List.of("98574307084", "64065268052", "23862179060", GADAMANTIO);
	private static final Map<String, Object> NOMES = Map.of("98574307084", "Geniéve", "64065268052", "Godophredo",
			"23862179060", "Gyândula", GADAMANTIO, "Gadamântio");
	private static final String SENHA = "Xk7pQ2mZ";

	@Test
	void aprovaOClienteNaOrdemDoContratoEEnviaASenhaPorEmail() {
		Bancada b = new Bancada(new SagaAprovarCliente());
		b.iniciar("aprovar-cliente", Map.of("cpf", CPF));
		b.esperaPublicado(CLIENTE_CMD, "aprovar-solicitacao", Map.of("cpf", CPF));

		b.sucesso("aprovar-solicitacao", Map.of("nome", NOME, "email", EMAIL));
		b.esperaPublicado(GERENTE_CMD, "listar-ativos", Map.of());

		b.sucesso("listar-ativos", Map.of("cpfsAtivos", ATIVOS, "nomesGerentes", NOMES));
		b.esperaPublicado(CONTA_CMD, "gerente-com-menos-clientes", Map.of("cpfsAtivos", ATIVOS));

		b.sucesso("gerente-com-menos-clientes", Map.of("cpfGerente", GADAMANTIO));
		b.esperaPublicado(CLIENTE_CMD, "criar-cliente", Map.of("cpf", CPF));

		b.sucesso("criar-cliente", Map.of());
		b.esperaPublicado(AUTH_CMD, "criar-usuario", Map.of("cpf", CPF, "login", EMAIL, "tipo", "CLIENTE"));

		b.sucesso("criar-usuario", Map.of("cpf", CPF, "senha", SENHA));
		b.esperaPublicado(CONTA_CMD, "criar-conta", Map.of("cpfCliente", CPF, "cpfGerente", GADAMANTIO));
		assertFalse(b.estados.gravado(SAGA_ID).contains(SENHA));

		b.sucesso("criar-conta", Map.of("numeroConta", "4821", "cpfCliente", CPF, "cpfGerente", GADAMANTIO));
		b.esperaPublicado(EMAIL_CMD, "email.senha-nova", Map.of("para", EMAIL, "nome", NOME, "senha", SENHA));

		Desfecho job = b.jobs.unico();
		assertEquals("CONCLUIDO", job.status());
		assertEquals("clientes", job.dominio());
		assertEquals(CPF, job.resourceId());
		assertEquals(List.of("cache:cliente:" + CPF), b.cache.invalidadas);
		assertNull(b.senhas.consultar(SAGA_ID));
	}

	@Test
	void emailDuplicadoNoAuthDevolveASolicitacaoComMotivoEAvisaOCliente() {
		Bancada b = ateCriarUsuario();
		b.falha("criar-usuario", "E-mail já cadastrado", Map.of("motivoRecusa", "E-mail já cadastrado"));
		b.esperaPublicado(CLIENTE_CMD, "compensar-criar-cliente", Map.of("cpf", CPF));

		b.sucesso("compensar-criar-cliente", Map.of());
		b.esperaPublicado(CLIENTE_CMD, "compensar-aprovar-solicitacao",
				Map.of("cpf", CPF, "motivoRecusa", "E-mail já cadastrado"));

		b.sucesso("compensar-aprovar-solicitacao", Map.of());
		b.esperaPublicado(EMAIL_CMD, "email.solicitacao-nao-efetuada", Map.of("para", EMAIL, "nome", NOME));

		Desfecho job = b.jobs.unico();
		assertEquals("FALHA", job.status());
		assertEquals("E-mail já cadastrado", job.erro());
	}

	@Test
	void timeoutAoCriarAContaDesfazTudoEOJobLevaFraseParaHumano() {
		Bancada b = ateCriarUsuario();
		b.sucesso("criar-usuario", Map.of("cpf", CPF, "senha", SENHA));
		b.estourarTempo();

		assertEquals(Map.of("cpfCliente", CPF), b.fila.de("compensar-criar-conta").payload());
		b.esperaPublicado(AUTH_CMD, "compensar-criar-usuario", Map.of("cpf", CPF));

		b.sucesso("compensar-criar-usuario", Map.of("removido", true));
		b.esperaPublicado(CLIENTE_CMD, "compensar-criar-cliente", Map.of("cpf", CPF));

		b.sucesso("compensar-criar-cliente", Map.of());
		b.esperaPublicado(CLIENTE_CMD, "compensar-aprovar-solicitacao", Map.of("cpf", CPF));

		b.sucesso("compensar-aprovar-solicitacao", Map.of());
		b.esperaPublicado(EMAIL_CMD, "email.solicitacao-nao-efetuada", Map.of("para", EMAIL, "nome", NOME));

		assertEquals(FALHA_TECNICA, b.jobs.unico().erro());
		assertFalse(b.fila.tipos().contains("email.senha-nova"));
		assertNull(b.senhas.consultar(SAGA_ID));
	}

	@Test
	void solicitacaoJaProcessadaFalhaSemCompensarNemMandarEmail() {
		Bancada b = new Bancada(new SagaAprovarCliente());
		b.iniciar("aprovar-cliente", Map.of("cpf", CPF));
		b.falha("aprovar-solicitacao", "Esta solicitação já foi processada", Map.of());

		assertEquals(List.of("aprovar-solicitacao"), b.fila.tipos());
		assertEquals("Esta solicitação já foi processada", b.jobs.unico().erro());
	}

	private static Bancada ateCriarUsuario() {
		Bancada b = new Bancada(new SagaAprovarCliente());
		b.iniciar("aprovar-cliente", Map.of("cpf", CPF));
		b.sucesso("aprovar-solicitacao", Map.of("nome", NOME, "email", EMAIL));
		b.sucesso("listar-ativos", Map.of("cpfsAtivos", ATIVOS, "nomesGerentes", NOMES));
		b.sucesso("gerente-com-menos-clientes", Map.of("cpfGerente", GADAMANTIO));
		b.sucesso("criar-cliente", Map.of());
		return b;
	}

}
