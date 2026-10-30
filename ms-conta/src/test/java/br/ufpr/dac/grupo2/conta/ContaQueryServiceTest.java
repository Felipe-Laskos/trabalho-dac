package br.ufpr.dac.grupo2.conta;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.ufpr.dac.grupo2.conta.query.dto.ContaDTO;
import br.ufpr.dac.grupo2.conta.query.model.ContaQuery;
import br.ufpr.dac.grupo2.conta.query.repository.ContaQueryRepository;
import br.ufpr.dac.grupo2.conta.query.service.ContaQueryService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ContaQueryServiceTest {

    private static final String CPF = "12912861012";

    @Mock
    private ContaQueryRepository repository;

    @InjectMocks
    private ContaQueryService service;

    @Test
    void buscarPorCpfRetornaContaEDadosFormatados() {
        ContaQuery conta = new ContaQuery("1291", CPF, "98574307084",
                LocalDate.of(2000, 1, 1), new BigDecimal("800.0000"), 8);
        when(repository.findByCpfCliente(CPF)).thenReturn(Optional.of(conta));

        ContaDTO resultado = service.buscarPorCpf(CPF).orElseThrow();

        assertEquals("1291", resultado.numero());
        assertEquals(CPF, resultado.cpfCliente());
        assertEquals("98574307084", resultado.cpfGerente());
        assertEquals("800.00", resultado.saldo());
        assertEquals("2000-01-01", resultado.dataCriacao());
        assertEquals("/contas/1291", resultado._links().get("self").href());
        assertEquals("/clientes/" + CPF, resultado._links().get("cliente").href());
        assertEquals("/contas/1291/extrato", resultado._links().get("extrato").href());
        verify(repository).findByCpfCliente(CPF);
    }

    @Test
    void buscarPorCpfAusenteRetornaVazio() {
        when(repository.findByCpfCliente(CPF)).thenReturn(Optional.empty());

        assertTrue(service.buscarPorCpf(CPF).isEmpty());

        verify(repository).findByCpfCliente(CPF);
    }
}
