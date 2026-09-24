package br.ufpr.dac.grupo2.conta.command.service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.command.repository.EventoRepository;
import br.ufpr.dac.grupo2.conta.messaging.dto.ComandoSaga;
import br.ufpr.dac.grupo2.conta.messaging.dto.EventoPublicado;
import br.ufpr.dac.grupo2.conta.messaging.dto.ResultadoSaga;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class SagaContaTransacional {

    private static final ZoneId FUSO_HORARIO = ZoneId.of("America/Sao_Paulo");

    @PersistenceContext(unitName = "command")
    private EntityManager entityManager;

    private final EventoRepository eventos;
    private final NumeroConta numeros;
    private final ObjectMapper objectMapper;

    public SagaContaTransacional(EventoRepository eventos,
            NumeroConta numeros, ObjectMapper objectMapper) {
        this.eventos = eventos;
        this.numeros = numeros;
        this.objectMapper = objectMapper;
    }

    @Transactional(transactionManager = "commandTransactionManager")
    public ResultadoSaga executar(ComandoSaga cmd, String gerenteEscolhido) {
        bloquearEventStore();

        ResultadoSaga anterior = resultado(cmd.sagaId(), cmd.tipo());
        if (anterior != null) {
            return anterior;
        }

        ResultadoSaga novo;
        try {
            novo = switch (cmd.tipo()) {
                case "gerente-com-menos-clientes" -> sucesso(cmd,
                        Map.of("cpfGerente", gerenteObrigatorio(gerenteEscolhido)), null);
                case "criar-conta" -> criar(cmd);
                case "compensar-criar-conta" -> compensar(cmd);
                default -> throw new IllegalArgumentException(
                        "Tipo de comando não suportado: " + cmd.tipo());
            };
        } catch (IllegalArgumentException e) {
            novo = falha(cmd, e.getMessage());
        }

        persistirResultado(cmd, novo);
        return novo;
    }

    @Transactional(transactionManager = "commandTransactionManager")
    public ResultadoSaga registrarFalha(ComandoSaga cmd, String mensagem) {
        bloquearEventStore();

        ResultadoSaga anterior = resultado(cmd.sagaId(), cmd.tipo());
        if (anterior != null) {
            return anterior;
        }

        ResultadoSaga novo = falha(cmd, mensagem);
        persistirResultado(cmd, novo);
        return novo;
    }

    private ResultadoSaga criar(ComandoSaga cmd) {
        if (resultado(cmd.sagaId(), "compensar-criar-conta") != null) {
            throw new IllegalArgumentException("SAGA já compensada");
        }

        String cliente = cpf(cmd.payload(), "cpfCliente");
        String gerente = cpf(cmd.payload(), "cpfGerente");
        Number existentes = (Number) entityManager.createNativeQuery("""
                SELECT count(*) FROM conta_command.eventos c
                WHERE c.tipo = 'Criado' AND c.payload->>'cpfCliente' = :cpf
                AND NOT EXISTS (
                    SELECT 1 FROM conta_command.eventos x
                    WHERE x.objeto_id = c.objeto_id
                    AND x.tipo = 'CriacaoCompensada'
                )
                """)
                .setParameter("cpf", cliente)
                .getSingleResult();

        if (existentes.longValue() > 0) {
            throw new IllegalArgumentException("Cliente já possui conta ativa");
        }

        String numero = numeros.livre(candidato -> !eventos
                .findByObjetoIdOrderByVersaoAsc(candidato)
                .isEmpty());
        LocalDateTime instante = agora();
        Evento criado = eventos.saveAndFlush(new Evento(
                numero,
                "Criado",
                Map.of(
                        "cpfCliente", cliente,
                        "cpfGerente", gerente,
                        "saldoInicial", "0.00",
                        "dataCriacao", instante.toLocalDate().toString(),
                        "sagaId", cmd.sagaId()),
                1,
                instante));

        return sucesso(cmd, Map.of(
                "numeroConta", numero,
                "cpfCliente", cliente,
                "cpfGerente", gerente), criado);
    }

    private ResultadoSaga compensar(ComandoSaga cmd) {
        ResultadoSaga criacao = resultado(cmd.sagaId(), "criar-conta");
        if (criacao == null || criacao.evento() == null) {
            return sucesso(cmd, Map.of("removida", false), null);
        }

        String numero = criacao.evento().objetoId();
        Object informado = cmd.payload().get("numeroConta");
        if (informado != null && !numero.equals(informado)) {
            throw new IllegalArgumentException("Número não pertence à SAGA");
        }

        List<Evento> historia = eventos.findByObjetoIdOrderByVersaoAsc(numero);
        if (historia.size() != 1 || !"Criado".equals(historia.getFirst().getTipo())) {
            throw new IllegalArgumentException(
                    "Conta já operada; compensação exige intervenção");
        }

        Evento cancelado = eventos.saveAndFlush(new Evento(
                numero,
                "CriacaoCompensada",
                Map.of("sagaId", cmd.sagaId()),
                2,
                agora()));
        return sucesso(cmd, Map.of(
                "numeroConta", numero,
                "removida", true), cancelado);
    }

    private void bloquearEventStore() {
        // Serializa a escolha de número, a criação e a deduplicação do comando.
        entityManager.createNativeQuery(
                "LOCK TABLE conta_command.eventos IN SHARE ROW EXCLUSIVE MODE")
                .executeUpdate();
    }

    private void persistirResultado(ComandoSaga cmd, ResultadoSaga resultado) {
        entityManager.createNativeQuery("""
                INSERT INTO conta_command.comandos_processados
                    (saga_id, tipo, resultado)
                VALUES (:sagaId, :tipo, :resultado)
                """)
                .setParameter("sagaId", cmd.sagaId())
                .setParameter("tipo", cmd.tipo())
                .setParameter("resultado", objectMapper.writeValueAsString(resultado))
                .executeUpdate();
    }

    private ResultadoSaga resultado(String sagaId, String tipo) {
        List<?> valores = entityManager.createNativeQuery("""
                SELECT resultado
                FROM conta_command.comandos_processados
                WHERE saga_id = :sagaId AND tipo = :tipo
                """)
                .setParameter("sagaId", sagaId)
                .setParameter("tipo", tipo)
                .getResultList();

        if (valores.isEmpty()) {
            return null;
        }
        if (valores.getFirst() == null) {
            throw new IllegalStateException("Comando legado sem resposta persistida");
        }
        return objectMapper.readValue(valores.getFirst().toString(), ResultadoSaga.class);
    }

    private ResultadoSaga sucesso(ComandoSaga cmd, Map<String, Object> payload,
            Evento evento) {
        return new ResultadoSaga(new ResultadoSaga.Resposta(
                cmd.sagaId(),
                cmd.tipo(),
                agora().toString(),
                payload,
                "SUCESSO",
                null),
                evento == null ? null : EventoPublicado.de(evento));
    }

    private ResultadoSaga falha(ComandoSaga cmd, String mensagem) {
        String detalhe = mensagem == null || mensagem.isBlank()
                ? "Falha ao processar comando"
                : mensagem;
        return new ResultadoSaga(new ResultadoSaga.Resposta(
                cmd.sagaId(),
                cmd.tipo(),
                agora().toString(),
                Map.of(),
                "FALHA",
                detalhe), null);
    }

    private String cpf(Map<String, Object> payload, String campo) {
        Object valor = payload.get(campo);
        if (!(valor instanceof String cpf) || !cpf.matches("[0-9]{11}")) {
            throw new IllegalArgumentException("CPF inválido: " + campo);
        }
        return cpf;
    }

    private String gerenteObrigatorio(String cpf) {
        if (cpf == null) {
            throw new IllegalArgumentException("Nenhum gerente foi selecionado");
        }
        return cpf;
    }

    private LocalDateTime agora() {
        return LocalDateTime.now(FUSO_HORARIO);
    }
}
