package br.ufpr.dac.grupo2.conta.messaging.listener;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

import br.ufpr.dac.grupo2.conta.command.exception.ContaNaoEncontradaException;
import br.ufpr.dac.grupo2.conta.command.service.SagaContaTransacional;
import br.ufpr.dac.grupo2.conta.messaging.config.SagaRabbitConfig;
import br.ufpr.dac.grupo2.conta.messaging.dto.ComandoSaga;
import br.ufpr.dac.grupo2.conta.messaging.dto.ContaParaTransferir;
import br.ufpr.dac.grupo2.conta.messaging.dto.ResultadoSaga;
import br.ufpr.dac.grupo2.conta.messaging.service.SagaMessagePublisher;
import br.ufpr.dac.grupo2.conta.query.service.EscolhaGerenteService;
import br.ufpr.dac.grupo2.conta.query.service.TransferenciaNovoGerenteService;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class ContaSagaListener {

    private final ObjectMapper json;
    private final SagaContaTransacional command;
    private final EscolhaGerenteService query;
    private final TransferenciaNovoGerenteService transferencia;
    private final SagaMessagePublisher publisher;

    public ContaSagaListener(ObjectMapper json, SagaContaTransacional command,
            EscolhaGerenteService query,
            TransferenciaNovoGerenteService transferencia,
            SagaMessagePublisher publisher) {
        this.json = json;
        this.command = command;
        this.query = query;
        this.transferencia = transferencia;
        this.publisher = publisher;
    }

    @RabbitListener(queues = SagaRabbitConfig.FILA_COMANDOS, concurrency = "1")
    public void receber(Message mensagem) {
        ComandoSaga cmd = json.readValue(new String(
                mensagem.getBody(), StandardCharsets.UTF_8), ComandoSaga.class);
        validarEnvelope(cmd);

        ResultadoSaga resultado = switch (cmd.tipo()) {
            case "gerente-com-menos-clientes" -> escolherGerente(cmd);
            case "conta-a-transferir" -> contaATransferir(cmd);
            case "transferir-contas-do-gerente" -> transferirContas(cmd);
            default -> executar(cmd);
        };

        resultado.eventos().forEach(evento ->
                publisher.publicar(SagaMessagePublisher.FILA_EVENTOS, evento));
        publisher.publicar(SagaMessagePublisher.FILA_RESPOSTAS, resultado.resposta());
    }

    private ResultadoSaga transferirContas(ComandoSaga cmd) {
        try {
            String removido = cpfDoPayload(cmd, "cpfGerente");
            String destino = query.escolher(cpfsDoPayload(cmd, "cpfsAtivos"));
            return command.transferirContasDoGerente(cmd, removido, destino);
        } catch (IllegalArgumentException e) {
            return command.registrarFalha(cmd, e.getMessage());
        }
    }

    private ResultadoSaga executar(ComandoSaga cmd) {
        try {
            return command.executar(cmd, null);
        } catch (ContaNaoEncontradaException e) {
            return command.registrarFalha(cmd, e.getMessage());
        }
    }

    private ResultadoSaga escolherGerente(ComandoSaga cmd) {
        try {
            String escolhido = query.escolher(
                    cpfsDoPayload(cmd, "cpfsAtivos"));
            return command.executar(cmd, escolhido);
        } catch (IllegalArgumentException e) {
            return command.registrarFalha(cmd, e.getMessage());
        }
    }

    private ResultadoSaga contaATransferir(ComandoSaga cmd) {
        try {
            String cpfNovoGerente = cpfDoPayload(cmd, "cpfGerente");
            Optional<ContaParaTransferir> escolhida =
                    transferencia.escolher(cpfNovoGerente);
            return command.registrarSelecaoTransferencia(cmd, escolhida);
        } catch (IllegalArgumentException e) {
            return command.registrarFalha(cmd, e.getMessage());
        }
    }

    private List<String> cpfsDoPayload(ComandoSaga cmd, String campo) {
        Object valor = cmd.payload().get(campo);
        if (!(valor instanceof List<?> cpfs)
                || cpfs.stream().anyMatch(cpf -> !(cpf instanceof String))) {
            throw new IllegalArgumentException(
                    campo + " deve ser uma lista de CPFs");
        }
        return cpfs.stream().map(String.class::cast).toList();
    }

    private String cpfDoPayload(ComandoSaga cmd, String campo) {
        Object valor = cmd.payload().get(campo);
        if (!(valor instanceof String cpf) || !cpf.matches("[0-9]{11}")) {
            throw new IllegalArgumentException("CPF inválido: " + campo);
        }
        return cpf;
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
