package br.ufpr.dac.grupo2.conta;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.ufpr.dac.grupo2.conta.command.dto.ParteTransferencia;
import br.ufpr.dac.grupo2.conta.command.dto.TransferenciaRequest;
import br.ufpr.dac.grupo2.conta.command.model.EstadoConta;
import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.command.repository.EventoRepository;
import br.ufpr.dac.grupo2.conta.command.service.ContaLeituraService;
import br.ufpr.dac.grupo2.conta.command.service.EventoPublisher;
import br.ufpr.dac.grupo2.conta.command.service.OperacaoTransacional;
import br.ufpr.dac.grupo2.conta.command.service.OperacaoTransacional.TransferenciaPersistida;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

@ExtendWith(MockitoExtension.class)
class OperacaoTransacionalTest {

    @Mock
    private ContaLeituraService leitura;

    @Mock
    private EventoRepository eventoRepository;

    @Mock
    private EventoPublisher eventoPublisher;

    @InjectMocks
    private OperacaoTransacional transacao;

    @Test
    void deveSalvarExatamenteDoisEventosNaTransferencia() {
        EstadoConta origem = estado(
                "1291",
                "12912861012",
                "100.00",
                8
        );
        EstadoConta destino = estado(
                "0950",
                "09506382000",
                "10000.00",
                7
        );
        TransferenciaRequest request = new TransferenciaRequest(
                "0950",
                "30.00",
                new ParteTransferencia(
                        "1291",
                        "12912861012",
                        "Catharyna"
                ),
                new ParteTransferencia(
                        "0950",
                        "09506382000",
                        "Cleuddônio"
                )
        );

        when(leitura.replay("1291")).thenReturn(origem);
        when(leitura.replay("0950")).thenReturn(destino);
        when(eventoRepository.saveAllAndFlush(anyList()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        TransferenciaPersistida resultado = transacao.transferir(
                "1291",
                request,
                "12912861012"
        );

        ArgumentCaptor<List<Evento>> captor =
                ArgumentCaptor.forClass(List.class);
        verify(eventoRepository).saveAllAndFlush(captor.capture());

        List<Evento> eventos = captor.getValue();

        assertEquals(2, eventos.size());
        assertEquals("TransferênciaOrigem", eventos.get(0).getTipo());
        assertEquals("1291", eventos.get(0).getObjetoId());
        assertEquals(9, eventos.get(0).getVersao());
        assertEquals("TransferênciaDestino", eventos.get(1).getTipo());
        assertEquals("0950", eventos.get(1).getObjetoId());
        assertEquals(8, eventos.get(1).getVersao());
        assertEquals("TransferênciaOrigem", resultado.origem().getTipo());
        assertEquals("TransferênciaDestino", resultado.destino().getTipo());

        verify(eventoPublisher).publicarDepoisDoCommit(eventos.get(0));
        verify(eventoPublisher).publicarDepoisDoCommit(eventos.get(1));
    }

    private EstadoConta estado(
            String numeroConta,
            String cpfCliente,
            String saldo,
            int versao) {

        EstadoConta estado = new EstadoConta(numeroConta);
        estado.setCpfCliente(cpfCliente);
        estado.setCpfGerente("98574307084");
        estado.setSaldo(new BigDecimal(saldo));
        estado.setVersao(versao);
        return estado;
    }
}
