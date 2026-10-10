package br.ufpr.dac.grupo2.orquestrador;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;

import br.ufpr.dac.grupo2.orquestrador.dto.Comando;
import br.ufpr.dac.grupo2.orquestrador.dto.Resposta;
import br.ufpr.dac.grupo2.orquestrador.messaging.Publicador;
import br.ufpr.dac.grupo2.orquestrador.model.EstadoSaga;
import br.ufpr.dac.grupo2.orquestrador.repository.CacheRepository;
import br.ufpr.dac.grupo2.orquestrador.repository.EstadoSagaRepository;
import br.ufpr.dac.grupo2.orquestrador.repository.JobRepository;
import br.ufpr.dac.grupo2.orquestrador.repository.SessaoRepository;
import br.ufpr.dac.grupo2.orquestrador.service.Saga;
import br.ufpr.dac.grupo2.orquestrador.service.SenhasEmTransito;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

final class Bancada {

	static final String SAGA_ID = "3f2b8c1e-0d4a-4f6e-9a7b-5c8d2e1f0a93";

	private static final String AGORA = "2026-10-04T10:00:00";

	final ObjectMapper json = JsonMapper.builder().build();
	final Estados estados = new Estados(json);
	final Jobs jobs = new Jobs();
	final Cache cache = new Cache();
	final Fila fila = new Fila(json);
	final SenhasEmTransito senhas = new SenhasEmTransito();
	final OrquestradorSaga orquestrador;

	Bancada(Saga... sagas) {
		orquestrador = new OrquestradorSaga(List.of(sagas), estados, jobs, cache, senhas, fila, json);
	}

	void iniciar(String tipo, Map<String, Object> payload) {
		orquestrador.iniciar(mensagem(new Comando(SAGA_ID, tipo, AGORA, payload)));
	}

	void sucesso(String tipo, Map<String, Object> payload) {
		orquestrador.responder(mensagem(new Resposta(SAGA_ID, tipo, payload, AGORA, "SUCESSO", null)));
	}

	void falha(String tipo, String erro, Map<String, Object> payload) {
		orquestrador.responder(mensagem(new Resposta(SAGA_ID, tipo, payload, AGORA, "FALHA", erro)));
	}

	void dlq(String tipo) {
		orquestrador.falhaTecnica(mensagem(new Comando(SAGA_ID, tipo, AGORA, Map.of())));
	}

	void passarTempo(Duration tempo) {
		estados.envelhecer(SAGA_ID, tempo);
		orquestrador.verificarTimeouts();
	}

	void estourarTempo() {
		passarTempo(Duration.ofSeconds(31));
	}

	EstadoSaga estado() {
		return estados.ler(SAGA_ID);
	}

	void esperaPublicado(String fila, String tipo, Map<String, Object> payload) {
		Fila.Publicado ultimo = this.fila.ultimo();
		assertEquals(fila, ultimo.fila());
		assertEquals(SAGA_ID, ultimo.comando().sagaId());
		assertEquals(tipo, ultimo.comando().tipo());
		assertEquals(payload, ultimo.comando().payload());
	}

	Message mensagem(Object corpo) {
		return MessageBuilder.withBody(json.writeValueAsBytes(corpo)).build();
	}

	static final class Estados extends EstadoSagaRepository {

		private final ObjectMapper json;
		private final Map<String, String> gravados = new HashMap<>();

		Estados(ObjectMapper json) {
			super(null, json);
			this.json = json;
		}

		@Override
		public void salvar(EstadoSaga estado) {
			gravados.put(estado.getSagaId(), json.writeValueAsString(estado));
		}

		@Override
		public EstadoSaga ler(String sagaId) {
			String gravado = gravados.get(sagaId);
			return gravado == null ? null : json.readValue(gravado, EstadoSaga.class);
		}

		@Override
		public List<EstadoSaga> emCurso() {
			return gravados.keySet().stream()
					.map(this::ler)
					.filter(estado -> estado.getStatus().emCurso())
					.toList();
		}

		String gravado(String sagaId) {
			return gravados.get(sagaId);
		}

		void envelhecer(String sagaId, Duration tempo) {
			EstadoSaga estado = ler(sagaId);
			estado.setTimestampPasso(estado.getTimestampPasso() - tempo.toMillis());
			salvar(estado);
		}

	}

	static final class Jobs extends JobRepository {

		record Desfecho(String jobId, String status, String dominio, String resourceId,
				Map<String, Object> resultado, String erro) {
		}

		final List<Desfecho> desfechos = new ArrayList<>();

		Jobs() {
			super(null, null);
		}

		@Override
		public void concluir(String jobId, String dominio, String resourceId) {
			desfechos.add(new Desfecho(jobId, "CONCLUIDO", dominio, resourceId, null, null));
		}

		@Override
		public void concluirInline(String jobId, Map<String, Object> resultado) {
			desfechos.add(new Desfecho(jobId, "CONCLUIDO", null, null, resultado, null));
		}

		@Override
		public void falhar(String jobId, String erro) {
			desfechos.add(new Desfecho(jobId, "FALHA", null, null, null, erro));
		}

		Desfecho unico() {
			assertEquals(1, desfechos.size(), "o job deve ser fechado exatamente uma vez: " + desfechos);
			assertEquals(SAGA_ID, desfechos.getFirst().jobId());
			return desfechos.getFirst();
		}

	}

	static final class Cache extends CacheRepository {

		final List<String> invalidadas = new ArrayList<>();

		Cache() {
			super(null);
		}

		@Override
		public void invalidar(List<String> chaves) {
			invalidadas.addAll(chaves);
		}

	}

	static final class Fila extends Publicador {

		record Publicado(String fila, Comando comando) {
		}

		private final ObjectMapper json;
		final List<Publicado> publicados = new ArrayList<>();

		Fila(ObjectMapper json) {
			super(null, json);
			this.json = json;
		}

		@Override
		public void publicar(String fila, Object corpo) {
			publicados.add(new Publicado(fila, json.readValue(json.writeValueAsBytes(corpo), Comando.class)));
		}

		List<String> tipos() {
			return publicados.stream().map(publicado -> publicado.comando().tipo()).toList();
		}

		Publicado ultimo() {
			return publicados.getLast();
		}

		Comando de(String tipo) {
			List<Comando> comandos = publicados.stream()
					.map(Publicado::comando)
					.filter(comando -> comando.tipo().equals(tipo))
					.toList();
			assertEquals(1, comandos.size(), "esperava um único comando " + tipo + " em " + tipos());
			return comandos.getFirst();
		}

	}

	static final class Sessoes extends SessaoRepository {

		final List<String> encerradas = new ArrayList<>();
		RuntimeException falha;

		Sessoes() {
			super(null);
		}

		@Override
		public int encerrarTodas(String cpf) {
			if (falha != null) {
				throw falha;
			}
			encerradas.add(cpf);
			return 1;
		}

	}

	static final class Log implements AutoCloseable {

		private final Logger logger = (Logger) LoggerFactory.getLogger(OrquestradorSaga.class);
		private final ListAppender<ILoggingEvent> linhas = new ListAppender<>();

		Log() {
			linhas.start();
			logger.addAppender(linhas);
		}

		boolean contem(String trecho) {
			return linhas.list.stream().anyMatch(linha -> linha.getFormattedMessage().contains(trecho));
		}

		@Override
		public void close() {
			logger.detachAppender(linhas);
		}

	}

}
