package br.ufpr.dac.grupo2.conta;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import br.ufpr.dac.grupo2.conta.command.exception.ConflitoDeVersaoException;
import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.command.repository.EventoRepository;
import br.ufpr.dac.grupo2.conta.command.service.ContaCommandService;
import br.ufpr.dac.grupo2.conta.command.service.EventoPublisher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

@ExtendWith(MockitoExtension.class)
class ContaCommandServiceTest {

    @Mock
    private EventoRepository eventoRepository;

    @Mock
    private EventoPublisher eventoPublisher;

    @InjectMocks
    private ContaCommandService contaCommandService;

    @Test
    void deveTraduzirViolacaoDaVersaoUnica() {
        Evento criado = new Evento(
                "1291",
                "Criado",
                Map.of(
                        "cpfCliente", "12912861012",
                        "cpfGerente", "98574307084",
                        "saldoInicial", "0.00"
                ),
                1,
                LocalDateTime.now()
        );

        when(eventoRepository
                .findByObjetoIdOrderByVersaoAsc("1291"))
                .thenReturn(List.of(criado));

        when(eventoRepository.saveAndFlush(any(Evento.class)))
                .thenThrow(new DataIntegrityViolationException(
                        "uk_evento_versao"
                ));

        assertThrows(
                ConflitoDeVersaoException.class,
                () -> contaCommandService.append(
                        "1291",
                        "Depósito",
                        Map.of("valor", "10.00")
                )
        );

        verifyNoInteractions(eventoPublisher);
    }
}