package br.ufpr.dac.grupo2.conta;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import br.ufpr.dac.grupo2.conta.exception.ContaNaoEncontradaException;
import br.ufpr.dac.grupo2.conta.exception.EventoInvalidoException;
import br.ufpr.dac.grupo2.conta.command.model.EstadoConta;
import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.command.repository.EventoRepository;
import br.ufpr.dac.grupo2.conta.command.service.ContaLeituraService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ContaLeituraServiceTest {

    @Mock
    private EventoRepository eventos;

    private ContaLeituraService leitura;

    @BeforeEach
    void preparar() {
        leitura = new ContaLeituraService(eventos);
    }

    @Test
    void saqueIgualAoSaldoEhPermitido() {
        EstadoConta estado = new EstadoConta("1291");
        estado.setSaldo(new BigDecimal("100.00"));

        assertDoesNotThrow(() -> leitura.validar(
                "Saque", Map.of("valor", "100.00"), estado));
    }

    @Test
    void valorZeroENegativoSaoRejeitados() {
        EstadoConta estado = new EstadoConta("1291");
        estado.setSaldo(new BigDecimal("100.00"));

        for (String valor : List.of("0.00", "-1.00")) {
            EventoInvalidoException erro = assertThrows(
                    EventoInvalidoException.class,
                    () -> leitura.validar(
                            "Saque", Map.of("valor", valor), estado));
            assertEquals("O valor deve ser maior que zero", erro.getMessage());
        }
    }

    @Test
    void replayRejeitaLacunaDeVersao() {
        when(eventos.findByObjetoIdOrderByVersaoAsc("1291"))
                .thenReturn(List.of(criado(), evento("Depósito",
                        Map.of("valor", "10.00"), 3)));

        EventoInvalidoException erro = assertThrows(
                EventoInvalidoException.class, () -> leitura.replay("1291"));
        assertEquals("Sequência inválida na conta 1291: esperada versão 2, recebida 3",
                erro.getMessage());
    }

    @Test
    void replayNaoExpõeCriacaoCompensada() {
        when(eventos.findByObjetoIdOrderByVersaoAsc("1291"))
                .thenReturn(List.of(criado(), evento("CriacaoCompensada",
                        Map.of("sagaId", "saga-1"), 2)));

        assertThrows(ContaNaoEncontradaException.class,
                () -> leitura.replay("1291"));
    }

    private Evento criado() {
        return evento("Criado", Map.of(
                "cpfCliente", "12912861012",
                "cpfGerente", "98574307084",
                "saldoInicial", "100.00"), 1);
    }

    private Evento evento(String tipo, Map<String, Object> payload, int versao) {
        return new Evento("1291", tipo, payload, versao,
                LocalDateTime.of(2026, 10, 31, 12, 0));
    }
}
