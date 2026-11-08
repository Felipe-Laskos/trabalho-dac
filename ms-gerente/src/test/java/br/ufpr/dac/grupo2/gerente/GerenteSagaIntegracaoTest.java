package br.ufpr.dac.grupo2.gerente;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

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

import br.ufpr.dac.grupo2.gerente.dto.MensagemSaga;
import br.ufpr.dac.grupo2.gerente.messaging.dto.ResultadoSaga.Resposta;
import br.ufpr.dac.grupo2.gerente.messaging.listener.GerenteSagaListener;
import br.ufpr.dac.grupo2.gerente.messaging.service.SagaMessagePublisher;
import br.ufpr.dac.grupo2.gerente.model.ComandoProcessadoId;
import br.ufpr.dac.grupo2.gerente.model.Gerente;
import br.ufpr.dac.grupo2.gerente.repository.ComandosProcessadosRepository;
import br.ufpr.dac.grupo2.gerente.repository.GerenteRepository;
import br.ufpr.dac.grupo2.gerente.service.GerenteService;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = "spring.rabbitmq.listener.simple.auto-startup=false")
@Testcontainers
@Sql(scripts = {"/db/01-schemas.sql", "/db/03-ddl-gerente.sql"})
class GerenteSagaIntegracaoTest {

    private static final String GENIEVE = "98574307084";
    private static final String GODOPHREDO = "64065268052";
    private static final String GYANDULA = "23862179060";
    private static final String GADAMANTIO = "40501740066";
    private static final String NOVO = "55500000010";
    private static final String EMAIL_NOVO = "novo@bantads.com.br";

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void configurar(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @MockitoBean SagaMessagePublisher publisher;

    @Autowired GerenteSagaListener listener;
    @Autowired GerenteService service;
    @Autowired GerenteRepository gerentes;
    @Autowired ComandosProcessadosRepository processados;
    @Autowired ObjectMapper json;

    @BeforeEach
    void preparar() {
        service.seed();
    }

    @Test
    void inserirCriaGerenteAtivoEGravaAChave() {
        Resposta r = enviar("saga-1", "inserir-gerente", novoGerente(NOVO, EMAIL_NOVO));

        assertEquals("SUCESSO", r.status());
        assertEquals("inserir-gerente", r.tipo());
        assertEquals(Map.of("cpf", NOVO), r.payload());
        assertTrue(gerentes.findById(NOVO).orElseThrow().getAtivo());
        assertTrue(processados.existsById(new ComandoProcessadoId("saga-1", "inserir-gerente")));
    }

    @Test
    void inserirReentregueRespondeSucessoDeNovoSemDuplicar() {
        enviar("saga-1", "inserir-gerente", novoGerente(NOVO, EMAIL_NOVO));

        Resposta r = enviar("saga-1", "inserir-gerente", novoGerente(NOVO, EMAIL_NOVO));

        verify(publisher, times(2)).publicar(eq(SagaMessagePublisher.FILA_RESPOSTAS), any());
        assertEquals("SUCESSO", r.status());
        assertEquals(5, gerentes.count());
        assertEquals(1, processados.count());
    }

    @Test
    void inserirCpfJaCadastradoFalhaSemGravarChave() {
        Resposta r = enviar("saga-1", "inserir-gerente", novoGerente(GADAMANTIO, EMAIL_NOVO));

        assertEquals("FALHA", r.status());
        assertEquals("CPF já cadastrado", r.erro());
        assertFalse(processados.existsById(new ComandoProcessadoId("saga-1", "inserir-gerente")));
    }

    @Test
    void compensarInserirApagaOGerenteDestaSagaEGravaAPropriaChave() {
        enviar("saga-1", "inserir-gerente", novoGerente(NOVO, EMAIL_NOVO));

        Resposta r = enviar("saga-1", "compensar-inserir-gerente", Map.of("cpf", NOVO));

        assertEquals("SUCESSO", r.status());
        assertEquals("compensar-inserir-gerente", r.tipo());
        assertFalse(gerentes.existsById(NOVO));
        assertTrue(processados.existsById(new ComandoProcessadoId("saga-1", "compensar-inserir-gerente")));
        assertFalse(processados.existsById(new ComandoProcessadoId("saga-1", "compensar-inativar-gerente")));
    }

    @Test
    void compensarInserirDeSagaQueNaoInseriuNaoApagaGerenteExistente() {
        enviar("saga-1", "inserir-gerente", novoGerente(GADAMANTIO, EMAIL_NOVO));

        Resposta r = enviar("saga-1", "compensar-inserir-gerente", Map.of("cpf", GADAMANTIO));

        assertEquals("SUCESSO", r.status());
        assertTrue(gerentes.existsById(GADAMANTIO));
    }

    @Test
    void compensarInserirReentregueNaoApagaGerenteCriadoDepoisPorOutraSaga() {
        enviar("saga-1", "inserir-gerente", novoGerente(NOVO, EMAIL_NOVO));
        enviar("saga-1", "compensar-inserir-gerente", Map.of("cpf", NOVO));
        enviar("saga-2", "inserir-gerente", novoGerente(NOVO, EMAIL_NOVO));

        Resposta r = enviar("saga-1", "compensar-inserir-gerente", Map.of("cpf", NOVO));

        assertEquals("SUCESSO", r.status());
        assertTrue(gerentes.existsById(NOVO));
    }

    @Test
    void inativarMarcaInativoEGravaAChave() {
        Resposta r = enviar("saga-1", "inativar-gerente", Map.of("cpf", GODOPHREDO));

        assertEquals("SUCESSO", r.status());
        assertEquals(Map.of("cpf", GODOPHREDO), r.payload());
        assertFalse(gerentes.findById(GODOPHREDO).orElseThrow().getAtivo());
        assertTrue(processados.existsById(new ComandoProcessadoId("saga-1", "inativar-gerente")));
    }

    @Test
    void inativarReentregueRespondeSucessoDeNovo() {
        enviar("saga-1", "inativar-gerente", Map.of("cpf", GODOPHREDO));

        Resposta r = enviar("saga-1", "inativar-gerente", Map.of("cpf", GODOPHREDO));

        assertEquals("SUCESSO", r.status());
        assertFalse(gerentes.findById(GODOPHREDO).orElseThrow().getAtivo());
        assertEquals(1, processados.count());
    }

    @Test
    void inativarUltimoGerenteAtivoFalha() {
        alterar(GENIEVE, g -> g.setAtivo(false));
        alterar(GYANDULA, g -> g.setAtivo(false));
        alterar(GADAMANTIO, g -> g.setAtivo(false));

        Resposta r = enviar("saga-1", "inativar-gerente", Map.of("cpf", GODOPHREDO));

        assertEquals("FALHA", r.status());
        assertEquals("Não é possível remover o último gerente ativo", r.erro());
        assertTrue(gerentes.findById(GODOPHREDO).orElseThrow().getAtivo());
    }

    @Test
    void compensarInativarReativaOGerenteDestaSaga() {
        enviar("saga-1", "inativar-gerente", Map.of("cpf", GODOPHREDO));

        Resposta r = enviar("saga-1", "compensar-inativar-gerente", Map.of("cpf", GODOPHREDO));

        assertEquals("SUCESSO", r.status());
        assertEquals("compensar-inativar-gerente", r.tipo());
        assertTrue(gerentes.findById(GODOPHREDO).orElseThrow().getAtivo());
    }

    @Test
    void compensarInativarDeSagaQueNaoInativouNaoReativa() {
        enviar("saga-a", "inativar-gerente", Map.of("cpf", GODOPHREDO));
        Resposta falha = enviar("saga-b", "inativar-gerente", Map.of("cpf", GODOPHREDO));

        Resposta r = enviar("saga-b", "compensar-inativar-gerente", Map.of("cpf", GODOPHREDO));

        assertEquals("FALHA", falha.status());
        assertEquals("SUCESSO", r.status());
        assertFalse(gerentes.findById(GODOPHREDO).orElseThrow().getAtivo());
        assertTrue(processados.existsById(new ComandoProcessadoId("saga-b", "compensar-inativar-gerente")));
    }

    @Test
    void compensarInativarReentregueNaoReativaDeNovo() {
        enviar("saga-1", "inativar-gerente", Map.of("cpf", GODOPHREDO));
        enviar("saga-1", "compensar-inativar-gerente", Map.of("cpf", GODOPHREDO));
        enviar("saga-2", "inativar-gerente", Map.of("cpf", GODOPHREDO));

        Resposta r = enviar("saga-1", "compensar-inativar-gerente", Map.of("cpf", GODOPHREDO));

        assertEquals("SUCESSO", r.status());
        assertFalse(gerentes.findById(GODOPHREDO).orElseThrow().getAtivo());
    }

    @Test
    void listarAtivosDevolveSoAtivosEmOrdemPtBr() {
        alterar(GYANDULA, g -> g.setAtivo(false));
        alterar(GADAMANTIO, g -> g.setNome("Ávila"));

        Resposta r = enviar("saga-1", "listar-ativos", Map.of());

        assertEquals("SUCESSO", r.status());
        assertEquals(List.of(GADAMANTIO, GENIEVE, GODOPHREDO), r.payload().get("cpfsAtivos"));
        assertEquals("Ávila", ((Map<?, ?>) r.payload().get("nomesGerentes")).get(GADAMANTIO));
    }

    private Resposta enviar(String sagaId, String tipo, Map<String, Object> payload) {
        MensagemSaga cmd = new MensagemSaga(sagaId, tipo, LocalDateTime.now().toString(), payload);
        listener.receber(MessageBuilder.withBody(json.writeValueAsBytes(cmd)).build());

        ArgumentCaptor<Object> resposta = ArgumentCaptor.forClass(Object.class);
        verify(publisher, atLeastOnce()).publicar(eq(SagaMessagePublisher.FILA_RESPOSTAS), resposta.capture());
        return (Resposta) resposta.getValue();
    }

    private Map<String, Object> novoGerente(String cpf, String email) {
        return Map.of("cpf", cpf, "nome", "Gerente Novo", "email", email, "telefone", "41900000010");
    }

    private void alterar(String cpf, Consumer<Gerente> mudanca) {
        Gerente gerente = gerentes.findById(cpf).orElseThrow();
        mudanca.accept(gerente);
        gerentes.save(gerente);
    }
}
