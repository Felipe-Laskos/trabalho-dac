package br.ufpr.dac.grupo2.gerente.messaging.listener;

import java.nio.charset.StandardCharsets;

import br.ufpr.dac.grupo2.gerente.dto.MensagemSaga;
import br.ufpr.dac.grupo2.gerente.messaging.config.SagaRabbitConfig;
import br.ufpr.dac.grupo2.gerente.messaging.dto.ResultadoSaga;
import br.ufpr.dac.grupo2.gerente.messaging.service.SagaMessagePublisher;
import br.ufpr.dac.grupo2.gerente.service.GerenteService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

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
            case "listar-ativos" -> command.listarAtivosSaga(cmd);
            case "inativar-gerente" -> inativarGerente(cmd);
            case "compensar-inativar-gerente" -> compensarInativarGerente(cmd);
            default -> command.registrarFalha(cmd, "Comando não suportado pelo MS Gerente: " + cmd.tipo());
        };

        publisher.publicar(SagaMessagePublisher.FILA_RESPOSTAS, resultado.resposta());
    }

    private ResultadoSaga inserirGerente(MensagemSaga cmd) {
        try {
            validarDadosGerente(cmd);
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

    private String extrairCpfDoPayload(MensagemSaga cmd) {
        Object valor = cmd.payload().get("cpf");

        if (!(valor instanceof String cpf) || !cpf.matches("[0-9]{11}")) {
            throw new IllegalArgumentException("Payload deve conter um CPF válido no campo 'cpf'");
        }
        return cpf;
    }

    private void validarDadosGerente(MensagemSaga cmd) {
        String cpf = cmd.texto("cpf");
        if (cpf == null || !cpf.matches("[0-9]{11}")) {
            throw new IllegalArgumentException("O CPF deve conter exatamente 11 dígitos.");
        }
        String nome = cmd.texto("nome");
        if (nome == null || nome.isBlank()) {
            throw new IllegalArgumentException("O nome é obrigatório.");
        }
        String email = cmd.texto("email");
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("O e-mail deve ser válido.");
        }
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

    private ResultadoSaga inativarGerente(MensagemSaga cmd) {
        try {
            return command.inativarGerente(cmd);
        } catch (Exception e) {
            return command.registrarFalha(cmd, e.getMessage());
        }
    }

    private ResultadoSaga compensarInativarGerente(MensagemSaga cmd) {
        try {
            String cpf = extrairCpfDoPayload(cmd); 
            return command.compensarInativarGerente(cmd, cpf);
        } catch (Exception e) {
            return command.registrarFalha(cmd, e.getMessage());
        }
    }
}
