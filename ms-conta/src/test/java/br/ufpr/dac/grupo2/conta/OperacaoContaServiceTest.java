package br.ufpr.dac.grupo2.conta;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.ufpr.dac.grupo2.conta.command.dto.OperacaoRealizada;
import br.ufpr.dac.grupo2.conta.command.exception.ConflitoDeVersaoException;
import br.ufpr.dac.grupo2.conta.command.exception.TentativasEsgotadasException;
import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.command.service.OperacaoContaService;
import br.ufpr.dac.grupo2.conta.command.service.OperacaoTransacional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Map;

@ExtendWith(MockitoExtension.class)
class OperacaoContaServiceTest {

    @Mock
    private OperacaoTransacional transacao;

    @InjectMocks
    private OperacaoContaService service;

    @Test
    void deveRetentarDepositoAteSucessoNaTerceiraTentativa() {
        ConflitoDeVersaoException conflito =
                new ConflitoDeVersaoException(
                        "1291",
                        9,
                        new RuntimeException()
                );
        Evento evento = evento(
                "1291",
                "Depósito",
                "10.00",
                9
        );

        when(transacao.depositar(
                "1291",
                "10.00",
                "12912861012"
        )).thenThrow(conflito)
                .thenThrow(conflito)
                .thenReturn(evento);

        OperacaoRealizada resposta = service.depositar(
                "1291",
                "10.00",
                "12912861012"
        );

        assertEquals("1291", resposta.numeroConta());
        assertEquals("DEPOSITO", resposta.tipo());

        verify(transacao, times(3)).depositar(
                "1291",
                "10.00",
                "12912861012"
        );
    }

    @Test
    void deveEsgotarTentativasQuandoSaqueSempreConflitar() {
        ConflitoDeVersaoException conflito =
                new ConflitoDeVersaoException(
                        "1291",
                        9,
                        new RuntimeException()
                );

        when(transacao.sacar(
                "1291",
                "10.00",
                "12912861012"
        )).thenThrow(conflito);

        assertThrows(
                TentativasEsgotadasException.class,
                () -> service.sacar(
                        "1291",
                        "10.00",
                        "12912861012"
                )
        );

        verify(transacao, times(4)).sacar(
                "1291",
                "10.00",
                "12912861012"
        );
    }

    private Evento evento(
            String numeroConta,
            String tipo,
            String valor,
            int versao) {

        return new Evento(
                numeroConta,
                tipo,
                Map.of("valor", valor),
                versao,
                LocalDateTime.now()
        );
    }
}
