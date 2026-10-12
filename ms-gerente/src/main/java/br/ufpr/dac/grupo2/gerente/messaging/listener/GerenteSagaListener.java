package br.ufpr.dac.grupo2.gerente.messaging.listener;

import java.nio.charset.StandardCharsets;

import br.ufpr.dac.grupo2.gerente.dto.MensagemSaga;
import br.ufpr.dac.grupo2.gerente.dto.response.GerenteResponseDTO;
import br.ufpr.dac.grupo2.gerente.messaging.config.SagaRabbitConfig;
import br.ufpr.dac.grupo2.gerente.messaging.dto.ResultadoSaga;
import br.ufpr.dac.grupo2.gerente.messaging.service.SagaMessagePublisher;
import br.ufpr.dac.grupo2.gerente.service.GerenteService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.GetMapping;

import tools.jackson.databind.ObjectMapper;
import java.util.List;

@Component
public class GerenteSagaListener {

    private static final Logger log = LoggerFactory.getLogger(GerenteSagaListener.class);

    private final ObjectMapper json;
    private final GerenteService command;
    private final SagaMessagePublisher publisher;

    public GerenteSagaListener(ObjectMapper json,
                               GerenteService command,
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
            case "inserir-gerente" -> inserirGerente(cmd);
            case "compensar-inserir-gerente" -> compensarInserirGerente(cmd);
            default -> command.registrarFalha(cmd, "Comando não suportado pelo MS Gerente: " + cmd.tipo());
        };

        publisher.publicar(SagaMessagePublisher.FILA_RESPOSTAS, resultado.resposta());
    }

    private ResultadoSaga inserirGerente(MensagemSaga cmd) {
        try {
            return command.inserirGerente(cmd);
        } catch (Exception e) {
            return command.registrarFalha(cmd, e.getMessage());
        }
    }

    private ResultadoSaga compensarInserirGerente(MensagemSaga cmd) {
        try {
            String cpf = extrairCpfDoPayload(cmd); 
            return command.compensarInserirGerente(cmd, cpf);
        } catch (IllegalArgumentException e) {
            return command.registrarFalha(cmd, e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<GerenteResponseDTO>> listarAtivos() {
        List<GerenteResponseDTO> gerentes = command.listarAtivos();
        return ResponseEntity.ok(gerentes);
    }

    private String extrairCpfDoPayload(MensagemSaga cmd) {
        Object valor = cmd.payload().get("cpf");

        if (!(valor instanceof String cpf) || !cpf.matches("[0-9]{11}")) {
            throw new IllegalArgumentException("Payload deve conter um CPF válido no campo 'cpf'");
        }
        return cpf;
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