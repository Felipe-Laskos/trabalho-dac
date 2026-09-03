package br.ufpr.dac.grupo2.conta.query.listener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import br.ufpr.dac.grupo2.conta.command.dto.EventoPublicado;
import br.ufpr.dac.grupo2.conta.query.exception.EventoForaDeOrdemException;
import br.ufpr.dac.grupo2.conta.query.model.ContaQuery;
import br.ufpr.dac.grupo2.conta.query.model.Movimentacao;
import br.ufpr.dac.grupo2.conta.query.repository.ContaQueryRepository;
import br.ufpr.dac.grupo2.conta.query.repository.MovimentacaoRepository;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ProjecaoContaListener {

    private final ObjectMapper objectMapper;
    private final ContaQueryRepository contaRepository;
    private final MovimentacaoRepository movimentacaoRepository;

    public ProjecaoContaListener(
            ObjectMapper objectMapper,
            ContaQueryRepository contaRepository,
            MovimentacaoRepository movimentacaoRepository) {
        this.objectMapper = objectMapper;
        this.contaRepository = contaRepository;
        this.movimentacaoRepository = movimentacaoRepository;
    }

    @RabbitListener(
            queues = "ms.conta.events",
            concurrency = "1"
    )
    @Transactional(transactionManager = "queryTransactionManager")
    public void projetar(String mensagem)
            throws JacksonException {

        EventoPublicado evento = objectMapper.readValue(
                mensagem,
                EventoPublicado.class
        );

        // barreira 1: movimentação já gravada.
        if (movimentacaoRepository.existsByEventoId(evento.id())) {
            return;
        }

        ContaQuery conta = contaRepository
                .findById(evento.objetoId())
                .orElse(null);

        // barreira 2: evento antigo ou repetido.
        if (conta != null
                && evento.versao() <= conta.getUltimaVersao()) {
            return;
        }

        if (evento.tipo().equals("Criado")) {
            projetarCriacao(evento, conta);
            return;
        }

        if (conta == null) {
            throw new EventoForaDeOrdemException(
                    evento.objetoId(),
                    1,
                    evento.versao()
            );
        }

        int proximaVersao = conta.getUltimaVersao() + 1;

        if (evento.versao() != proximaVersao) {
            throw new EventoForaDeOrdemException(
                    evento.objetoId(),
                    proximaVersao,
                    evento.versao()
            );
        }

        aplicar(evento, conta);
        conta.setUltimaVersao(evento.versao());
        contaRepository.save(conta);
    }

    private void projetarCriacao(
            EventoPublicado evento,
            ContaQuery existente) {

        if (existente != null) {
            return;
        }

        if (evento.versao() != 1) {
            throw new EventoForaDeOrdemException(
                    evento.objetoId(),
                    1,
                    evento.versao()
            );
        }

        Map<String, Object> payload = evento.payload();

        ContaQuery nova = new ContaQuery(
                evento.objetoId(),
                texto(payload, "cpfCliente"),
                texto(payload, "cpfGerente"),
                LocalDate.parse(texto(payload, "dataCriacao")),
                dinheiro(payload, "saldoInicial"),
                evento.versao()
        );

        contaRepository.save(nova);
    }

    private void aplicar(
            EventoPublicado evento,
            ContaQuery conta) {

        switch (evento.tipo()) {
            case "Depósito" -> {
                conta.somar(dinheiro(evento.payload()));
                movimentacaoRepository.save(
                        criarMovimentacao(
                                evento,
                                conta,
                                "DEPOSITO"
                        )
                );
            }

            case "Saque" -> {
                conta.subtrair(dinheiro(evento.payload()));
                movimentacaoRepository.save(
                        criarMovimentacao(
                                evento,
                                conta,
                                "SAQUE"
                        )
                );
            }

            case "TransferênciaOrigem" -> {
                conta.subtrair(dinheiro(evento.payload()));
                movimentacaoRepository.save(
                        criarMovimentacao(
                                evento,
                                conta,
                                "TRANSFERENCIA"
                        )
                );
            }

            case "TransferênciaDestino" -> {
                conta.somar(dinheiro(evento.payload()));
                movimentacaoRepository.save(
                        criarMovimentacao(
                                evento,
                                conta,
                                "TRANSFERENCIA"
                        )
                );
            }

            case "GerenteAlterado" ->
                    conta.setCpfGerente(
                            texto(evento.payload(), "cpfGerente")
                    );

            default -> throw new IllegalArgumentException(
                    "Tipo de evento desconhecido: "
                            + evento.tipo()
            );
        }
    }

    private Movimentacao criarMovimentacao(
            EventoPublicado evento,
            ContaQuery conta,
            String tipo) {

        Map<String, Object> origem = parte(
                evento.payload(),
                "origem"
        );

        Map<String, Object> destino = parte(
                evento.payload(),
                "destino"
        );

        return new Movimentacao(
                evento.id(),
                evento.objetoId(),
                evento.timestamp(),
                tipo,
                dinheiro(evento.payload()),
                conta.getSaldo(),
                textoOpcional(origem, "numeroConta"),
                textoOpcional(origem, "cpf"),
                textoOpcional(origem, "nome"),
                textoOpcional(destino, "numeroConta"),
                textoOpcional(destino, "cpf"),
                textoOpcional(destino, "nome")
        );
    }

    private BigDecimal dinheiro(Map<String, Object> payload) {
        return dinheiro(payload, "valor");
    }

    private BigDecimal dinheiro(
            Map<String, Object> payload,
            String campo) {
        return new BigDecimal(texto(payload, campo));
    }

    private String texto(
            Map<String, Object> payload,
            String campo) {

        Object valor = payload.get(campo);

        if (!(valor instanceof String texto)
                || texto.isBlank()) {
            throw new IllegalArgumentException(
                    "Campo inválido no evento: " + campo
            );
        }

        return texto;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parte(
            Map<String, Object> payload,
            String campo) {

        Object valor = payload.get(campo);

        if (valor == null) {
            return Map.of();
        }

        if (!(valor instanceof Map<?, ?>)) {
            throw new IllegalArgumentException(
                    "Parte inválida no evento: " + campo
            );
        }

        return (Map<String, Object>) valor;
    }

    private String textoOpcional(
            Map<String, Object> mapa,
            String campo) {

        Object valor = mapa.get(campo);
        return valor == null ? null : valor.toString();
    }
}