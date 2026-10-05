package br.ufpr.dac.grupo2.orquestrador;

import static br.ufpr.dac.grupo2.orquestrador.OrquestradorSaga.FALHA_TECNICA;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.AUTH_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.CLIENTE_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.CONTA_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.EMAIL_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.GERENTE_CMD;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import br.ufpr.dac.grupo2.orquestrador.Bancada.Fila;
import br.ufpr.dac.grupo2.orquestrador.Bancada.Jobs.Desfecho;
import br.ufpr.dac.grupo2.orquestrador.service.SagaRemoverGerente;

class SagaRemoverGerenteTest {

	private static final String GENIEVE = "98574307084";
	private static final String GODOPHREDO = "64065268052";
	private static final String GYANDULA = "23862179060";
	private static final String GADAMANTIO = "40501740066";
	private static final Map<String, Object> NOMES = Map.of(GENIEVE, "Geniéve", GODOPHREDO, "Godophredo",
			GYANDULA, "Gyândula", GADAMANTIO, "Gadamântio");

	private final Bancada.Sessoes sessoes = new Bancada.Sessoes();

	@Test
	void removeOGerenteEncerraASessaoTransfereAsContasEAvisaCadaCliente() {
		Bancada b = new Bancada(new SagaRemoverGerente(sessoes));
		b.iniciar("remover-gerente", Map.of("cpf", GENIEVE, "cpfGerenteSolicitante", GODOPHREDO));
		b.esperaPublicado(GERENTE_CMD, "inativar-gerente", Map.of("cpf", GENIEVE));

		b.sucesso("inativar-gerente", Map.of("cpf", GENIEVE));
		b.esperaPublicado(AUTH_CMD, "desativar-usuario", Map.of("cpf", GENIEVE));
		assertTrue(sessoes.encerradas.isEmpty());

		b.sucesso("desativar-usuario", Map.of("cpf", GENIEVE));
		assertEquals(List.of(GENIEVE), sessoes.encerradas);
		assertFalse(b.fila.tipos().contains("encerrar-sessoes"));
		b.esperaPublicado(GERENTE_CMD, "listar-ativos", Map.of());

		List<String> ativos = List.of(GODOPHREDO, GYANDULA, GADAMANTIO);
		b.sucesso("listar-ativos", Map.of("cpfsAtivos", ativos, "nomesGerentes", NOMES));
		b.esperaPublicado(CONTA_CMD, "transferir-contas-do-gerente", Map.of("cpfGerente", GENIEVE, "cpfsAtivos", ativos));

		b.sucesso("transferir-contas-do-gerente", Map.of("cpfGerenteDestino", GADAMANTIO, "contas", List.of(
				Map.of("numero", "1291", "cpfCliente", "12912861012"),
				Map.of("numero", "5887", "cpfCliente", "58872160006"))));
		b.esperaPublicado(CLIENTE_CMD, "obter-clientes-por-cpf", Map.of("cpfs", List.of("12912861012", "58872160006")));

		b.sucesso("obter-clientes-por-cpf", Map.of("clientes", List.of(
				Map.of("cpf", "12912861012", "nome", "Catharyna", "email", "cli1@bantads.com.br"),
				Map.of("cpf", "58872160006", "nome", "Cutardo", "email", "cli4@bantads.com.br"))));

		List<Fila.Publicado> emails = b.fila.publicados.subList(5, b.fila.publicados.size());
		assertEquals(List.of(EMAIL_CMD, EMAIL_CMD), emails.stream().map(Fila.Publicado::fila).toList());
		assertEquals(List.of(
				Map.of("para", "cli1@bantads.com.br", "nome", "Catharyna", "gerente", "Gadamântio"),
				Map.of("para", "cli4@bantads.com.br", "nome", "Cutardo", "gerente", "Gadamântio")),
				emails.stream().map(email -> email.comando().payload()).toList());

		Desfecho job = b.jobs.unico();
		assertEquals("CONCLUIDO", job.status());
		assertEquals(Map.of("mensagem", "Gerente removido; 2 contas transferidas para Gadamântio"), job.resultado());
		assertEquals(List.of("cache:gerente:" + GENIEVE, "cache:gerente:" + GADAMANTIO), b.cache.invalidadas);
	}

	@Test
	void gerenteSemContasNaoConsultaClientesNemMandaEmail() {
		Bancada b = ateTransferir(GADAMANTIO, List.of(GENIEVE, GODOPHREDO, GYANDULA));
		b.sucesso("transferir-contas-do-gerente", Map.of("cpfGerenteDestino", GYANDULA, "contas", List.of()));

		assertEquals(List.of("inativar-gerente", "desativar-usuario", "listar-ativos", "transferir-contas-do-gerente"),
				b.fila.tipos());
		assertEquals(Map.of("mensagem", "Gerente removido; não havia contas a transferir"), b.jobs.unico().resultado());
	}

	@Test
	void umaContaTransferidaNoSingular() {
		Bancada b = ateTransferir(GYANDULA, List.of(GENIEVE, GODOPHREDO, GADAMANTIO));
		b.sucesso("transferir-contas-do-gerente", Map.of("cpfGerenteDestino", GADAMANTIO,
				"contas", List.of(Map.of("numero", "8573", "cpfCliente", "85733854057"))));
		b.sucesso("obter-clientes-por-cpf", Map.of("clientes",
				List.of(Map.of("cpf", "85733854057", "nome", "Catianna", "email", "cli3@bantads.com.br"))));

		assertEquals(Map.of("mensagem", "Gerente removido; 1 conta transferida para Gadamântio"), b.jobs.unico().resultado());
	}

	@Test
	void ultimoGerenteAtivoFalhaNoPasso1SemTocarNaSessao() {
		Bancada b = new Bancada(new SagaRemoverGerente(sessoes));
		b.iniciar("remover-gerente", Map.of("cpf", GENIEVE, "cpfGerenteSolicitante", GODOPHREDO));
		b.falha("inativar-gerente", "Não é possível remover o último gerente ativo", Map.of());

		assertEquals(List.of("inativar-gerente"), b.fila.tipos());
		assertTrue(sessoes.encerradas.isEmpty());
		assertEquals("Não é possível remover o último gerente ativo", b.jobs.unico().erro());
	}

	@Test
	void falhaAoEncerrarASessaoReativaOGerente() {
		sessoes.falha = new IllegalStateException("Unable to connect to Redis");
		Bancada b = new Bancada(new SagaRemoverGerente(sessoes));
		b.iniciar("remover-gerente", Map.of("cpf", GENIEVE, "cpfGerenteSolicitante", GODOPHREDO));
		b.sucesso("inativar-gerente", Map.of("cpf", GENIEVE));
		try (Bancada.Log log = new Bancada.Log()) {
			b.sucesso("desativar-usuario", Map.of("cpf", GENIEVE));
			assertTrue(log.contem("passo 3 (encerrar-sessoes): Unable to connect to Redis"));
		}

		b.esperaPublicado(AUTH_CMD, "compensar-desativar-usuario", Map.of("cpf", GENIEVE));
		b.sucesso("compensar-desativar-usuario", Map.of("reativado", true));
		b.esperaPublicado(GERENTE_CMD, "compensar-inativar-gerente", Map.of("cpf", GENIEVE));
		b.sucesso("compensar-inativar-gerente", Map.of());

		assertEquals(FALHA_TECNICA, b.jobs.unico().erro());
		assertFalse(b.fila.tipos().contains("listar-ativos"));
	}

	@Test
	void timeoutAoTransferirDesfazATransferenciaEReativaOGerente() {
		Bancada b = ateTransferir(GENIEVE, List.of(GODOPHREDO, GYANDULA, GADAMANTIO));
		b.estourarTempo();

		assertEquals(Map.of("cpfGerente", GENIEVE), b.fila.de("compensar-transferir-contas").payload());
		b.esperaPublicado(AUTH_CMD, "compensar-desativar-usuario", Map.of("cpf", GENIEVE));
		b.sucesso("compensar-desativar-usuario", Map.of("reativado", true));
		b.esperaPublicado(GERENTE_CMD, "compensar-inativar-gerente", Map.of("cpf", GENIEVE));
		b.sucesso("compensar-inativar-gerente", Map.of());

		assertEquals(List.of("inativar-gerente", "desativar-usuario", "listar-ativos", "transferir-contas-do-gerente",
				"compensar-transferir-contas", "compensar-desativar-usuario", "compensar-inativar-gerente"), b.fila.tipos());
		assertEquals(FALHA_TECNICA, b.jobs.unico().erro());
	}

	private Bancada ateTransferir(String cpf, List<String> ativos) {
		Bancada b = new Bancada(new SagaRemoverGerente(sessoes));
		b.iniciar("remover-gerente", Map.of("cpf", cpf, "cpfGerenteSolicitante", GODOPHREDO));
		b.sucesso("inativar-gerente", Map.of("cpf", cpf));
		b.sucesso("desativar-usuario", Map.of("cpf", cpf));
		b.sucesso("listar-ativos", Map.of("cpfsAtivos", ativos, "nomesGerentes", NOMES));
		return b;
	}

}
