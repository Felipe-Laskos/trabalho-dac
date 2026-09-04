package br.ufpr.dac.grupo2.conta;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.command.repository.EventoRepository;
import br.ufpr.dac.grupo2.conta.command.service.EventoPublisher;
import br.ufpr.dac.grupo2.conta.command.service.ReprojecaoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@ExtendWith(MockitoExtension.class)
class ReprojecaoServiceTest {

    @Mock
    private EventoRepository eventoRepository;

    @Mock
    private EventoPublisher eventoPublisher;

    @Test
    void deveRepublicarEventosDaContaEmOrdemDeVersao() {
        ReprojecaoService service = new ReprojecaoService(
                eventoRepository,
                eventoPublisher
        );

        Evento primeiro = evento("1291", 1);
        Evento segundo = evento("1291", 2);

        when(eventoRepository.findByObjetoIdOrderByVersaoAsc("1291"))
                .thenReturn(List.of(primeiro, segundo));

        int total = service.republicar("1291");

        assertEquals(2, total);

        InOrder ordem = inOrder(eventoPublisher);
        ordem.verify(eventoPublisher).publicarAgora(primeiro);
        ordem.verify(eventoPublisher).publicarAgora(segundo);
    }

    @Test
    void deveRepublicarTudoOrdenandoPorContaEVersao() {
        ReprojecaoService service = new ReprojecaoService(
                eventoRepository,
                eventoPublisher
        );

        Evento evento = evento("1291", 1);

        when(eventoRepository.findAll(any(Sort.class)))
                .thenReturn(List.of(evento));

        int total = service.republicarTudo();

        assertEquals(1, total);
        verify(eventoRepository).findAll(
                Sort.by("objetoId", "versao")
        );
        verify(eventoPublisher).publicarAgora(evento);
    }

    private Evento evento(String numeroConta, int versao) {
        return new Evento(
                numeroConta,
                "Criado",
                Map.of(
                        "cpfCliente", "12912861012",
                        "cpfGerente", "98574307084",
                        "saldoInicial", "0.00"
                ),
                versao,
                LocalDateTime.now()
        );
    }
}
