package br.ufpr.dac.grupo2.conta.command.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import br.ufpr.dac.grupo2.conta.command.model.EstadoConta;
import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.command.repository.EventoRepository;
import br.ufpr.dac.grupo2.conta.messaging.dto.ComandoSaga;
import br.ufpr.dac.grupo2.conta.messaging.dto.ContaParaTransferir;
import br.ufpr.dac.grupo2.conta.messaging.dto.EventoPublicado;
import br.ufpr.dac.grupo2.conta.messaging.dto.ResultadoSaga;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class SagaContaTransacional {

    @PersistenceContext(unitName = "command")
    private EntityManager entityManager;

    private final EventoRepository eventos;
    private final NumeroConta numeros;
    private final ContaLeituraService leitura;
    private final ObjectMapper objectMapper;

    public SagaContaTransacional(EventoRepository eventos,
            NumeroConta numeros, ContaLeituraService leitura,
            ObjectMapper objectMapper) {
        this.eventos = eventos;
        this.numeros = numeros;
        this.leitura = leitura;
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
                case "atribuir-conta" -> atribuirConta(cmd);
                case "criar-conta" -> criar(cmd);
                case "compensar-criar-conta" -> compensar(cmd);
                case "compensar-atribuir-conta" -> compensarAtribuicao(cmd);
                case "compensar-transferir-contas" ->
                        compensarTransferenciaEmLote(cmd);
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
    public ResultadoSaga transferirContasDoGerente(ComandoSaga cmd,
            String gerenteRemovido, String gerenteDestino) {
        bloquearEventStore();

        ResultadoSaga anterior = resultado(cmd.sagaId(), cmd.tipo());
        if (anterior != null) {
            return anterior;
        }
        if (resultado(cmd.sagaId(), "compensar-transferir-contas") != null) {
            ResultadoSaga falha = falha(cmd, "SAGA já compensada");
            persistirResultado(cmd, falha);
            return falha;
        }

        List<Object[]> contas = contasAtuaisDoGerente(gerenteRemovido);
        List<EventoPublicado> publicados = new ArrayList<>();
        List<Map<String, Object>> respostaContas = new ArrayList<>();
        LocalDateTime instante = agora();

        for (Object[] conta : contas) {
            String numero = conta[0].toString();
            String cpfCliente = conta[1].toString();
            int versao = ((Number) conta[2]).intValue() + 1;
            Evento evento = eventos.saveAndFlush(new Evento(
                    numero,
                    "GerenteAlterado",
                    Map.of(
                            "cpfGerenteAnterior", gerenteRemovido,
                            "cpfGerente", gerenteDestino,
                            "sagaId", cmd.sagaId()),
                    versao,
                    instante));
            publicados.add(EventoPublicado.de(evento));
            respostaContas.add(Map.of(
                    "numero", numero,
                    "cpfCliente", cpfCliente));
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("cpfGerenteDestino", gerenteDestino);
        payload.put("contas", respostaContas);
        ResultadoSaga novo = sucessoLote(cmd, payload, publicados);
        persistirResultado(cmd, novo);
        return novo;
    }

    private ResultadoSaga compensarTransferenciaEmLote(ComandoSaga cmd) {
        String gerenteRemovido = cpf(cmd.payload(), "cpfGerente");
        ResultadoSaga transferencia = resultado(
                cmd.sagaId(), "transferir-contas-do-gerente");
        if (transferencia == null || transferencia.eventos().isEmpty()) {
            return sucessoLote(cmd, Map.of("contas", List.of()), List.of());
        }

        List<ContaACompensar> validadas = new ArrayList<>();
        for (EventoPublicado transferido : transferencia.eventos()) {
            String original = texto(transferido.payload(), "cpfGerenteAnterior");
            if (!gerenteRemovido.equals(original)) {
                throw new IllegalArgumentException(
                        "Gerente original não corresponde à transferência da SAGA");
            }
            EstadoConta estado = leitura.replay(transferido.objetoId());
            String destino = texto(transferido.payload(), "cpfGerente");
            if (!destino.equals(estado.getCpfGerente())) {
                throw new IllegalArgumentException(
                        "Conta não pertence mais ao gerente definido pela SAGA");
            }
            validadas.add(new ContaACompensar(transferido, estado,
                    original, destino));
        }

        List<EventoPublicado> reversoes = new ArrayList<>();
        List<Map<String, Object>> contas = new ArrayList<>();
        LocalDateTime instante = agora();
        for (ContaACompensar validada : validadas) {
            EventoPublicado transferido = validada.evento();
            Evento reversao = eventos.saveAndFlush(new Evento(
                    transferido.objetoId(),
                    "GerenteAlterado",
                    Map.of(
                            "cpfGerenteAnterior", validada.destino(),
                            "cpfGerente", validada.original(),
                            "sagaId", cmd.sagaId()),
                    validada.estado().getVersao() + 1,
                    instante));
            reversoes.add(EventoPublicado.de(reversao));
            Object cpfCliente = transferencia.resposta().payload()
                    .getOrDefault("contas", List.of()) instanceof List<?> lista
                    ? lista.stream().filter(Map.class::isInstance)
                            .map(Map.class::cast)
                            .filter(item -> transferido.objetoId().equals(item.get("numero")))
                            .map(item -> item.get("cpfCliente"))
                            .findFirst().orElse(null)
                    : null;
            Map<String, Object> conta = new LinkedHashMap<>();
            conta.put("numero", transferido.objetoId());
            if (cpfCliente != null) conta.put("cpfCliente", cpfCliente);
            contas.add(conta);
        }
        return sucessoLote(cmd, Map.of("contas", contas), reversoes);
    }

    private record ContaACompensar(EventoPublicado evento,
            EstadoConta estado, String original, String destino) {}

    @SuppressWarnings("unchecked")
    private List<Object[]> contasAtuaisDoGerente(String cpfGerente) {
        return entityManager.createNativeQuery("""
                WITH atuais AS (
                    SELECT DISTINCT ON (objeto_id)
                        objeto_id, payload, versao
                    FROM conta_command.eventos
                    WHERE tipo IN ('Criado', 'GerenteAlterado')
                    ORDER BY objeto_id, versao DESC
                ), criadas AS (
                    SELECT objeto_id, payload->>'cpfCliente' AS cpf_cliente
                    FROM conta_command.eventos
                    WHERE tipo = 'Criado'
                ), versoes AS (
                    SELECT objeto_id, MAX(versao) AS versao
                    FROM conta_command.eventos
                    GROUP BY objeto_id
                )
                SELECT a.objeto_id, c.cpf_cliente, v.versao
                FROM atuais a
                JOIN criadas c ON c.objeto_id = a.objeto_id
                JOIN versoes v ON v.objeto_id = a.objeto_id
                WHERE a.payload->>'cpfGerente' = :cpfGerente
                  AND NOT EXISTS (
                      SELECT 1 FROM conta_command.eventos x
                      WHERE x.objeto_id = a.objeto_id
                        AND x.tipo = 'CriacaoCompensada'
                  )
                ORDER BY a.objeto_id
                """)
                .setParameter("cpfGerente", cpfGerente)
                .getResultList();
    }

    @Transactional(transactionManager = "commandTransactionManager")
    public ResultadoSaga registrarSelecaoTransferencia(
            ComandoSaga cmd,
            Optional<ContaParaTransferir> selecionada) {
        bloquearEventStore();

        ResultadoSaga anterior = resultado(cmd.sagaId(), cmd.tipo());
        if (anterior != null) {
            return anterior;
        }

        ResultadoSaga novo = selecionada
                .map(conta -> sucesso(cmd, Map.of(
                        "transferir", true,
                        "numeroConta", conta.numeroConta(),
                        "cpfCliente", conta.cpfCliente(),
                        "cpfGerenteAnterior",
                        conta.cpfGerenteAnterior()), null))
                .orElseGet(() -> sucesso(cmd,
                        Map.of("transferir", false), null));

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

    private ResultadoSaga atribuirConta(ComandoSaga cmd) {
        String numero = numeroConta(cmd.payload());
        String novoGerente = cpf(cmd.payload(), "cpfGerente");
        EstadoConta estado = leitura.replay(numero);
        ResultadoSaga selecao = resultado(cmd.sagaId(), "conta-a-transferir");
        if (selecao != null && !estado.getCpfGerente().equals(
                selecao.resposta().payload().get("cpfGerenteAnterior"))) {
            throw new IllegalArgumentException(
                    "A conta escolhida mudou de gerente durante a inserção. Tente novamente.");
        }

        Evento evento = eventos.saveAndFlush(new Evento(
                numero,
                "GerenteAlterado",
                Map.of(
                        "cpfGerenteAnterior", estado.getCpfGerente(),
                        "cpfGerente", novoGerente,
                        "sagaId", cmd.sagaId()),
                estado.getVersao() + 1,
                agora()));

        return sucesso(cmd, Map.of(
                "numeroConta", numero,
                "cpfGerenteAnterior", estado.getCpfGerente(),
                "cpfGerente", novoGerente), evento);
    }

    private ResultadoSaga compensarAtribuicao(ComandoSaga cmd) {
        String numero = numeroConta(cmd.payload());
        String gerenteAnterior = cpf(cmd.payload(), "cpfGerente");
        ResultadoSaga atribuicao = resultado(cmd.sagaId(), "atribuir-conta");

        if (atribuicao == null || atribuicao.evento() == null) {
            return sucesso(cmd, Map.of(
                    "numeroConta", numero,
                    "revertida", false), null);
        }
        if (!numero.equals(atribuicao.evento().objetoId())) {
            throw new IllegalArgumentException(
                    "Atribuição da SAGA não encontrada para a conta");
        }

        String gerenteNovo = texto(
                atribuicao.evento().payload(), "cpfGerente");
        String gerenteOriginal = texto(
                atribuicao.evento().payload(), "cpfGerenteAnterior");
        if (!gerenteAnterior.equals(gerenteOriginal)) {
            throw new IllegalArgumentException(
                    "Gerente anterior não corresponde à atribuição da SAGA");
        }

        EstadoConta estado = leitura.replay(numero);
        if (!estado.getCpfGerente().equals(gerenteNovo)) {
            throw new IllegalArgumentException(
                    "Conta não pertence mais ao gerente atribuído pela SAGA");
        }

        Evento reversao = eventos.saveAndFlush(new Evento(
                numero,
                "GerenteAlterado",
                Map.of(
                        "cpfGerenteAnterior", gerenteNovo,
                        "cpfGerente", gerenteAnterior,
                        "sagaId", cmd.sagaId()),
                estado.getVersao() + 1,
                agora()));

        return sucesso(cmd, Map.of(
                "numeroConta", numero,
                "cpfGerente", gerenteAnterior), reversao);
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

    private ResultadoSaga sucessoLote(ComandoSaga cmd,
            Map<String, Object> payload, List<EventoPublicado> eventos) {
        return ResultadoSaga.lote(new ResultadoSaga.Resposta(
                cmd.sagaId(), cmd.tipo(), agora().toString(), payload,
                "SUCESSO", null), eventos);
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

    private String numeroConta(Map<String, Object> payload) {
        String numero = texto(payload, "numeroConta");
        if (!numero.matches("[0-9]{4}")) {
            throw new IllegalArgumentException("Número de conta inválido");
        }
        return numero;
    }

    private String texto(Map<String, Object> payload, String campo) {
        Object valor = payload.get(campo);
        if (!(valor instanceof String texto) || texto.isBlank()) {
            throw new IllegalArgumentException(
                    "Campo obrigatório inválido: " + campo);
        }
        return texto;
    }

    private String gerenteObrigatorio(String cpf) {
        if (cpf == null) {
            throw new IllegalArgumentException("Nenhum gerente foi selecionado");
        }
        return cpf;
    }

    private LocalDateTime agora() {
        return LocalDateTime.now();
    }
}
