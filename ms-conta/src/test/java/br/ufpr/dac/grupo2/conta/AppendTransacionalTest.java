package br.ufpr.dac.grupo2.conta;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import br.ufpr.dac.grupo2.conta.command.exception.ConflitoDeVersaoException;
import br.ufpr.dac.grupo2.conta.command.exception.EventoInvalidoException;
import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.command.repository.EventoRepository;
import br.ufpr.dac.grupo2.conta.command.service.AppendTransacional;
import br.ufpr.dac.grupo2.conta.command.service.ContaLeituraService;
import br.ufpr.dac.grupo2.conta.command.service.EventoPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@ExtendWith(MockitoExtension.class)
class AppendTransacionalTest {

    @Mock
    private EventoRepository eventoRepository;

    @Mock
    private EventoPublisher eventoPublisher;

    private AppendTransacional appendTransacional;

    @BeforeEach
    void configurar() {
        ContaLeituraService leitura =
                new ContaLeituraService(eventoRepository);
        appendTransacional = new AppendTransacional(
                leitura,
                eventoRepository,
                eventoPublisher
        );
    }

    @Test
    void deveTraduzirViolacaoDaVersaoUnica() {
        when(eventoRepository
                .findByObjetoIdOrderByVersaoAsc("1291"))
                .thenReturn(List.of(contaCriada("1291", "0.00")));

        when(eventoRepository.saveAndFlush(any(Evento.class)))
                .thenThrow(new DataIntegrityViolationException(
                        "uk_evento_versao"
                ));

        assertThrows(
                ConflitoDeVersaoException.class,
                () -> appendTransacional.executar(
                        "1291",
                        "Depósito",
                        Map.of("valor", "10.00")
                )
        );

        verifyNoInteractions(eventoPublisher);
    }

    @Test
    void deveExigirOrigemEDestinoCompletosNaTransferencia() {
        when(eventoRepository
                .findByObjetoIdOrderByVersaoAsc("1291"))
                .thenReturn(List.of(contaCriada("1291", "100.00")));

        Map<String, Object> payload = Map.of(
                "valor", "10.00",
                "origem", Map.of(
                        "numeroConta", "1291",
                        "cpf", "12912861012",
                        "nome", "Cliente Origem"
                )
        );

        assertThrows(
                EventoInvalidoException.class,
                () -> appendTransacional.executar(
                        "1291",
                        "TransferênciaOrigem",
                        payload
                )
        );

        verify(eventoRepository, never())
                .saveAndFlush(any(Evento.class));
        verifyNoInteractions(eventoPublisher);
    }

    private Evento contaCriada(
            String numeroConta,
            String saldoInicial) {

        return new Evento(
                numeroConta,
                "Criado",
                Map.of(
                        "cpfCliente", "12912861012",
                        "cpfGerente", "98574307084",
                        "saldoInicial", saldoInicial
                ),
                1,
                LocalDateTime.now()
        );
    }
}
