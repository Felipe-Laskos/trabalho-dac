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
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import br.ufpr.dac.grupo2.orquestrador.Bancada.Jobs.Desfecho;
import br.ufpr.dac.grupo2.orquestrador.service.SagaInserirGerente;

class SagaInserirGerenteTest {

	private static final String CPF = "40501740066";
	private static final String NOME = "Gadamântio";
	private static final String EMAIL = "ger4@bantads.com.br";
	private static final String TELEFONE = "41988887777";
	private static final String SENHA = "tads";
	private static final String GODOPHREDO = "64065268052";
	private static final Map<String, Object> PEDIDO = Map.of("cpf", CPF, "nome", NOME, "email", EMAIL,
			"telefone", TELEFONE, "senha", SENHA, "cpfGerenteSolicitante", "98574307084");
	private static final Map<String, Object> CONTA_DO_GODOPHREDO = Map.of("transferir", true, "numeroConta", "7617",
			"cpfCliente", "76179646090", "cpfGerenteAnterior", GODOPHREDO);

	@Test
	void semContaATransferirCriaOGerenteEPulaOsPassos4a6() {
		Bancada b = new Bancada(new SagaInserirGerente());
		b.iniciar("inserir-gerente", PEDIDO);
		b.esperaPublicado(GERENTE_CMD, "inserir-gerente", Map.of("cpf", CPF, "nome", NOME, "email", EMAIL, "telefone", TELEFONE));
		assertFalse(b.estados.gravado(SAGA_ID).contains("senha"));

		b.sucesso("inserir-gerente", Map.of("cpf", CPF));
		b.esperaPublicado(AUTH_CMD, "criar-usuario", Map.of("cpf", CPF, "login", EMAIL, "tipo", "GERENTE", "senha", SENHA));

		b.sucesso("criar-usuario", Map.of("cpf", CPF));
		b.esperaPublicado(CONTA_CMD, "conta-a-transferir", Map.of("cpfGerente", CPF));

		b.sucesso("conta-a-transferir", Map.of("transferir", false));

		assertEquals(List.of("inserir-gerente", "criar-usuario", "conta-a-transferir"), b.fila.tipos());
		Desfecho job = b.jobs.unico();
		assertEquals("CONCLUIDO", job.status());
		assertEquals("gerentes", job.dominio());
		assertEquals(CPF, job.resourceId());
		assertEquals(List.of("cache:gerente:" + CPF), b.cache.invalidadas);
		assertFalse(b.estados.gravado(SAGA_ID).contains("senha"));
		assertNull(b.senhas.consultar(SAGA_ID));
	}

	@Test
	void comContaATransferirAtribuiAContaEAvisaOCliente() {
		Bancada b = ateContaATransferir();
		b.sucesso("conta-a-transferir", CONTA_DO_GODOPHREDO);
		b.esperaPublicado(CONTA_CMD, "atribuir-conta", Map.of("numeroConta", "7617", "cpfGerente", CPF));

		b.sucesso("atribuir-conta", Map.of("numeroConta", "7617"));
		b.esperaPublicado(CLIENTE_CMD, "obter-clientes-por-cpf", Map.of("cpfs", List.of("76179646090")));

		b.sucesso("obter-clientes-por-cpf", Map.of("clientes",
				List.of(Map.of("cpf", "76179646090", "nome", "Coândrya", "email", "cli5@bantads.com.br"))));
		b.esperaPublicado(EMAIL_CMD, "email.gerente-alterado",
				Map.of("para", "cli5@bantads.com.br", "nome", "Coândrya", "gerente", NOME));

		assertEquals("CONCLUIDO", b.jobs.unico().status());
		assertEquals(List.of("cache:gerente:" + CPF, "cache:gerente:" + GODOPHREDO), b.cache.invalidadas);
	}

	@Test
	void emailDuplicadoRemoveOGerenteEChegaLiteralNoJob() {
		Bancada b = new Bancada(new SagaInserirGerente());
		b.iniciar("inserir-gerente", PEDIDO);
		b.sucesso("inserir-gerente", Map.of("cpf", CPF));
		b.falha("criar-usuario", "E-mail já cadastrado", Map.of("motivoRecusa", "E-mail já cadastrado"));
		b.esperaPublicado(GERENTE_CMD, "compensar-inserir-gerente", Map.of("cpf", CPF));

		b.sucesso("compensar-inserir-gerente", Map.of());

		Desfecho job = b.jobs.unico();
		assertEquals("FALHA", job.status());
		assertEquals("E-mail já cadastrado", job.erro());
		assertEquals(List.of("inserir-gerente", "criar-usuario", "compensar-inserir-gerente"), b.fila.tipos());
		assertNull(b.senhas.consultar(SAGA_ID));
	}

	@Test
	void timeoutNoPasso2MostraFraseParaHumanoNoJobEODetalheNoLog() {
		Bancada b = new Bancada(new SagaInserirGerente());
		b.iniciar("inserir-gerente", PEDIDO);
		b.sucesso("inserir-gerente", Map.of("cpf", CPF));
		try (Bancada.Log log = new Bancada.Log()) {
			b.estourarTempo();
			assertTrue(log.contem("timeout de 30 s no passo 2 (criar-usuario)"));
		}

		assertEquals(Map.of("cpf", CPF), b.fila.de("compensar-criar-usuario").payload());
		b.esperaPublicado(GERENTE_CMD, "compensar-inserir-gerente", Map.of("cpf", CPF));
		b.sucesso("compensar-inserir-gerente", Map.of());

		Desfecho job = b.jobs.unico();
		assertEquals("FALHA", job.status());
		assertEquals("Não foi possível concluir a operação agora. Tente novamente em alguns instantes.", job.erro());
		assertFalse(job.erro().contains("timeout"));
		assertFalse(job.erro().contains("criar-usuario"));
	}

	@Test
	void timeoutAoAtribuirAContaDevolveAoGerenteAnterior() {
		Bancada b = ateContaATransferir();
		b.sucesso("conta-a-transferir", CONTA_DO_GODOPHREDO);
		b.estourarTempo();

		assertEquals(Map.of("numeroConta", "7617", "cpfGerente", GODOPHREDO), b.fila.de("compensar-atribuir-conta").payload());
		b.esperaPublicado(AUTH_CMD, "compensar-criar-usuario", Map.of("cpf", CPF));
		b.sucesso("compensar-criar-usuario", Map.of("removido", true));
		b.esperaPublicado(GERENTE_CMD, "compensar-inserir-gerente", Map.of("cpf", CPF));
		b.sucesso("compensar-inserir-gerente", Map.of());

		assertEquals(FALHA_TECNICA, b.jobs.unico().erro());
		assertFalse(b.fila.tipos().contains("email.gerente-alterado"));
	}

	private static Bancada ateContaATransferir() {
		Bancada b = new Bancada(new SagaInserirGerente());
		b.iniciar("inserir-gerente", PEDIDO);
		b.sucesso("inserir-gerente", Map.of("cpf", CPF));
		b.sucesso("criar-usuario", Map.of("cpf", CPF));
		return b;
	}

}
