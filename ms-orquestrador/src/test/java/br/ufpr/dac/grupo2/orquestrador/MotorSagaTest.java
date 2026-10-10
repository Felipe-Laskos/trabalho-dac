package br.ufpr.dac.grupo2.orquestrador;

import static br.ufpr.dac.grupo2.orquestrador.Bancada.SAGA_ID;
import static br.ufpr.dac.grupo2.orquestrador.OrquestradorSaga.FALHA_TECNICA;
import static br.ufpr.dac.grupo2.orquestrador.SagaDeTeste.TIPO;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.AUTH_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.CLIENTE_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.CONTA_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.EMAIL_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.GERENTE_CMD;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.MessageBuilder;

import br.ufpr.dac.grupo2.orquestrador.Bancada.Fila;
import br.ufpr.dac.grupo2.orquestrador.Bancada.Jobs.Desfecho;
import br.ufpr.dac.grupo2.orquestrador.model.DadosSaga;
import br.ufpr.dac.grupo2.orquestrador.model.Passo;
import br.ufpr.dac.grupo2.orquestrador.model.StatusSaga;

class MotorSagaTest {

	private static final Map<String, Object> INICIO = Map.of("id", "42", "valor", "100.00");

	@Test
	void iniciaPublicandoOPrimeiroPassoEEsperaAResposta() {
		Bancada b = new Bancada(quatroPassos());
		b.iniciar(TIPO, INICIO);

		b.esperaPublicado(CLIENTE_CMD, "reservar", Map.of("id", "42"));
		assertEquals(StatusSaga.EM_ANDAMENTO, b.estado().getStatus());
		assertEquals("reservar", b.estado().getAguardando());
		assertTrue(b.jobs.desfechos.isEmpty());
	}

	@Test
	void reentregaDoPedidoDeInicioNaoDisparaASagaDuasVezes() {
		Bancada b = new Bancada(quatroPassos());
		b.iniciar(TIPO, INICIO);
		b.iniciar(TIPO, INICIO);

		assertEquals(List.of("reservar"), b.fila.tipos());
	}

	@Test
	void tipoDeSagaDesconhecidoFechaOJobComFraseParaHumano() {
		Bancada b = new Bancada(quatroPassos());
		try (Bancada.Log log = new Bancada.Log()) {
			b.iniciar("saga-que-nao-existe", INICIO);
			assertTrue(log.contem("saga-que-nao-existe"));
		}

		assertEquals(FALHA_TECNICA, b.jobs.unico().erro());
		assertTrue(b.fila.publicados.isEmpty());
	}

	@Test
	void respostaDeOutroPassoEIgnorada() {
		Bancada b = new Bancada(quatroPassos());
		b.iniciar(TIPO, INICIO);
		b.sucesso("debitar", Map.of("reserva", "R-7"));

		assertEquals(List.of("reservar"), b.fila.tipos());
		assertEquals("reservar", b.estado().getAguardando());
	}

	@Test
	void respostaDeSagaDesconhecidaEMensagemMalformadaSaoDescartadas() {
		Bancada b = new Bancada(quatroPassos());
		b.sucesso("reservar", Map.of());
		b.orquestrador.responder(MessageBuilder.withBody("{isto não é json".getBytes(StandardCharsets.UTF_8)).build());
		b.orquestrador.iniciar(MessageBuilder.withBody("{isto não é json".getBytes(StandardCharsets.UTF_8)).build());

		assertTrue(b.fila.publicados.isEmpty());
		assertNull(b.estado());
		assertTrue(b.jobs.desfechos.isEmpty());
	}

	@Test
	void caminhoFelizRepassaOQueCadaPassoDevolveEFechaOJobComORecurso() {
		Bancada b = ateDebitar(quatroPassos());
		b.esperaPublicado(CONTA_CMD, "debitar", Map.of("reserva", "R-7", "valor", "100.00"));
		b.sucesso("debitar", Map.of());
		b.sucesso("confirmar", Map.of());

		assertEquals(List.of("reservar", "consultar", "debitar", "confirmar"), b.fila.tipos());
		Desfecho job = b.jobs.unico();
		assertEquals("CONCLUIDO", job.status());
		assertEquals("testes", job.dominio());
		assertEquals("42", job.resourceId());
		assertEquals(List.of("cache:teste:42"), b.cache.invalidadas);
		assertEquals(StatusSaga.CONCLUIDA, b.estado().getStatus());
		assertNull(b.estado().getAguardando());
	}

	@Test
	void passoCondicionalComCondicaoFalsaEPulado() {
		Bancada b = new Bancada(new SagaDeTeste(reservar(1), consultar(2), debitar(3).somenteSe(MotorSagaTest::cobrar), confirmar(4)));
		b.iniciar(TIPO, INICIO);
		b.sucesso("reservar", Map.of("reserva", "R-7"));
		b.sucesso("consultar", Map.of("cobrar", false));

		b.esperaPublicado(AUTH_CMD, "confirmar", Map.of("id", "42"));
		assertEquals(List.of("reservar", "consultar", "confirmar"), b.fila.tipos());
	}

	@Test
	void passoCondicionalComCondicaoVerdadeiraExecuta() {
		Bancada b = new Bancada(new SagaDeTeste(reservar(1), consultar(2), debitar(3).somenteSe(MotorSagaTest::cobrar), confirmar(4)));
		b.iniciar(TIPO, INICIO);
		b.sucesso("reservar", Map.of("reserva", "R-7"));
		b.sucesso("consultar", Map.of("cobrar", true));

		b.esperaPublicado(CONTA_CMD, "debitar", Map.of("reserva", "R-7", "valor", "100.00"));
	}

	@Test
	void passoPuladoNaoECompensado() {
		Bancada b = new Bancada(new SagaDeTeste(reservar(1), consultar(2), debitar(3).somenteSe(MotorSagaTest::cobrar), confirmar(4)));
		b.iniciar(TIPO, INICIO);
		b.sucesso("reservar", Map.of("reserva", "R-7"));
		b.sucesso("consultar", Map.of("cobrar", false));
		b.falha("confirmar", "Saldo insuficiente", Map.of());

		b.esperaPublicado(CLIENTE_CMD, "compensar-reservar", Map.of("id", "42"));
		assertFalse(b.fila.tipos().contains("compensar-debitar"));
	}

	@Test
	void passoLocalRodaNoOrquestradorSemPublicarNada() {
		List<String> anotados = new ArrayList<>();
		Bancada b = new Bancada(new SagaDeTeste(reservar(1),
				Passo.local(2, "anotar", dados -> anotados.add(dados.texto("id"))), confirmar(3)));
		b.iniciar(TIPO, INICIO);
		assertTrue(anotados.isEmpty());

		b.sucesso("reservar", Map.of());

		assertEquals(List.of("42"), anotados);
		assertEquals(List.of("reservar", "confirmar"), b.fila.tipos());
		assertEquals("confirmar", b.estado().getAguardando());
	}

	@Test
	void falhaNoPassoLocalCompensaOsAnterioresEOJobLevaFraseParaHumano() {
		Bancada b = new Bancada(new SagaDeTeste(reservar(1), Passo.local(2, "anotar", dados -> {
			throw new IllegalStateException("Unable to connect to Redis");
		}), confirmar(3)));
		try (Bancada.Log log = new Bancada.Log()) {
			b.iniciar(TIPO, INICIO);
			b.sucesso("reservar", Map.of());
			assertTrue(log.contem("passo 2 (anotar): Unable to connect to Redis"));
		}

		b.esperaPublicado(CLIENTE_CMD, "compensar-reservar", Map.of("id", "42"));
		b.sucesso("compensar-reservar", Map.of());

		assertEquals(FALHA_TECNICA, b.jobs.unico().erro());
		assertFalse(b.fila.tipos().contains("confirmar"));
	}

	@Test
	void emailEmLotePublicaUmComandoPorDestinatarioSemEsperarRespostaNemTimeout() {
		Bancada b = new Bancada(new SagaDeTeste(reservar(1),
				Passo.emailParaCada(2, "email.aviso", dados -> dados.lista("clientes").stream()
						.map(cliente -> Map.<String, Object>of("para", cliente.get("email")))
						.toList())));
		b.iniciar(TIPO, INICIO);
		b.sucesso("reservar", Map.of("clientes", List.of(
				Map.of("email", "cli1@bantads.com.br"), Map.of("email", "cli4@bantads.com.br"))));

		List<Fila.Publicado> emails = b.fila.publicados.subList(1, b.fila.publicados.size());
		assertEquals(List.of(EMAIL_CMD, EMAIL_CMD), emails.stream().map(Fila.Publicado::fila).toList());
		assertEquals(List.of(Map.of("para", "cli1@bantads.com.br"), Map.of("para", "cli4@bantads.com.br")),
				emails.stream().map(email -> email.comando().payload()).toList());
		assertEquals("CONCLUIDO", b.jobs.unico().status());
		assertNull(b.estado().getAguardando());

		b.estourarTempo();

		assertEquals(1, b.jobs.desfechos.size());
		assertEquals(3, b.fila.publicados.size());
	}

	@Test
	void resultadoInlineFechaOJobComOResultado() {
		Bancada b = new Bancada(new SagaDeTeste(reservar(1))
				.comResultadoInline(dados -> Map.of("mensagem", "Reserva " + dados.texto("reserva") + " feita")));
		b.iniciar(TIPO, INICIO);
		b.sucesso("reservar", Map.of("reserva", "R-7"));

		Desfecho job = b.jobs.unico();
		assertEquals("CONCLUIDO", job.status());
		assertEquals(Map.of("mensagem", "Reserva R-7 feita"), job.resultado());
		assertNull(job.resourceId());
	}

	@Test
	void falhaDeNegocioCompensaEmOrdemInversaUmPassoDeCadaVez() {
		Bancada b = ateDebitar(quatroPassos()
				.comEmailDeFalha(Passo.email(0, "email.falha", dados -> Map.of("para", "cli1@bantads.com.br"))));
		b.sucesso("debitar", Map.of());
		b.falha("confirmar", "Saldo insuficiente", Map.of());

		b.esperaPublicado(CONTA_CMD, "compensar-debitar", Map.of("reserva", "R-7"));
		assertEquals(StatusSaga.COMPENSANDO, b.estado().getStatus());
		assertTrue(b.jobs.desfechos.isEmpty());

		b.sucesso("compensar-debitar", Map.of());
		b.esperaPublicado(CLIENTE_CMD, "compensar-reservar", Map.of("id", "42"));

		b.sucesso("compensar-reservar", Map.of());
		b.esperaPublicado(EMAIL_CMD, "email.falha", Map.of("para", "cli1@bantads.com.br"));

		assertEquals(List.of("reservar", "consultar", "debitar", "confirmar",
				"compensar-debitar", "compensar-reservar", "email.falha"), b.fila.tipos());
		Desfecho job = b.jobs.unico();
		assertEquals("FALHA", job.status());
		assertEquals("Saldo insuficiente", job.erro());
		assertEquals(StatusSaga.COMPENSADA, b.estado().getStatus());
		assertEquals(List.of("cache:teste:42"), b.cache.invalidadas);
	}

	@Test
	void compensacaoQueFalhaNaoImpedeAsSeguintes() {
		Bancada b = ateDebitar(quatroPassos());
		b.sucesso("debitar", Map.of());
		b.falha("confirmar", "Saldo insuficiente", Map.of());
		b.falha("compensar-debitar", "Reserva não encontrada", Map.of());

		b.esperaPublicado(CLIENTE_CMD, "compensar-reservar", Map.of("id", "42"));
		b.sucesso("compensar-reservar", Map.of());
		assertEquals("Saldo insuficiente", b.jobs.unico().erro());
	}

	@Test
	void timeoutCompensaOPassoIncertoSemEsperarEDepoisOsExecutados() {
		Bancada b = ateDebitar(quatroPassos());
		try (Bancada.Log log = new Bancada.Log()) {
			b.estourarTempo();
			assertTrue(log.contem("timeout de 30 s no passo 3 (debitar)"));
		}

		assertEquals(List.of("reservar", "consultar", "debitar", "compensar-debitar", "compensar-reservar"), b.fila.tipos());
		assertEquals(Map.of("reserva", "R-7"), b.fila.de("compensar-debitar").payload());
		assertEquals("compensar-reservar", b.estado().getAguardando());

		b.sucesso("compensar-reservar", Map.of());

		Desfecho job = b.jobs.unico();
		assertEquals("FALHA", job.status());
		assertEquals(FALHA_TECNICA, job.erro());
	}

	@Test
	void passoIncertoSemCompensacaoSoDesfazOsAnteriores() {
		Bancada b = new Bancada(quatroPassos());
		b.iniciar(TIPO, INICIO);
		b.sucesso("reservar", Map.of("reserva", "R-7"));
		b.estourarTempo();

		assertEquals(List.of("reservar", "consultar", "compensar-reservar"), b.fila.tipos());
	}

	@Test
	void passoSoEstouraOTempoAos30Segundos() {
		Bancada b = ateDebitar(quatroPassos());
		b.passarTempo(Duration.ofSeconds(29));
		assertEquals(StatusSaga.EM_ANDAMENTO, b.estado().getStatus());
		assertEquals("debitar", b.estado().getAguardando());

		b.passarTempo(Duration.ofSeconds(1));
		assertEquals(StatusSaga.COMPENSANDO, b.estado().getStatus());
	}

	@Test
	void dlqDoPassoCorrenteEFalhaTecnica() {
		Bancada b = ateDebitar(quatroPassos());
		try (Bancada.Log log = new Bancada.Log()) {
			b.dlq("debitar");
			assertTrue(log.contem("debitar foi para a DLQ"));
		}

		assertEquals(List.of("reservar", "consultar", "debitar", "compensar-debitar", "compensar-reservar"), b.fila.tipos());
		b.sucesso("compensar-reservar", Map.of());
		assertEquals(FALHA_TECNICA, b.jobs.unico().erro());
	}

	@Test
	void dlqETimeoutDoMesmoPassoCompensamUmaVezSo() {
		Bancada b = ateDebitar(quatroPassos());
		b.estados.envelhecer(SAGA_ID, Duration.ofSeconds(20));
		b.dlq("debitar");
		b.dlq("debitar");
		b.passarTempo(Duration.ofSeconds(15));

		assertEquals(1, Collections.frequency(b.fila.tipos(), "compensar-debitar"));
		assertEquals(1, Collections.frequency(b.fila.tipos(), "compensar-reservar"));
		assertEquals("compensar-reservar", b.estado().getAguardando());

		b.sucesso("compensar-reservar", Map.of());
		assertEquals(FALHA_TECNICA, b.jobs.unico().erro());
	}

	@Test
	void respostaAtrasadaDoPassoQueEstourouOTempoEIgnorada() {
		Bancada b = ateDebitar(quatroPassos());
		b.estourarTempo();
		b.sucesso("debitar", Map.of());

		assertFalse(b.fila.tipos().contains("confirmar"));
		assertEquals("compensar-reservar", b.estado().getAguardando());
	}

	@Test
	void compensacaoSemRespostaSegueParaAProximaEMantemOErroDeNegocio() {
		Bancada b = ateDebitar(quatroPassos());
		b.sucesso("debitar", Map.of());
		b.falha("confirmar", "Saldo insuficiente", Map.of());
		try (Bancada.Log log = new Bancada.Log()) {
			b.estourarTempo();
			assertTrue(log.contem("compensação sem resposta"));
		}

		b.esperaPublicado(CLIENTE_CMD, "compensar-reservar", Map.of("id", "42"));
		b.estourarTempo();

		assertEquals("Saldo insuficiente", b.jobs.unico().erro());
		assertEquals(StatusSaga.COMPENSADA, b.estado().getStatus());
	}

	@Test
	void falhaSemMensagemDoServicoViraFraseParaHumano() {
		Bancada b = new Bancada(quatroPassos());
		b.iniciar(TIPO, INICIO);
		try (Bancada.Log log = new Bancada.Log()) {
			b.falha("reservar", null, Map.of());
			assertTrue(log.contem("reservar respondeu FALHA sem erro"));
		}

		assertEquals(FALHA_TECNICA, b.jobs.unico().erro());
		assertEquals(List.of("reservar"), b.fila.tipos());
	}

	@Test
	void campoAusenteParaMontarUmPassoEFalhaTecnica() {
		Bancada b = new Bancada(quatroPassos());
		try (Bancada.Log log = new Bancada.Log()) {
			b.iniciar(TIPO, Map.of("id", "42"));
			b.sucesso("reservar", Map.of("reserva", "R-7"));
			b.sucesso("consultar", Map.of());
			assertTrue(log.contem("passo 3 (debitar): campo 'valor' ausente na SAGA"));
		}

		assertFalse(b.fila.tipos().contains("debitar"));
		b.esperaPublicado(CLIENTE_CMD, "compensar-reservar", Map.of("id", "42"));
		b.sucesso("compensar-reservar", Map.of());
		assertEquals(FALHA_TECNICA, b.jobs.unico().erro());
	}

	@Test
	void senhaNuncaVaiParaOEstadoDaSagaESomeAoFim() {
		Bancada b = new Bancada(new SagaDeTeste(
				Passo.transacional(1, AUTH_CMD, "criar-usuario",
						dados -> Map.of("id", dados.texto("id"), "senha", dados.senha()),
						"compensar-criar-usuario", dados -> Map.of("id", dados.texto("id"))),
				Passo.email(2, "email.senha-nova", dados -> Map.of("senha", dados.senha()))));

		b.iniciar(TIPO, Map.of("id", "42", "senha", "S3nh@Informada"));
		assertEquals("S3nh@Informada", b.fila.de("criar-usuario").payload().get("senha"));
		assertFalse(b.estados.gravado(SAGA_ID).contains("S3nh@Informada"));

		b.sucesso("criar-usuario", Map.of("id", "42", "senha", "Xk7pQ2mZ"));
		assertEquals("Xk7pQ2mZ", b.fila.de("email.senha-nova").payload().get("senha"));
		assertFalse(b.estados.gravado(SAGA_ID).contains("Xk7pQ2mZ"));
		assertFalse(b.estados.gravado(SAGA_ID).contains("senha"));
		assertNull(b.senhas.consultar(SAGA_ID));
	}

	private static Bancada ateDebitar(SagaDeTeste saga) {
		Bancada b = new Bancada(saga);
		b.iniciar(TIPO, INICIO);
		b.sucesso("reservar", Map.of("reserva", "R-7"));
		b.sucesso("consultar", Map.of());
		return b;
	}

	private static SagaDeTeste quatroPassos() {
		return new SagaDeTeste(reservar(1), consultar(2), debitar(3), confirmar(4));
	}

	private static Passo reservar(int numero) {
		return Passo.transacional(numero, CLIENTE_CMD, "reservar", dados -> Map.of("id", dados.texto("id")),
				"compensar-reservar", dados -> Map.of("id", dados.texto("id")));
	}

	private static Passo consultar(int numero) {
		return Passo.consulta(numero, GERENTE_CMD, "consultar", dados -> Map.of("id", dados.texto("id")));
	}

	private static Passo debitar(int numero) {
		return Passo.transacional(numero, CONTA_CMD, "debitar",
				dados -> Map.of("reserva", dados.texto("reserva"), "valor", dados.texto("valor")),
				"compensar-debitar", dados -> Map.of("reserva", dados.texto("reserva")));
	}

	private static Passo confirmar(int numero) {
		return Passo.transacional(numero, AUTH_CMD, "confirmar", dados -> Map.of("id", dados.texto("id")),
				"compensar-confirmar", dados -> Map.of("id", dados.texto("id")));
	}

	private static boolean cobrar(DadosSaga dados) {
		return Boolean.parseBoolean(dados.opcional("cobrar").orElse("false"));
	}

}
