package br.ufpr.dac.grupo2.conta;

import br.ufpr.dac.grupo2.conta.command.exception.*;
import br.ufpr.dac.grupo2.conta.query.model.*;
import br.ufpr.dac.grupo2.conta.query.repository.*;
import br.ufpr.dac.grupo2.conta.query.service.ExtratoQueryService;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ExtratoQueryServiceTest {
    private ContaQueryRepository contas;
    private MovimentacaoRepository movimentos;
    private ExtratoQueryService service;
    private static final String CPF = "12912861012";

    @BeforeEach
    void preparar() {
        contas = mock(ContaQueryRepository.class);
        movimentos = mock(MovimentacaoRepository.class);
        service = new ExtratoQueryService(contas, movimentos,
                Clock.fixed(Instant.parse("2026-09-15T15:00:00Z"), ZoneId.of("America/Sao_Paulo")));
        when(contas.findById("1291")).thenReturn(Optional.of(new ContaQuery(
                "1291", CPF, "98574307084", LocalDate.of(2000, 1, 1),
                new BigDecimal("800.0000"), 8)));
    }

    private Movimentacao mov(String tipo, String saldo) {
        return new Movimentacao(8L, "1291", LocalDateTime.of(2020, 1, 20, 12, 0),
                tipo, new BigDecimal("1700.0000"), new BigDecimal(saldo),
                "1291", CPF, "Catharyna", "0950", "09506382000", "Cleuddônio");
    }

    @Test
    void semAnteriorRetornaZeroEListaVazia() {
        var e = service.consultar("1291", LocalDate.of(2020, 1, 1),
                LocalDate.of(2020, 12, 31), CPF, "CLIENTE");
        assertEquals("0.00", e.saldoAbertura());
        assertTrue(e.movimentacoes().isEmpty());
        assertEquals("1291", e.numeroConta());
        assertEquals("/contas/1291", e._links().get("conta").href());
        assertEquals(List.of("self", "conta"), new ArrayList<>(e._links().keySet()));
    }

    @Test
    void usaSaldoAposAnteriorENaoSaldoAtualDaConta() {
        var inicio = LocalDate.of(2020, 1, 16);
        when(movimentos.findFirstByNumeroContaAndDataHoraBeforeOrderByDataHoraDescIdDesc(
                "1291", inicio.atStartOfDay())).thenReturn(Optional.of(mov("SAQUE", "2500.0000")));
        var e = service.consultar("1291", inicio, LocalDate.of(2020, 1, 31), CPF, "CLIENTE");
        assertEquals("2500.00", e.saldoAbertura());
        verify(movimentos).findByNumeroContaAndDataHoraGreaterThanEqualAndDataHoraLessThanOrderByDataHoraAscIdAsc(
                "1291", inicio.atStartOfDay(), LocalDate.of(2020, 2, 1).atStartOfDay());
    }

    @Test
    void padraoIncluiTrintaDatas() {
        var e = service.consultar("1291", null, null, CPF, "CLIENTE");
        assertEquals("2026-08-17", e.dataInicio());
        assertEquals("2026-09-15", e.dataFim());
    }

    @Test
    void datasParciais() {
        var e = service.consultar("1291", null, LocalDate.of(2020, 1, 31), CPF, "CLIENTE");
        assertEquals("2020-01-02", e.dataInicio());
        e = service.consultar("1291", LocalDate.of(2026, 9, 1), null, CPF, "CLIENTE");
        assertEquals("2026-09-15", e.dataFim());
    }

    @Test
    void rejeitaIntervalosInvalidosSemConsultarMovimentacoes() {
        assertThrows(EventoInvalidoException.class, () -> service.consultar("1291",
                LocalDate.of(2020, 1, 1), LocalDate.of(2023, 1, 1), CPF, "CLIENTE"));
        assertThrows(EventoInvalidoException.class, () -> service.consultar("1291",
                LocalDate.of(2020, 2, 1), LocalDate.of(2020, 1, 31), CPF, "CLIENTE"));
        verifyNoInteractions(movimentos);
    }

    @Test
    void aceitaMesmoDiaELimite365Rejeita366() {
        var inicio = LocalDate.of(2020, 1, 1);
        assertDoesNotThrow(() -> service.consultar("1291", inicio, inicio, CPF, "CLIENTE"));
        assertDoesNotThrow(() -> service.consultar("1291", inicio, inicio.plusDays(365), CPF, "CLIENTE"));
        assertThrows(EventoInvalidoException.class,
                () -> service.consultar("1291", inicio, inicio.plusDays(366), CPF, "CLIENTE"));
    }

    @Test
    void negaOutroClienteEPerfilDesconhecido() {
        assertThrows(AcessoNegadoException.class,
                () -> service.consultar("1291", null, null, "09506382000", "CLIENTE"));
        assertThrows(AcessoNegadoException.class,
                () -> service.consultar("1291", null, null, CPF, "ADMIN"));
        verifyNoInteractions(movimentos);
    }

    @Test
    void qualquerGerentePodeConsultar() {
        assertDoesNotThrow(() -> service.consultar("1291", null, null, "40501740066", "GERENTE"));
    }

    @Test
    void contaAusente() {
        assertThrows(ContaNaoEncontradaException.class,
                () -> service.consultar("9999", null, null, CPF, "CLIENTE"));
        verifyNoInteractions(movimentos);
    }

    @Test
    void partesSomenteNaTransferenciaEValoresComDuasCasas() {
        when(movimentos.findByNumeroContaAndDataHoraGreaterThanEqualAndDataHoraLessThanOrderByDataHoraAscIdAsc(
                anyString(), any(), any())).thenReturn(List.of(
                        mov("DEPOSITO", "1000"), mov("SAQUE", "500"), mov("TRANSFERENCIA", "800")));
        var e = service.consultar("1291", LocalDate.of(2020, 1, 1),
                LocalDate.of(2020, 1, 31), CPF, "CLIENTE");
        for (int i = 0; i < 2; i++) {
            assertNull(e.movimentacoes().get(i).origem());
            assertNull(e.movimentacoes().get(i).destino());
        }
        var t = e.movimentacoes().get(2);
        assertEquals("1700.00", t.valor());
        assertEquals("Catharyna", t.origem().nome());
        assertEquals("Cleuddônio", t.destino().nome());
        assertEquals("0950", t.destino().numeroConta());
    }
}
