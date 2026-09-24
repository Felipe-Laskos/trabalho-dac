package br.ufpr.dac.grupo2.conta.messaging.listener;

import java.nio.charset.StandardCharsets;
import java.util.List;

import br.ufpr.dac.grupo2.conta.command.service.SagaContaTransacional;
import br.ufpr.dac.grupo2.conta.messaging.config.SagaRabbitConfig;
import br.ufpr.dac.grupo2.conta.messaging.dto.ComandoSaga;
import br.ufpr.dac.grupo2.conta.messaging.dto.ResultadoSaga;
import br.ufpr.dac.grupo2.conta.messaging.service.SagaMessagePublisher;
import br.ufpr.dac.grupo2.conta.query.service.EscolhaGerenteService;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class ContaSagaListener {

    private final ObjectMapper json;
    private final SagaContaTransacional command;
    private final EscolhaGerenteService query;
    private final SagaMessagePublisher publisher;

    public ContaSagaListener(ObjectMapper json, SagaContaTransacional command,
            EscolhaGerenteService query, SagaMessagePublisher publisher) {
        this.json = json;
        this.command = command;
        this.query = query;
        this.publisher = publisher;
    }

    @RabbitListener(queues = SagaRabbitConfig.FILA_COMANDOS, concurrency = "1")
    public void receber(Message mensagem) {
        ComandoSaga cmd = json.readValue(new String(
                mensagem.getBody(), StandardCharsets.UTF_8), ComandoSaga.class);
        validarEnvelope(cmd);

        ResultadoSaga resultado = "gerente-com-menos-clientes".equals(cmd.tipo())
                ? escolherGerente(cmd)
                : command.executar(cmd, null);

        if (resultado.evento() != null) {
            publisher.publicar(SagaMessagePublisher.FILA_EVENTOS, resultado.evento());
        }
        publisher.publicar(SagaMessagePublisher.FILA_RESPOSTAS, resultado.resposta());
    }

    private ResultadoSaga escolherGerente(ComandoSaga cmd) {
        try {
            Object valor = cmd.payload().get("cpfsAtivos");
            if (!(valor instanceof List<?> cpfs)
                    || cpfs.stream().anyMatch(cpf -> !(cpf instanceof String))) {
                throw new IllegalArgumentException("cpfsAtivos deve ser uma lista de CPFs");
            }
            String escolhido = query.escolher(cpfs.stream()
                    .map(String.class::cast)
                    .toList());
            return command.executar(cmd, escolhido);
        } catch (IllegalArgumentException e) {
            return command.registrarFalha(cmd, e.getMessage());
        }
    }

    private void validarEnvelope(ComandoSaga cmd) {
        if (cmd == null
                || cmd.sagaId() == null
                || cmd.sagaId().isBlank()
                || cmd.sagaId().length() > 36
                || cmd.tipo() == null
                || cmd.tipo().isBlank()
                || cmd.tipo().length() > 80
                || cmd.payload() == null) {
            throw new IllegalArgumentException("Envelope de SAGA inválido");
        }
    }
}
