package br.ufpr.dac.grupo2.conta;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import br.ufpr.dac.grupo2.conta.query.model.ContaQuery;
import br.ufpr.dac.grupo2.conta.query.repository.ContaQueryRepository;
import br.ufpr.dac.grupo2.conta.query.service.TransferenciaNovoGerenteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TransferenciaNovoGerenteServiceTest {

    @Mock
    private ContaQueryRepository repository;

    private TransferenciaNovoGerenteService service;

    @BeforeEach
    void preparar() {
        service = new TransferenciaNovoGerenteService(repository);
    }

    @Test
    void seedEscolheConta7617DeGodophredo() {
        when(repository.findAll()).thenReturn(List.of(
                conta("1291", "12912861012", "98574307084", "800.00"),
                conta("5887", "58872160006", "98574307084", "150000.00"),
                conta("0950", "09506382000", "64065268052", "10000.00"),
                conta("7617", "76179646090", "64065268052", "1500.00"),
                conta("8573", "85733854057", "23862179060", "200.00")));

        var resultado = service.escolher("11111111111").orElseThrow();

        assertEquals("7617", resultado.numeroConta());
        assertEquals("76179646090", resultado.cpfCliente());
        assertEquals("64065268052", resultado.cpfGerenteAnterior());
    }

    @Test
    void todosComUmaContaNaoTransferem() {
        when(repository.findAll()).thenReturn(List.of(
                conta("0001", "10000000001", "98574307084", "10.00"),
                conta("0002", "10000000002", "64065268052", "20.00")));

        assertTrue(service.escolher("11111111111").isEmpty());
    }

    @Test
    void primeiroGerenteNaoRecebeConta() {
        when(repository.findAll()).thenReturn(List.of());

        assertTrue(service.escolher("11111111111").isEmpty());
    }

    @Test
    void empateDeQuantidadeESaldoUsaMenorCpf() {
        when(repository.findAll()).thenReturn(List.of(
                conta("0004", "10000000001", "98574307084", "20.00"),
                conta("0005", "10000000002", "98574307084", "30.00"),
                conta("0002", "10000000003", "23862179060", "25.00"),
                conta("0003", "10000000004", "23862179060", "25.00")));

        var resultado = service.escolher("11111111111").orElseThrow();

        assertEquals("23862179060", resultado.cpfGerenteAnterior());
        assertEquals("0002", resultado.numeroConta());
    }

    @Test
    void empateDeSaldoDaContaUsaMenorNumero() {
        when(repository.findAll()).thenReturn(List.of(
                conta("0009", "10000000001", "64065268052", "10.00"),
                conta("0003", "10000000002", "64065268052", "10.00")));

        assertEquals("0003", service.escolher("11111111111")
                .orElseThrow().numeroConta());
    }

    private ContaQuery conta(
            String numero,
            String cliente,
            String gerente,
            String saldo) {
        return new ContaQuery(
                numero,
                cliente,
                gerente,
                LocalDate.of(2020, 1, 1),
                new BigDecimal(saldo),
                1);
    }
}
