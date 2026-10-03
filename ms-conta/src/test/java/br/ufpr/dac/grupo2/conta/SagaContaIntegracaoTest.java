package br.ufpr.dac.grupo2.conta;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;
import java.util.concurrent.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import tools.jackson.databind.ObjectMapper;
import br.ufpr.dac.grupo2.conta.command.service.*;
import br.ufpr.dac.grupo2.conta.command.repository.EventoRepository;
import br.ufpr.dac.grupo2.conta.command.exception.ContaNaoEncontradaException;
import br.ufpr.dac.grupo2.conta.messaging.dto.*;
import br.ufpr.dac.grupo2.conta.query.listener.ProjecaoContaListener;
import br.ufpr.dac.grupo2.conta.query.repository.ContaQueryRepository;
@Testcontainers
@SpringBootTest(properties={
    "spring.rabbitmq.listener.simple.auto-startup=false",
    "spring.rabbitmq.dynamic=false"})
class SagaContaIntegracaoTest {
    @Container static PostgreSQLContainer<?> pg=
        new PostgreSQLContainer<>("postgres:16");
    @DynamicPropertySource static void config(DynamicPropertyRegistry r) {
        for (String lado: List.of("command","query")) {
            r.add("app.datasource."+lado+".jdbc-url",pg::getJdbcUrl);
            r.add("app.datasource."+lado+".username",pg::getUsername);
            r.add("app.datasource."+lado+".password",pg::getPassword);
        }
    }
    @MockitoBean ReprojecaoService reconciliacao;
    @Autowired @Qualifier("commandDataSource") DataSource db;
    @Autowired SagaContaTransacional service;
    @Autowired EventoRepository eventos;
    @Autowired ContaQueryRepository contas;
    @Autowired ProjecaoContaListener projecao;
    @Autowired ContaLeituraService leitura;
    @Autowired ObjectMapper json;
    @BeforeEach void preparar() {
        new ResourceDatabasePopulator(
            new ClassPathResource("db/04-ddl-conta.sql"),
            new ClassPathResource("db/seed-command.sql"),
            new ClassPathResource("db/seed-query.sql")).execute(db);
    }
    ComandoSaga criar(String saga) {
        return new ComandoSaga(saga,"criar-conta","2026-09-21T10:00:00",
            Map.of("cpfCliente","12345678901","cpfGerente","40501740066"));
    }
    @Test void reentregaMantemNumeroEUmEvento() {
        var cmd=criar(UUID.randomUUID().toString());
        var a=service.executar(cmd,null);
        var b=service.executar(cmd,null);
        assertEquals(a,b);
        assertTrue(a.evento().objetoId().matches("[0-9]{4}"));
        assertEquals(1,eventos.findByObjetoIdOrderByVersaoAsc(
            a.evento().objetoId()).size());
    }
    @Test void compensacaoRemoveQueryEBloqueiaReplayECriadoAntigo()
            throws Exception {
        var cmd=criar(UUID.randomUUID().toString());
        var criado=service.executar(cmd,null);
         String n=criado.evento().objetoId();
        projecao.projetar(json.writeValueAsString(criado.evento()));
        assertEquals("0.00",contas.findById(n).orElseThrow().getSaldo()
            .setScale(2).toPlainString());
        var cancelado=service.executar(new ComandoSaga(cmd.sagaId(),
            "compensar-criar-conta",cmd.timestamp(),Map.of("numeroConta",n)),null);
        projecao.projetar(json.writeValueAsString(cancelado.evento()));
        projecao.projetar(json.writeValueAsString(criado.evento()));
        assertFalse(contas.existsById(n));
        assertThrows(ContaNaoEncontradaException.class,() -> leitura.replay(n));
        assertEquals(2,eventos.findByObjetoIdOrderByVersaoAsc(n).size());
    }
    @Test void duplicatasConcorrentesCriamUmaConta() throws Exception {
        var cmd=criar(UUID.randomUUID().toString());
        try (var executor=Executors.newFixedThreadPool(2)) {
            var a=executor.submit(() -> service.executar(cmd,null));
            var b=executor.submit(() -> service.executar(cmd,null));
            assertEquals(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS));
            assertEquals(1,eventos.findByObjetoIdOrderByVersaoAsc(
                a.get().evento().objetoId()).size());
        }
    }
}