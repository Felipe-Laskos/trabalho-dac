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
    @Test void atribuiDeduplicaCompensaEProjetaSemAlterarSaldo()
            throws Exception {
        String sagaId=UUID.randomUUID().toString();
        String anterior="64065268052";
        String novo="11111111111";
        var saldo=leitura.replay("7617").getSaldo();
        service.registrarSelecaoTransferencia(new ComandoSaga(sagaId,
            "conta-a-transferir", "2026-09-30T09:59:00", Map.of()),
            Optional.of(new ContaParaTransferir("7617",
                "76179646090", anterior)));
        var atribuir=new ComandoSaga(sagaId,"atribuir-conta",
            "2026-09-30T10:00:00",
            Map.of("numeroConta","7617","cpfGerente",novo));

        var atribuicao=service.executar(atribuir,null);
        var repetida=service.executar(atribuir,null);

        assertEquals(atribuicao,repetida);
        assertEquals("atribuir-conta",atribuicao.resposta().tipo());
        assertEquals("GerenteAlterado",atribuicao.evento().tipo());
        assertEquals(3,atribuicao.evento().versao());
        assertEquals(anterior,atribuicao.evento().payload()
            .get("cpfGerenteAnterior"));
        assertEquals(novo,atribuicao.evento().payload().get("cpfGerente"));
        assertEquals(3,eventos.findByObjetoIdOrderByVersaoAsc("7617").size());
        assertEquals(novo,leitura.replay("7617").getCpfGerente());
        assertEquals(saldo,leitura.replay("7617").getSaldo());

        projecao.projetar(json.writeValueAsString(atribuicao.evento()));
        assertEquals(novo,contas.findById("7617").orElseThrow()
            .getCpfGerente());

        var compensar=new ComandoSaga(sagaId,"compensar-atribuir-conta",
            "2026-09-30T10:01:00",
            Map.of("numeroConta","7617","cpfGerente",anterior));
        var compensacao=service.executar(compensar,null);

        assertEquals("compensar-atribuir-conta",
            compensacao.resposta().tipo());
        assertEquals("GerenteAlterado",compensacao.evento().tipo());
        assertEquals(4,compensacao.evento().versao());
        assertEquals(anterior,leitura.replay("7617").getCpfGerente());
        assertEquals(saldo,leitura.replay("7617").getSaldo());

        projecao.projetar(json.writeValueAsString(compensacao.evento()));
        var finalProjetado=contas.findById("7617").orElseThrow();
        assertEquals(anterior,finalProjetado.getCpfGerente());
        assertEquals(0, saldo.compareTo(finalProjetado.getSaldo()),
            "GerenteAlterado não pode modificar o valor do saldo");
        assertEquals(4,finalProjetado.getUltimaVersao());
    }
    @Test void atribuirFalhaQuandoContaMudouDeGerenteAposSelecao() {
        String sagaId=UUID.randomUUID().toString();
        service.registrarSelecaoTransferencia(new ComandoSaga(sagaId,
            "conta-a-transferir", "2026-09-30T09:59:00", Map.of()),
            Optional.of(new ContaParaTransferir("7617",
                "76179646090", "99999999999")));
        var atribuir=new ComandoSaga(sagaId,"atribuir-conta",
            "2026-09-30T10:00:00",
            Map.of("numeroConta","7617","cpfGerente","11111111111"));

        var resultado=service.executar(atribuir,null);

        assertEquals("FALHA",resultado.resposta().status());
        assertEquals("A conta escolhida mudou de gerente durante a inserção. Tente novamente.",
            resultado.resposta().erro());
        assertNull(resultado.evento());
        assertEquals(2,eventos.findByObjetoIdOrderByVersaoAsc("7617").size());
        assertEquals("64065268052",leitura.replay("7617").getCpfGerente());
    }
    @Test void compensarSemAtribuicaoRespondeSucessoSemReverter() {
        var compensar=new ComandoSaga(UUID.randomUUID().toString(),
            "compensar-atribuir-conta", "2026-09-30T10:01:00",
            Map.of("numeroConta","7617","cpfGerente","64065268052"));

        var resultado=service.executar(compensar,null);

        assertEquals("SUCESSO",resultado.resposta().status());
        assertEquals(Map.of("numeroConta","7617","revertida",false),
            resultado.resposta().payload());
        assertNull(resultado.evento());
        assertEquals(2,eventos.findByObjetoIdOrderByVersaoAsc("7617").size());
    }
    @Test void tipoDesconhecidoRespondeFalhaComMesmoTipo() {
        var cmd=new ComandoSaga(UUID.randomUUID().toString(),
            "comando-inexistente","2026-09-30T10:03:00",Map.of());

        var resultado=service.executar(cmd,null);

        assertEquals("comando-inexistente",resultado.resposta().tipo());
        assertEquals("FALHA",resultado.resposta().status());
        assertEquals("Tipo de comando não suportado: comando-inexistente",
            resultado.resposta().erro());
        assertNull(resultado.evento());
    }
}
