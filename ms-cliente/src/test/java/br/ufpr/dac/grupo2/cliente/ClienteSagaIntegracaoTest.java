package br.ufpr.dac.grupo2.cliente;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.jdbc.Sql;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import br.ufpr.dac.grupo2.cliente.dto.MensagemSaga;
import br.ufpr.dac.grupo2.cliente.messaging.dto.ResultadoSaga.Resposta;
import br.ufpr.dac.grupo2.cliente.messaging.listener.ClienteSagaListener;
import br.ufpr.dac.grupo2.cliente.messaging.service.SagaMessagePublisher;
import br.ufpr.dac.grupo2.cliente.model.Cliente;
import br.ufpr.dac.grupo2.cliente.model.ComandoProcessadoId;
import br.ufpr.dac.grupo2.cliente.model.Solicitacao;
import br.ufpr.dac.grupo2.cliente.repository.ClienteRepository;
import br.ufpr.dac.grupo2.cliente.repository.ComandosProcessadosRepository;
import br.ufpr.dac.grupo2.cliente.repository.SolicitacaoRepository;
import br.ufpr.dac.grupo2.cliente.service.ClienteService;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = "spring.rabbitmq.listener.simple.auto-startup=false")
@Testcontainers
@Sql(scripts = {"/db/01-schemas.sql", "/db/02-ddl-cliente.sql"})
class ClienteSagaIntegracaoTest {

    private static final String CPF = "11122233396";
    private static final String NOME = "Fulano de Tal";
    private static final String EMAIL = "fulano@exemplo.com.br";
    private static final String CATHARYNA = "12912861012";

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void configurar(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @MockitoBean SagaMessagePublisher publisher;

    @Autowired ClienteSagaListener listener;
    @Autowired ClienteService service;
    @Autowired SolicitacaoRepository solicitacoes;
    @Autowired ClienteRepository clientes;
    @Autowired ComandosProcessadosRepository processados;
    @Autowired ObjectMapper json;

    @BeforeEach
    void preparar() {
        service.seed();
        solicitar(CPF, EMAIL);
    }

    @Test
    void aprovarMarcaAprovadaEDevolveNomeEEmailRepetindoOTipo() {
        Resposta r = enviar("saga-1", "aprovar-solicitacao", Map.of("cpf", CPF));

        assertEquals("SUCESSO", r.status());
        assertEquals("aprovar-solicitacao", r.tipo());
        assertEquals("saga-1", r.sagaId());
        assertEquals(Map.of("nome", NOME, "email", EMAIL), r.payload());

        Solicitacao s = solicitacoes.findById(CPF).orElseThrow();
        assertEquals("APROVADA", s.getStatus());
        assertNotNull(s.getDataHoraProcessamento());
    }

    @Test
    void aprovarReentregueRespondeSucessoDeNovoSemReprocessar() {
        enviar("saga-1", "aprovar-solicitacao", Map.of("cpf", CPF));
        LocalDateTime primeira = solicitacoes.findById(CPF).orElseThrow().getDataHoraProcessamento();

        Resposta r = enviar("saga-1", "aprovar-solicitacao", Map.of("cpf", CPF));

        assertEquals("SUCESSO", r.status());
        assertEquals(Map.of("nome", NOME, "email", EMAIL), r.payload());
        assertEquals(primeira, solicitacoes.findById(CPF).orElseThrow().getDataHoraProcessamento());
        assertEquals(1, processados.count());
    }

    @Test
    void aprovarSolicitacaoJaProcessadaFalhaComFraseParaOGerente() {
        enviar("saga-1", "aprovar-solicitacao", Map.of("cpf", CPF));

        Resposta r = enviar("saga-2", "aprovar-solicitacao", Map.of("cpf", CPF));

        assertEquals("FALHA", r.status());
        assertEquals("aprovar-solicitacao", r.tipo());
        assertEquals("Esta solicitação já foi processada", r.erro());
        assertFalse(processados.existsById(new ComandoProcessadoId("saga-2", "aprovar-solicitacao")));
    }

    @Test
    void aprovarSolicitacaoInexistenteFalha() {
        Resposta r = enviar("saga-1", "aprovar-solicitacao", Map.of("cpf", "00000000000"));

        assertEquals("FALHA", r.status());
        assertEquals("Solicitação não encontrada", r.erro());
    }

    @Test
    void compensarAprovacaoDevolveParaPendente() {
        enviar("saga-1", "aprovar-solicitacao", Map.of("cpf", CPF));

        Resposta r = enviar("saga-1", "compensar-aprovar-solicitacao", Map.of("cpf", CPF));

        assertEquals("SUCESSO", r.status());
        assertEquals("compensar-aprovar-solicitacao", r.tipo());
        Solicitacao s = solicitacoes.findById(CPF).orElseThrow();
        assertEquals("PENDENTE", s.getStatus());
        assertNull(s.getMotivo());
        assertNull(s.getDataHoraProcessamento());
    }

    @Test
    void compensarAprovacaoComMotivoRecusaMarcaNaoAprovada() {
        enviar("saga-1", "aprovar-solicitacao", Map.of("cpf", CPF));

        Resposta r = enviar("saga-1", "compensar-aprovar-solicitacao",
                Map.of("cpf", CPF, "motivoRecusa", "E-mail já cadastrado"));

        assertEquals("SUCESSO", r.status());
        Solicitacao s = solicitacoes.findById(CPF).orElseThrow();
        assertEquals("NAO_APROVADA", s.getStatus());
        assertEquals("E-mail já cadastrado", s.getMotivo());
        assertNotNull(s.getDataHoraProcessamento());
    }

    @Test
    void compensacaoReentregueNaoDesfazDuasVezes() {
        enviar("saga-1", "aprovar-solicitacao", Map.of("cpf", CPF));
        enviar("saga-1", "compensar-aprovar-solicitacao", Map.of("cpf", CPF));
        enviar("saga-2", "aprovar-solicitacao", Map.of("cpf", CPF));

        Resposta r = enviar("saga-1", "compensar-aprovar-solicitacao", Map.of("cpf", CPF));

        assertEquals("SUCESSO", r.status());
        assertEquals("APROVADA", solicitacoes.findById(CPF).orElseThrow().getStatus());
    }

    @Test
    void compensarAprovacaoDeOutraSagaNaoMexeNaSolicitacao() {
        enviar("saga-1", "aprovar-solicitacao", Map.of("cpf", CPF));

        Resposta r = enviar("saga-2", "compensar-aprovar-solicitacao", Map.of("cpf", CPF));

        assertEquals("SUCESSO", r.status());
        assertEquals("APROVADA", solicitacoes.findById(CPF).orElseThrow().getStatus());
    }

    @Test
    void criarClienteCopiaASolicitacaoUmaVezSo() {
        enviar("saga-1", "aprovar-solicitacao", Map.of("cpf", CPF));

        Resposta primeira = enviar("saga-1", "criar-cliente", Map.of("cpf", CPF));
        Resposta segunda = enviar("saga-1", "criar-cliente", Map.of("cpf", CPF));

        assertEquals("SUCESSO", primeira.status());
        assertEquals("criar-cliente", primeira.tipo());
        assertEquals(Map.of(), primeira.payload());
        assertEquals("SUCESSO", segunda.status());
        assertEquals(6, clientes.count());

        Cliente c = clientes.findById(CPF).orElseThrow();
        assertEquals(NOME, c.getNome());
        assertEquals(EMAIL, c.getEmail());
        assertEquals(0, new BigDecimal("4500.00").compareTo(c.getSalario()));
        assertEquals("Curitiba", c.getCidade());
        assertEquals("PR", c.getUf());
    }

    @Test
    void criarClienteComEmailDeClienteExistenteFalhaComMotivoRecusa() {
        solicitacoes.deleteAll();
        solicitar(CPF, "cli1@bantads.com.br");

        Resposta r = enviar("saga-1", "criar-cliente", Map.of("cpf", CPF));

        assertEquals("FALHA", r.status());
        assertEquals("criar-cliente", r.tipo());
        assertEquals("E-mail já cadastrado", r.erro());
        assertEquals(Map.of("motivoRecusa", "E-mail já cadastrado"), r.payload());
        assertEquals(5, clientes.count());
    }

    @Test
    void emailDeClienteExistenteEncerraASolicitacaoComoNaoAprovada() {
        solicitacoes.deleteAll();
        solicitar(CPF, "cli1@bantads.com.br");
        enviar("saga-1", "aprovar-solicitacao", Map.of("cpf", CPF));
        Resposta falha = enviar("saga-1", "criar-cliente", Map.of("cpf", CPF));

        Map<String, Object> compensacao = new HashMap<>(falha.payload());
        compensacao.put("cpf", CPF);
        enviar("saga-1", "compensar-aprovar-solicitacao", compensacao);

        Solicitacao s = solicitacoes.findById(CPF).orElseThrow();
        assertEquals("NAO_APROVADA", s.getStatus());
        assertEquals("E-mail já cadastrado", s.getMotivo());
    }

    @Test
    void criarClienteComCpfJaCadastradoFalhaSemMotivoRecusa() {
        solicitacoes.deleteAll();
        solicitar(CATHARYNA, EMAIL);

        Resposta r = enviar("saga-1", "criar-cliente", Map.of("cpf", CATHARYNA));

        assertEquals("FALHA", r.status());
        assertEquals("CPF já cadastrado", r.erro());
        assertNull(r.payload());
    }

    @Test
    void compensarCriacaoRemoveOCliente() {
        enviar("saga-1", "aprovar-solicitacao", Map.of("cpf", CPF));
        enviar("saga-1", "criar-cliente", Map.of("cpf", CPF));

        Resposta r = enviar("saga-1", "compensar-criar-cliente", Map.of("cpf", CPF));
        Resposta reentrega = enviar("saga-1", "compensar-criar-cliente", Map.of("cpf", CPF));

        assertEquals("SUCESSO", r.status());
        assertEquals("compensar-criar-cliente", r.tipo());
        assertEquals("SUCESSO", reentrega.status());
        assertFalse(clientes.existsById(CPF));
    }

    @Test
    void compensarCriacaoDeOutraSagaNaoRemoveCliente() {
        Resposta r = enviar("saga-1", "compensar-criar-cliente", Map.of("cpf", CATHARYNA));

        assertEquals("SUCESSO", r.status());
        assertTrue(clientes.existsById(CATHARYNA));
    }

    @Test
    void umRegistroPorSagaETipoMesmoComReentrega() {
        for (int i = 0; i < 2; i++) {
            enviar("saga-1", "aprovar-solicitacao", Map.of("cpf", CPF));
            enviar("saga-1", "criar-cliente", Map.of("cpf", CPF));
            enviar("saga-1", "compensar-criar-cliente", Map.of("cpf", CPF));
            enviar("saga-1", "compensar-aprovar-solicitacao", Map.of("cpf", CPF));
        }

        assertEquals(4, processados.count());
    }

    @Test
    void payloadSemCpfFalhaSemExcecao() {
        Resposta r = enviar("saga-1", "aprovar-solicitacao", Map.of());

        assertEquals("FALHA", r.status());
        assertEquals("aprovar-solicitacao", r.tipo());
        assertEquals("Payload deve conter um CPF válido no campo 'cpf'", r.erro());
    }

    private Resposta enviar(String sagaId, String tipo, Map<String, Object> payload) {
        MensagemSaga cmd = new MensagemSaga(sagaId, tipo, LocalDateTime.now().toString(), payload);
        listener.receber(MessageBuilder.withBody(json.writeValueAsBytes(cmd)).build());

        ArgumentCaptor<Object> resposta = ArgumentCaptor.forClass(Object.class);
        verify(publisher, atLeastOnce()).publicar(eq(SagaMessagePublisher.FILA_RESPOSTAS), resposta.capture());
        return (Resposta) resposta.getValue();
    }

    private void solicitar(String cpf, String email) {
        solicitacoes.save(new Solicitacao(cpf, NOME, email, "41999990000", new BigDecimal("4500.00"),
                "Rua de Teste", "10", null, "80000000", "Curitiba", "PR", "PENDENTE", null, null));
    }
}
