package br.ufpr.dac.grupo2.cliente.messaging.listener;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import br.ufpr.dac.grupo2.cliente.dto.MensagemSaga;
import br.ufpr.dac.grupo2.cliente.messaging.config.SagaRabbitConfig;
import br.ufpr.dac.grupo2.cliente.messaging.dto.ResultadoSaga;
import br.ufpr.dac.grupo2.cliente.messaging.service.SagaMessagePublisher;
import br.ufpr.dac.grupo2.cliente.service.ClienteService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

@Component
public class ClienteSagaListener {

    private static final Logger log = LoggerFactory.getLogger(ClienteSagaListener.class);

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
        MensagemSaga cmd;
        try {
            cmd = json.readValue(new String(mensagem.getBody(), StandardCharsets.UTF_8), MensagemSaga.class);
            validarEnvelope(cmd);
        } catch (Exception e) {
            log.warn("comando descartado em {}: {}", SagaRabbitConfig.FILA_COMANDOS, e.getMessage());
            return;
        }

        ResultadoSaga resultado = switch (cmd.tipo()) {
            case "obter-clientes-por-cpf" -> clientePorCpf(cmd);
            default -> command.registrarFalha(cmd, "Comando não suportado pelo MS Cliente: " + cmd.tipo());
        };

        publisher.publicar(SagaMessagePublisher.FILA_RESPOSTAS, resultado.resposta());
    }

    private ResultadoSaga clientePorCpf(MensagemSaga cmd) {
        try {
            List<String> cpfs = cpfsDoPayload(cmd);
            return command.executar(cmd, cpfs);
        } catch (IllegalArgumentException e) {
            return command.registrarFalha(cmd, e.getMessage());
        }
    }

    private List<String> cpfsDoPayload(MensagemSaga cmd) {
        Object valor = cmd.payload().get("cpfs");

        if (!(valor instanceof List<?> lista) || lista.isEmpty()) {
            throw new IllegalArgumentException("Payload deve conter uma lista não vazia de CPFs no campo 'cpfs'");
        }

        List<String> cpfs = new ArrayList<>();
        for (Object item : lista) {
            if (!(item instanceof String cpf) || !cpf.matches("[0-9]{11}")) {
                throw new IllegalArgumentException("CPF inválido na lista: " + item);
            }
            cpfs.add(cpf);
        }

        return cpfs;
    }

    private void validarEnvelope(MensagemSaga cmd) {
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