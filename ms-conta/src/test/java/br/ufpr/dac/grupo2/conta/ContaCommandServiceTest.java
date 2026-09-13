package br.ufpr.dac.grupo2.conta;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.ufpr.dac.grupo2.conta.command.exception.ConflitoDeVersaoException;
import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.command.service.AppendTransacional;
import br.ufpr.dac.grupo2.conta.command.service.ContaCommandService;
import br.ufpr.dac.grupo2.conta.command.service.ContaLeituraService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Map;

@ExtendWith(MockitoExtension.class)
class ContaCommandServiceTest {

    @Mock
    private ContaLeituraService contaLeituraService;

    @Mock
    private AppendTransacional appendTransacional;

    @InjectMocks
    private ContaCommandService contaCommandService;

    @Test
    void deveRepetirAppendTransacionalAteOLimiteEmConflito() {
        ConflitoDeVersaoException conflito =
                new ConflitoDeVersaoException(
                        "1291",
                        2,
                        new RuntimeException()
                );

        Map<String, Object> payload = Map.of("valor", "10.00");

        when(appendTransacional.executar(
                "1291",
                "Depósito",
                payload
        )).thenThrow(conflito);

        assertThrows(
                ConflitoDeVersaoException.class,
                () -> contaCommandService.append(
                        "1291",
                        "Depósito",
                        payload
                )
        );

        verify(appendTransacional, times(3))
                .executar("1291", "Depósito", payload);
    }

    @Test
    void deveRetornarQuandoTentativaTransacionalConseguir() {
        Map<String, Object> payload = Map.of("valor", "10.00");
        ConflitoDeVersaoException conflito =
                new ConflitoDeVersaoException(
                        "1291",
                        2,
                        new RuntimeException()
                );
        Evento esperado = new Evento(
                "1291",
                "Depósito",
                payload,
                3,
                LocalDateTime.now()
        );

        when(appendTransacional.executar(
                "1291",
                "Depósito",
                payload
        )).thenThrow(conflito).thenReturn(esperado);

        Evento resultado = contaCommandService.append(
                "1291",
                "Depósito",
                payload
        );

        assertSame(esperado, resultado);
        verify(appendTransacional, times(2))
                .executar("1291", "Depósito", payload);
    }
}
