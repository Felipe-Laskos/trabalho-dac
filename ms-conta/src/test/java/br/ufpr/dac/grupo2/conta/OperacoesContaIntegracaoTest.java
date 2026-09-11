package br.ufpr.dac.grupo2.conta;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigDecimal;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import javax.sql.DataSource;

import br.ufpr.dac.grupo2.conta.admin.service.SeedService;
import br.ufpr.dac.grupo2.conta.command.exception.EventoInvalidoException;
import br.ufpr.dac.grupo2.conta.command.model.EstadoConta;
import br.ufpr.dac.grupo2.conta.command.repository.EventoRepository;
import br.ufpr.dac.grupo2.conta.command.service.ContaLeituraService;
import br.ufpr.dac.grupo2.conta.command.service.OperacaoContaService;
import br.ufpr.dac.grupo2.conta.query.listener.ProjecaoContaListener;
import br.ufpr.dac.grupo2.conta.query.service.ContaQueryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
@Sql(scripts = "/db/04-ddl-conta.sql")
class OperacoesContaIntegracaoTest {
    private static final String CPF = "12912861012";
    private static final String TRANSFERENCIA = """
            {"contaDestino":"0950","valor":"30.00",
             "origem":{"numeroConta":"1291","cpf":"12912861012","nome":"Catharyna"},
             "destino":{"numeroConta":"0950","cpf":"09506382000","nome":"Cleuddônio"}}
            """;

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void configurar(DynamicPropertyRegistry registry) {
        for (String lado : new String[]{"command", "query"}) {
            registry.add("app.datasource." + lado + ".jdbc-url", postgres::getJdbcUrl);
            registry.add("app.datasource." + lado + ".username", postgres::getUsername);
            registry.add("app.datasource." + lado + ".password", postgres::getPassword);
        }
    }

    @Autowired SeedService seed;
    @Autowired OperacaoContaService operacoes;
    @Autowired EventoRepository eventos;
    @Autowired ContaQueryService query;
    @Autowired ProjecaoContaListener projecao;
    @Autowired WebApplicationContext contexto;
    @Autowired @Qualifier("commandDataSource") DataSource dataSource;
    @MockitoBean RabbitTemplate rabbit;
    @MockitoSpyBean ContaLeituraService leitura;
    private MockMvc mvc;

    @BeforeEach
    void preparar() {
        seed.executar();
        clearInvocations(rabbit);
        mvc = MockMvcBuilders.webAppContextSetup(contexto).build();
    }

    @Test
    void contratosSemSaldoEProjecaoDosEventosPublicados() throws Exception {
        long quantidade = eventos.count();
        mvc.perform(post("/contas/1291/deposito").header("X-User-CPF", CPF)
                        .contentType("application/json").content("{\"valor\":\"150.00\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.saldo").doesNotExist());
        assertEquals("800.00", query.buscarPorNumero("1291").orElseThrow().saldo());
        ArgumentCaptor<Object> mensagens = ArgumentCaptor.forClass(Object.class);
        verify(rabbit).convertAndSend(eq("ms.conta.events"), mensagens.capture());
        projecao.projetar((String) mensagens.getValue());
        projecao.projetar((String) mensagens.getValue()); // Entrega duplicada é idempotente.
        assertEquals("950.00", query.buscarPorNumero("1291").orElseThrow().saldo());
        clearInvocations(rabbit);

        mvc.perform(post("/contas/1291/transferencia").header("X-User-CPF", CPF)
                        .contentType("application/json").content(TRANSFERENCIA))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.saldo").doesNotExist())
                .andExpect(jsonPath("$.destino.numeroConta").value("0950"))
                .andExpect(jsonPath("$.destino.nome").value("Cleuddônio"));
        mensagens = ArgumentCaptor.forClass(Object.class);
        verify(rabbit, times(2)).convertAndSend(eq("ms.conta.events"), mensagens.capture());
        for (Object mensagem : mensagens.getAllValues()) projecao.projetar((String) mensagem);
        assertEquals("920.00", query.buscarPorNumero("1291").orElseThrow().saldo());
        assertEquals("10030.00", query.buscarPorNumero("0950").orElseThrow().saldo());
        assertEquals(quantidade + 3, eventos.count());

        mvc.perform(post("/contas/1291/saque").header("X-User-CPF", CPF)
                        .contentType("application/json").content("{\"valor\":\"20.00\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.saldo").doesNotExist());
        assertEquals(0, leitura.replay("1291").getSaldo().compareTo(new BigDecimal("900.00")));
    }

    @Test
    void rejeitaSaldoInsuficienteContaAlheiaEDestinoInvalido() throws Exception {
        long quantidade = eventos.count();
        mvc.perform(post("/contas/1291/saque").header("X-User-CPF", CPF)
                        .contentType("application/json").content("{\"valor\":\"99999999.00\"}"))
                .andExpect(status().isUnprocessableEntity());
        for (String operacao : new String[]{"deposito", "saque", "transferencia"}) {
            mvc.perform(post("/contas/1291/" + operacao).header("X-User-CPF", "09506382000")
                            .contentType("application/json")
                            .content(operacao.equals("transferencia") ? TRANSFERENCIA : "{\"valor\":\"10.00\"}"))
                    .andExpect(status().isForbidden());
        }
        for (String destino : new String[]{"1291", "9999"}) {
            mvc.perform(post("/contas/1291/transferencia").header("X-User-CPF", CPF)
                            .contentType("application/json").content(TRANSFERENCIA.replace("0950", destino)))
                    .andExpect(status().isUnprocessableEntity());
        }
        mvc.perform(post("/contas/1291/transferencia").header("X-User-CPF", "09506382000")
                        .contentType("application/json").content(TRANSFERENCIA.replace("0950", "1291")))
                .andExpect(status().isForbidden());
        assertEquals(quantidade, eventos.count());
        verifyNoInteractions(rabbit);
    }

    @Test
    void falhaNaSegundaGravacaoReverteOrigemESemPublicacaoOuRetentativa() {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        long quantidade = eventos.count();
        // Constraint de teste rejeita somente o segundo evento da transferência.
        jdbc.execute("ALTER TABLE conta_command.eventos ADD CONSTRAINT teste_destino CHECK (tipo <> 'TransferênciaDestino') NOT VALID");
        clearInvocations(leitura);
        try {
            assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                    () -> operacoes.transferir("1291", request(), CPF));
            assertEquals(quantidade, eventos.count());
            assertEquals(0, leitura.replay("1291").getSaldo().compareTo(new BigDecimal("800.00")));
            verify(leitura, times(1)).replay("0950");
            verifyNoInteractions(rabbit);
        } finally {
            jdbc.execute("ALTER TABLE conta_command.eventos DROP CONSTRAINT teste_destino");
        }
    }

    @Test
    void saquesConcorrentesRefazemReplayERevalidamSaldoAposConflito() throws Exception {
        CyclicBarrier barreira = new CyclicBarrier(2);
        AtomicInteger replays = new AtomicInteger();
        doAnswer(chamada -> {
            EstadoConta estado = (EstadoConta) chamada.callRealMethod();
            if (replays.incrementAndGet() <= 2) barreira.await(10, TimeUnit.SECONDS);
            return estado;
        }).when(leitura).replay("1291");
        long quantidade = eventos.count();
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Callable<Boolean> sacar = () -> {
                try {
                    operacoes.sacar("1291", "600.00", CPF);
                    return true;
                } catch (EventoInvalidoException e) {
                    assertEquals("Saldo insuficiente", e.getMessage());
                    return false;
                }
            };
            Future<Boolean> primeiro = executor.submit(sacar);
            Future<Boolean> segundo = executor.submit(sacar);
            assertNotEquals(primeiro.get(20, TimeUnit.SECONDS), segundo.get(20, TimeUnit.SECONDS));
        }
        assertEquals(3, replays.get());
        assertEquals(quantidade + 1, eventos.count());
        assertEquals(0, leitura.replay("1291").getSaldo().compareTo(new BigDecimal("200.00")));
        // O read model continua antigo: não participou da validação.
        assertEquals("800.00", query.buscarPorNumero("1291").orElseThrow().saldo());
        verify(rabbit).convertAndSend(eq("ms.conta.events"), any(Object.class));
    }

    private br.ufpr.dac.grupo2.conta.command.dto.TransferenciaRequest request() {
        return new br.ufpr.dac.grupo2.conta.command.dto.TransferenciaRequest("0950", "30.00",
                new br.ufpr.dac.grupo2.conta.command.dto.ParteTransferencia("1291", CPF, "Catharyna"),
                new br.ufpr.dac.grupo2.conta.command.dto.ParteTransferencia("0950", "09506382000", "Cleuddônio"));
    }
}
