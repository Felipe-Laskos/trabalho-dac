package br.ufpr.dac.grupo2.conta;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Map;

import br.ufpr.dac.grupo2.conta.messaging.dto.EventoPublicado;
import br.ufpr.dac.grupo2.conta.query.listener.ProjecaoContaListener;
import br.ufpr.dac.grupo2.conta.query.model.Movimentacao;
import br.ufpr.dac.grupo2.conta.query.repository.ContaQueryRepository;
import br.ufpr.dac.grupo2.conta.query.repository.MovimentacaoRepository;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProjecaoContaListenerTest {

    @Mock
    private ContaQueryRepository contaRepository;

    @Mock
    private MovimentacaoRepository movimentacaoRepository;

    @Test
    void deveIgnorarEventoJaAplicado() throws Exception {
        ObjectMapper mapper = JsonMapper.builder()
                .findAndAddModules()
                .build();

        ProjecaoContaListener listener =
                new ProjecaoContaListener(
                        mapper,
                        contaRepository,
                        movimentacaoRepository
                );

        EventoPublicado evento = new EventoPublicado(
                23L,
                "1291",
                "Depósito",
                Map.of("valor", "10.00"),
                9,
                LocalDateTime.now()
        );

        when(movimentacaoRepository.existsByEventoId(23L))
                .thenReturn(true);

        listener.projetar(mapper.writeValueAsString(evento));

        verify(movimentacaoRepository)
                .existsByEventoId(23L);
        verify(movimentacaoRepository, never())
                .save(any(Movimentacao.class));
        verifyNoInteractions(contaRepository);
    }
}
