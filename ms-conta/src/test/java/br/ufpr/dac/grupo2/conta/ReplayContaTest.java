package br.ufpr.dac.grupo2.conta;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.util.Map;

import br.ufpr.dac.grupo2.conta.admin.service.SeedService;
import br.ufpr.dac.grupo2.conta.command.model.EstadoConta;
import br.ufpr.dac.grupo2.conta.command.service.ContaCommandService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.jdbc.Sql;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
@SpringBootTest
@Testcontainers
@Sql(scripts = "/db/04-ddl-conta.sql")
class ReplayContaTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("bantads")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void configurarDataSources(DynamicPropertyRegistry registry) {
        registry.add("app.datasource.command.jdbc-url", postgres::getJdbcUrl);
        registry.add("app.datasource.command.username", postgres::getUsername);
        registry.add("app.datasource.command.password", postgres::getPassword);
        registry.add("app.datasource.query.jdbc-url", postgres::getJdbcUrl);
        registry.add("app.datasource.query.username", postgres::getUsername);
        registry.add("app.datasource.query.password", postgres::getPassword);
    }

    @Autowired
    private SeedService seedService;

    @Autowired
    private ContaCommandService contaCommandService;

    @BeforeEach
    void prepararDados() {
        assertEquals(5L, seedService.executar());
    }

    @Test
    void deveReproduzirOsCincoSaldosDoReadModel() {
        Map<String, String> saldosEsperados = Map.of(
                "1291", "800.00",
                "0950", "10000.00",
                "8573", "200.00",
                "5887", "150000.00",
                "7617", "1500.00"
        );

        saldosEsperados.forEach((numero, esperado) -> {
            EstadoConta estado = contaCommandService.replay(numero);

            assertEquals(
                    0,
                    estado.getSaldo().compareTo(
                            new BigDecimal(esperado)
                    ),
                    "Saldo divergente para a conta " + numero
            );
        });
    }
}
