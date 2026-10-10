package br.ufpr.dac.grupo2.orquestrador;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig;
import br.ufpr.dac.grupo2.orquestrador.dto.Comando;
import br.ufpr.dac.grupo2.orquestrador.dto.Resposta;
import br.ufpr.dac.grupo2.orquestrador.messaging.Publicador;
import br.ufpr.dac.grupo2.orquestrador.model.DadosSaga;
import br.ufpr.dac.grupo2.orquestrador.model.EstadoSaga;
import br.ufpr.dac.grupo2.orquestrador.model.Passo;
import br.ufpr.dac.grupo2.orquestrador.model.StatusSaga;
import br.ufpr.dac.grupo2.orquestrador.repository.CacheRepository;
import br.ufpr.dac.grupo2.orquestrador.repository.EstadoSagaRepository;
import br.ufpr.dac.grupo2.orquestrador.repository.JobRepository;
import br.ufpr.dac.grupo2.orquestrador.service.Saga;
import br.ufpr.dac.grupo2.orquestrador.service.SenhasEmTransito;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Component
public class OrquestradorSaga {

	private static final Logger log = LoggerFactory.getLogger(OrquestradorSaga.class);

	static final String FALHA_TECNICA = "Não foi possível concluir a operação agora. Tente novamente em alguns instantes.";

	private static final Duration TIMEOUT_PASSO = Duration.ofSeconds(30);
	private static final String SENHA = "senha";
	private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

	private final Map<String, Saga> sagas;
	private final EstadoSagaRepository estados;
	private final JobRepository jobs;
	private final CacheRepository cache;
	private final SenhasEmTransito senhas;
	private final Publicador publicador;
	private final ObjectMapper json;

	public OrquestradorSaga(
			List<Saga> sagas,
			EstadoSagaRepository estados,
			JobRepository jobs,
			CacheRepository cache,
			SenhasEmTransito senhas,
			Publicador publicador,
			ObjectMapper json) {
		this.sagas = sagas.stream().collect(Collectors.toMap(Saga::tipo, Function.identity()));
		this.estados = estados;
		this.jobs = jobs;
		this.cache = cache;
		this.senhas = senhas;
		this.publicador = publicador;
		this.json = json;
	}

	@RabbitListener(queues = RabbitConfig.SAGA_CMD)
	public synchronized void iniciar(Message mensagem) {
		Comando cmd = ler(mensagem, Comando.class);
		if (cmd == null || cmd.sagaId() == null || estados.ler(cmd.sagaId()) != null) {
			return;
		}

		Saga saga = sagas.get(cmd.tipo());
		if (saga == null) {
			log.error("sagaId={} tipo={} desconhecido", cmd.sagaId(), cmd.tipo());
			jobs.falhar(cmd.sagaId(), FALHA_TECNICA);
			return;
		}

		EstadoSaga estado = EstadoSaga.nova(cmd.sagaId(), cmd.tipo(), new HashMap<>(), agora());
		absorver(estado, cmd.payload());
		log.info("sagaId={} tipo={} iniciada", estado.getSagaId(), estado.getTipo());
		avancar(saga, estado, 1);
	}

	@RabbitListener(queues = RabbitConfig.ORQUESTRADOR_REPLY)
	public synchronized void responder(Message mensagem) {
		Resposta resposta = ler(mensagem, Resposta.class);
		if (resposta == null || resposta.sagaId() == null) {
			return;
		}

		EstadoSaga estado = estados.ler(resposta.sagaId());
		if (estado == null || resposta.tipo() == null || !resposta.tipo().equals(estado.getAguardando())) {
			log.info("sagaId={} tipo={} resposta fora do passo corrente, ignorada", resposta.sagaId(), resposta.tipo());
			return;
		}

		Saga saga = sagas.get(estado.getTipo());

		if (estado.getStatus() == StatusSaga.COMPENSANDO) {
			log.info("sagaId={} passo={} {} status={} erro={}", estado.getSagaId(), estado.getEtapaAtual(),
					resposta.tipo(), resposta.status(), resposta.erro());
			proximaCompensacao(saga, estado);
			return;
		}

		absorver(estado, resposta.payload());

		if (!resposta.sucesso()) {
			if (resposta.erro() == null || resposta.erro().isBlank()) {
				falharTecnicamente(saga, estado, resposta.tipo() + " respondeu FALHA sem erro", false);
			} else {
				falhar(saga, estado, resposta.erro(), false);
			}
			return;
		}

		log.info("sagaId={} passo={} {} SUCESSO", estado.getSagaId(), estado.getEtapaAtual(), resposta.tipo());
		estado.getPassosExecutados().add(estado.getEtapaAtual());
		avancar(saga, estado, estado.getEtapaAtual() + 1);
	}

	@RabbitListener(queues = { RabbitConfig.CLIENTE_CMD_DLQ, RabbitConfig.GERENTE_CMD_DLQ,
			RabbitConfig.CONTA_CMD_DLQ, RabbitConfig.AUTH_CMD_DLQ })
	public synchronized void falhaTecnica(Message mensagem) {
		Comando cmd = ler(mensagem, Comando.class);
		if (cmd == null || cmd.sagaId() == null) {
			return;
		}

		EstadoSaga estado = estados.ler(cmd.sagaId());
		if (estado != null && cmd.tipo() != null && cmd.tipo().equals(estado.getAguardando())) {
			sinalizarFalha(estado, cmd.tipo() + " foi para a DLQ");
		}
	}

	@Scheduled(fixedDelay = 5000)
	public synchronized void verificarTimeouts() {
		long limite = System.currentTimeMillis() - TIMEOUT_PASSO.toMillis();

		for (EstadoSaga estado : estados.emCurso()) {
			if (estado.getAguardando() != null && estado.getTimestampPasso() <= limite) {
				sinalizarFalha(estado, "timeout de 30 s no passo " + estado.getEtapaAtual()
						+ " (" + estado.getAguardando() + ")");
			}
		}
	}

	private void sinalizarFalha(EstadoSaga estado, String erro) {
		Saga saga = sagas.get(estado.getTipo());

		if (estado.getStatus() == StatusSaga.COMPENSANDO) {
			log.error("sagaId={} passo={} compensação sem resposta: {}", estado.getSagaId(), estado.getEtapaAtual(), erro);
			proximaCompensacao(saga, estado);
			return;
		}

		falharTecnicamente(saga, estado, erro, true);
	}

	private void avancar(Saga saga, EstadoSaga estado, int numero) {
		Passo passo = saga.passo(numero);
		if (passo == null) {
			concluir(saga, estado);
			return;
		}

		DadosSaga dados = dados(estado);
		List<Map<String, Object>> payloads;
		try {
			if (!passo.condicao().test(dados)) {
				log.info("sagaId={} passo={} {} pulado (condicional)", estado.getSagaId(), numero, passo.tipo());
				avancar(saga, estado, numero + 1);
				return;
			}
			payloads = passo.local() ? List.of() : passo.payloads(dados);
		} catch (IllegalStateException e) {
			falharTecnicamente(saga, estado, "passo " + numero + " (" + passo.tipo() + "): " + e.getMessage(), false);
			return;
		}

		estado.setEtapaAtual(numero);

		if (passo.local()) {
			try {
				passo.acaoLocal().accept(dados);
			} catch (RuntimeException e) {
				falharTecnicamente(saga, estado, "passo " + numero + " (" + passo.tipo() + "): " + e.getMessage(), false);
				return;
			}
			log.info("sagaId={} passo={} {} (local)", estado.getSagaId(), numero, passo.tipo());
			avancar(saga, estado, numero + 1);
			return;
		}

		if (passo.fireAndForget()) {
			payloads.forEach(payload -> publicador.publicar(passo.fila(), comando(estado, passo.tipo(), payload)));
			log.info("sagaId={} passo={} {} -> {} x{} (fire-and-forget)", estado.getSagaId(), numero, passo.tipo(),
					passo.fila(), payloads.size());
			avancar(saga, estado, numero + 1);
			return;
		}

		Map<String, Object> payload = payloads.getFirst();
		estado.aguardar(passo.tipo(), System.currentTimeMillis());
		estados.salvar(estado);
		publicador.publicar(passo.fila(), comando(estado, passo.tipo(), payload));
		log.info("sagaId={} passo={} {} -> {}", estado.getSagaId(), numero, passo.tipo(), passo.fila());
	}

	private void falharTecnicamente(Saga saga, EstadoSaga estado, String detalhe, boolean passoIncerto) {
		log.error("sagaId={} passo={} falha técnica: {}", estado.getSagaId(), estado.getEtapaAtual(), detalhe);
		falhar(saga, estado, FALHA_TECNICA, passoIncerto);
	}

	private void falhar(Saga saga, EstadoSaga estado, String erro, boolean passoIncerto) {
		List<Integer> desfazer = new ArrayList<>(estado.getPassosExecutados());
		Collections.reverse(desfazer);

		estado.setCompensacoesPendentes(new ArrayList<>(desfazer.stream()
				.filter(numero -> saga.passo(numero).compensavel())
				.toList()));
		estado.setStatus(StatusSaga.COMPENSANDO);
		estado.setErro(erro);

		log.warn("sagaId={} FALHA no passo {}: {} — compensando {}", estado.getSagaId(), estado.getEtapaAtual(),
				estado.getErro(), estado.getCompensacoesPendentes());

		if (passoIncerto) {
			compensarSemEsperar(estado, saga.passo(estado.getEtapaAtual()));
		}
		proximaCompensacao(saga, estado);
	}

	private void compensarSemEsperar(EstadoSaga estado, Passo passo) {
		if (!passo.compensavel()) {
			return;
		}

		try {
			publicador.publicar(passo.fila(), comando(estado, passo.compensacao(), passo.payloadCompensacao().apply(dados(estado))));
			log.info("sagaId={} passo={} {} -> {} (sem esperar resposta)", estado.getSagaId(), passo.numero(),
					passo.compensacao(), passo.fila());
		} catch (IllegalStateException e) {
			log.error("sagaId={} passo={} compensação não montada: {}", estado.getSagaId(), passo.numero(), e.getMessage());
		}
	}

	private void proximaCompensacao(Saga saga, EstadoSaga estado) {
		if (estado.getCompensacoesPendentes().isEmpty()) {
			encerrarComFalha(saga, estado);
			return;
		}

		Passo passo = saga.passo(estado.getCompensacoesPendentes().removeFirst());
		estado.setEtapaAtual(passo.numero());

		Map<String, Object> payload;
		try {
			payload = passo.payloadCompensacao().apply(dados(estado));
		} catch (IllegalStateException e) {
			log.error("sagaId={} passo={} compensação não montada: {}", estado.getSagaId(), passo.numero(), e.getMessage());
			proximaCompensacao(saga, estado);
			return;
		}

		estado.aguardar(passo.compensacao(), System.currentTimeMillis());
		estados.salvar(estado);
		publicador.publicar(passo.fila(), comando(estado, passo.compensacao(), payload));
		log.info("sagaId={} passo={} {} -> {}", estado.getSagaId(), passo.numero(), passo.compensacao(), passo.fila());
	}

	private void concluir(Saga saga, EstadoSaga estado) {
		DadosSaga dados = dados(estado);
		estado.encerrar(StatusSaga.CONCLUIDA);
		estados.salvar(estado);
		senhas.descartar(estado.getSagaId());

		saga.resultadoInline(dados).ifPresentOrElse(
				resultado -> jobs.concluirInline(estado.getSagaId(), resultado),
				() -> jobs.concluir(estado.getSagaId(), saga.dominio(), saga.recurso(dados)));
		cache.invalidar(saga.cacheInvalidado(dados));
		log.info("sagaId={} tipo={} CONCLUIDA", estado.getSagaId(), estado.getTipo());
	}

	private void encerrarComFalha(Saga saga, EstadoSaga estado) {
		DadosSaga dados = dados(estado);
		estado.encerrar(StatusSaga.COMPENSADA);
		estados.salvar(estado);
		senhas.descartar(estado.getSagaId());

		saga.emailDeFalha().ifPresent(email -> {
			try {
				publicador.publicar(email.fila(), comando(estado, email.tipo(), email.payload().apply(dados)));
				log.info("sagaId={} {} -> {}", estado.getSagaId(), email.tipo(), email.fila());
			} catch (IllegalStateException e) {
				log.info("sagaId={} {} não enviado: {}", estado.getSagaId(), email.tipo(), e.getMessage());
			}
		});

		jobs.falhar(estado.getSagaId(), estado.getErro());
		cache.invalidar(saga.cacheInvalidado(dados));
		log.warn("sagaId={} tipo={} COMPENSADA: {}", estado.getSagaId(), estado.getTipo(), estado.getErro());
	}

	private void absorver(EstadoSaga estado, Map<String, Object> payload) {
		if (payload == null) {
			return;
		}

		Map<String, Object> copia = new HashMap<>(payload);
		Object senha = copia.remove(SENHA);
		if (senha != null) {
			senhas.guardar(estado.getSagaId(), senha.toString());
		}
		estado.getPayload().putAll(copia);
	}

	private DadosSaga dados(EstadoSaga estado) {
		return new DadosSaga(estado.getPayload(), senhas.consultar(estado.getSagaId()));
	}

	private Comando comando(EstadoSaga estado, String tipo, Map<String, Object> payload) {
		return new Comando(estado.getSagaId(), tipo, agora(), payload);
	}

	private <T> T ler(Message mensagem, Class<T> tipo) {
		try {
			return json.readValue(mensagem.getBody(), tipo);
		} catch (JacksonException e) {
			log.warn("mensagem malformada descartada: {}", e.getOriginalMessage());
			return null;
		}
	}

	private static String agora() {
		return LocalDateTime.now().format(ISO);
	}

}
