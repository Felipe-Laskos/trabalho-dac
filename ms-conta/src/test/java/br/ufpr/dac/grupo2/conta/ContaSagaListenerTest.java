package br.ufpr.dac.grupo2.conta;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import br.ufpr.dac.grupo2.conta.command.service.SagaContaTransacional;
import br.ufpr.dac.grupo2.conta.messaging.dto.ComandoSaga;
import br.ufpr.dac.grupo2.conta.messaging.dto.EventoPublicado;
import br.ufpr.dac.grupo2.conta.messaging.dto.ResultadoSaga;
import br.ufpr.dac.grupo2.conta.messaging.listener.ContaSagaListener;
import br.ufpr.dac.grupo2.conta.messaging.service.SagaMessagePublisher;
import br.ufpr.dac.grupo2.conta.query.service.EscolhaGerenteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
class ContaSagaListenerTest {

    @Mock
    private SagaContaTransacional command;

    @Mock
    private EscolhaGerenteService query;

    @Mock
    private SagaMessagePublisher publisher;

    private ObjectMapper json;
    private ContaSagaListener listener;

    @BeforeEach
    void preparar() {
        json = JsonMapper.builder().findAndAddModules().build();
        listener = new ContaSagaListener(json, command, query, publisher);
    }

    @Test
    void escolheGerenteEPublicaResposta() {
        String sagaId = "saga-gerente";
        List<String> ativos = List.of("98574307084", "40501740066");
        ComandoSaga cmd = comando(sagaId, "gerente-com-menos-clientes",
                Map.of("cpfsAtivos", ativos));
        ResultadoSaga resultado = sucesso(cmd,
                Map.of("cpfGerente", "40501740066"), null);

        when(query.escolher(ativos)).thenReturn("40501740066");
        when(command.executar(cmd, "40501740066")).thenReturn(resultado);

        listener.receber(mensagem(cmd));

        verify(command).executar(cmd, "40501740066");
        verify(publisher).publicar(SagaMessagePublisher.FILA_RESPOSTAS,
                resultado.resposta());
        verify(publisher, never()).publicar(
                SagaMessagePublisher.FILA_EVENTOS, null);
    }

    @Test
    void criarContaPublicaEventoEResposta() {
        ComandoSaga cmd = comando("saga-criacao", "criar-conta", Map.of(
                "cpfCliente", "12345678901",
                "cpfGerente", "40501740066"));
        EventoPublicado evento = new EventoPublicado(1L, "0042", "Criado",
                Map.of("saldoInicial", "0.00", "cpfGerente", "40501740066"),
                1, LocalDateTime.of(2026, 9, 22, 10, 0));
        ResultadoSaga resultado = sucesso(cmd, Map.of("numeroConta", "0042"), evento);
        when(command.executar(cmd, null)).thenReturn(resultado);

        listener.receber(mensagem(cmd));

        verify(publisher).publicar(SagaMessagePublisher.FILA_EVENTOS, evento);
        verify(publisher).publicar(SagaMessagePublisher.FILA_RESPOSTAS,
                resultado.resposta());
    }

    @Test
    void listaInvalidaGeraRespostaDeFalhaDeduplicavel() {
        ComandoSaga cmd = comando("saga-invalida", "gerente-com-menos-clientes",
                Map.of("cpfsAtivos", List.of()));
        ResultadoSaga falha = new ResultadoSaga(new ResultadoSaga.Resposta(
                cmd.sagaId(), cmd.tipo(), cmd.timestamp(), Map.of(),
                "FALHA", "Lista de CPFs ativos inválida"), null);
        when(query.escolher(List.of()))
                .thenThrow(new IllegalArgumentException("Lista de CPFs ativos inválida"));
        when(command.registrarFalha(cmd, "Lista de CPFs ativos inválida"))
                .thenReturn(falha);

        listener.receber(mensagem(cmd));

        verify(command).registrarFalha(cmd, "Lista de CPFs ativos inválida");
        verify(publisher).publicar(SagaMessagePublisher.FILA_RESPOSTAS,
                falha.resposta());
        verify(command, never()).executar(cmd, null);
    }

    @Test
    void envelopeInvalidoVaiParaTratamentoDoContainer() {
        ComandoSaga cmd = comando("", "criar-conta", Map.of());

        assertThrows(IllegalArgumentException.class,
                () -> listener.receber(mensagem(cmd)));

        verifyNoInteractions(command, query, publisher);
    }

    private ComandoSaga comando(String sagaId, String tipo, Map<String, Object> payload) {
        return new ComandoSaga(sagaId, tipo, "2026-09-22T10:00:00", payload);
    }

    private ResultadoSaga sucesso(ComandoSaga cmd, Map<String, Object> payload,
            EventoPublicado evento) {
        return new ResultadoSaga(new ResultadoSaga.Resposta(
                cmd.sagaId(), cmd.tipo(), cmd.timestamp(), payload,
                "SUCESSO", null), evento);
    }

    private Message mensagem(ComandoSaga cmd) {
        return MessageBuilder.withBody(json.writeValueAsBytes(cmd)).build();
    }
}
