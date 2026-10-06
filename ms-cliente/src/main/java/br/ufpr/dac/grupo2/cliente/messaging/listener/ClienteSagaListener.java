package br.ufpr.dac.grupo2.cliente.messaging.listener;

import java.nio.charset.StandardCharsets;
import java.util.List;

import br.ufpr.dac.grupo2.cliente.exception.ClienteNaoEncontradoException;
import br.ufpr.dac.grupo2.cliente.messaging.config.SagaRabbitConfig;
import br.ufpr.dac.grupo2.cliente.messaging.dto.ComandoSaga;
import br.ufpr.dac.grupo2.cliente.messaging.dto.ResultadoSaga;
import br.ufpr.dac.grupo2.cliente.messaging.service.SagaMessagePublisher;
import br.ufpr.dac.grupo2.cliente.service.ClienteService;

import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper; 

@Component
public class ClienteSagaListener {

    private final ObjectMapper json;
    private final ClienteService command;
    private final SagaMessagePublisher publisher;

    public ClienteSagaListener(ObjectMapper json,
                               ClienteService command,
                               SagaMessagePublisher publisher) {
        this.json = json;
        this.command = command;
        this.publisher = publisher;
    }

    @RabbitListener(queues = SagaRabbitConfig.FILA_COMANDOS, concurrency = "1")
    public void receber(Message mensagem) {
        ComandoSaga cmd;
        try {
            cmd = json.readValue(new String(mensagem.getBody(), StandardCharsets.UTF_8), ComandoSaga.class);
            validarEnvelope(cmd);
        } catch (Exception e) {
            return;
        }

        ResultadoSaga resultado = switch (cmd.tipo()) {
            case "obter-clientes-por-cpf" -> clientePorCpf(cmd);
            default -> executar(cmd);
        };

        if (resultado.evento() != null) {
            publisher.publicar(SagaMessagePublisher.FILA_EVENTOS, resultado.evento());
        }
        publisher.publicar(SagaMessagePublisher.FILA_RESPOSTAS, resultado.resposta());
    }

    private ResultadoSaga executar(ComandoSaga cmd) {
        try {
            return command.executar(cmd, null);
        } catch (ClienteNaoEncontradoException e) {
            return command.registrarFalha(cmd, e.getMessage());
        }
    }

    private ResultadoSaga clientePorCpf(ComandoSaga cmd) {
        try {
            List<String> cpfs = cpfsDoPayload(cmd);
            return command.executar(cmd, cpfs);
        } catch (IllegalArgumentException e) {
            return command.registrarFalha(cmd, e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> cpfsDoPayload(ComandoSaga cmd) {
        Object valor = cmd.payload().get("cpfs");
        
        if (!(valor instanceof List<?> lista) || lista.isEmpty()) {
            throw new IllegalArgumentException("Payload deve conter uma lista não vazia de CPFs no campo 'cpfs'");
        }

        List<String> cpfs = (List<String>) lista;
        for (String cpf : cpfs) {
            if (cpf == null || !cpf.matches("[0-9]{11}")) {
                throw new IllegalArgumentException("CPF inválido na lista: " + cpf);
            }
        }

        return cpfs;
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