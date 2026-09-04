package br.ufpr.dac.grupo2.conta.command.service;

import br.ufpr.dac.grupo2.conta.command.exception.ContaNaoEncontradaException;
import br.ufpr.dac.grupo2.conta.command.exception.EventoInvalidoException;
import br.ufpr.dac.grupo2.conta.command.model.EstadoConta;
import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.command.repository.EventoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ContaLeituraService {

    private static final Set<String> EVENTOS_COM_DINHEIRO = Set.of(
            "Depósito",
            "Saque",
            "TransferênciaOrigem",
            "TransferênciaDestino"
    );

    private final EventoRepository eventoRepository;

    public ContaLeituraService(EventoRepository eventoRepository) {
        this.eventoRepository = eventoRepository;
    }

    @Transactional(
            transactionManager = "commandTransactionManager",
            readOnly = true
    )
    public EstadoConta replay(String numeroConta) {
        List<Evento> eventos = eventoRepository
                .findByObjetoIdOrderByVersaoAsc(numeroConta);

        if (eventos.isEmpty()) {
            throw new ContaNaoEncontradaException(numeroConta);
        }

        return fold(numeroConta, eventos);
    }

    public void validar(
            String tipo,
            Map<String, Object> payload,
            EstadoConta estado) {

        if (EVENTOS_COM_DINHEIRO.contains(tipo)) {
            BigDecimal valor = dinheiro(payload);

            if (valor.signum() <= 0) {
                throw new EventoInvalidoException(
                        "O valor deve ser maior que zero"
                );
            }

            if ((tipo.equals("Saque")
                    || tipo.equals("TransferênciaOrigem"))
                    && estado.getSaldo().compareTo(valor) < 0) {
                throw new EventoInvalidoException(
                        "Saldo insuficiente"
                );
            }

            if (tipo.startsWith("Transferência")) {
                Map<String, Object> origem = parte(payload, "origem");
                Map<String, Object> destino = parte(payload, "destino");

                texto(origem, "numeroConta");
                texto(origem, "cpf");
                texto(origem, "nome");
                texto(destino, "numeroConta");
                texto(destino, "cpf");
                texto(destino, "nome");
            }
        } else if (tipo.equals("GerenteAlterado")) {
            texto(payload, "cpfGerente");
        } else {
            throw new EventoInvalidoException(
                    "Tipo não permitido no append: " + tipo
            );
        }
    }

    private EstadoConta fold(
            String numeroConta,
            List<Evento> eventos) {

        EstadoConta estado = new EstadoConta(numeroConta);
        int versaoEsperada = 1;

        for (Evento evento : eventos) {
            if (evento.getVersao() != versaoEsperada) {
                throw new EventoInvalidoException(
                        "Sequência inválida na conta " + numeroConta
                                + ": esperada versão " + versaoEsperada
                                + ", recebida " + evento.getVersao()
                );
            }

            aplicar(estado, evento);
            estado.setVersao(evento.getVersao());
            versaoEsperada++;
        }

        return estado;
    }

    private void aplicar(
            EstadoConta estado,
            Evento evento) {

        Map<String, Object> payload = evento.getPayload();

        switch (evento.getTipo()) {
            case "Criado" -> {
                estado.setCpfCliente(
                        texto(payload, "cpfCliente")
                );
                estado.setCpfGerente(
                        texto(payload, "cpfGerente")
                );
                estado.setSaldo(
                        dinheiro(payload, "saldoInicial")
                );
            }

            case "Depósito", "TransferênciaDestino" ->
                    estado.setSaldo(
                            estado.getSaldo().add(dinheiro(payload))
                    );

            case "Saque", "TransferênciaOrigem" ->
                    estado.setSaldo(
                            estado.getSaldo().subtract(dinheiro(payload))
                    );

            case "GerenteAlterado" ->
                    estado.setCpfGerente(
                            texto(payload, "cpfGerente")
                    );

            default -> throw new EventoInvalidoException(
                    "Tipo de evento desconhecido: "
                            + evento.getTipo()
            );
        }
    }

    private BigDecimal dinheiro(Map<String, Object> payload) {
        return dinheiro(payload, "valor");
    }

    private BigDecimal dinheiro(
            Map<String, Object> payload,
            String campo) {

        Object valor = payload.get(campo);

        if (!(valor instanceof String texto)) {
            throw new EventoInvalidoException(
                    "Dinheiro no campo " + campo
                            + " deve ser String"
            );
        }

        try {
            return new BigDecimal(texto);
        } catch (NumberFormatException e) {
            throw new EventoInvalidoException(
                    "Valor monetário inválido: " + texto
            );
        }
    }

    private String texto(
            Map<String, Object> payload,
            String campo) {

        Object valor = payload.get(campo);

        if (!(valor instanceof String texto)
                || texto.isBlank()) {
            throw new EventoInvalidoException(
                    "Campo obrigatório inválido: " + campo
            );
        }

        return texto;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parte(
            Map<String, Object> payload,
            String campo) {

        Object valor = payload.get(campo);

        if (!(valor instanceof Map<?, ?> mapa)
                || mapa.keySet().stream()
                        .anyMatch(chave -> !(chave instanceof String))) {
            throw new EventoInvalidoException(
                    "Campo obrigatório inválido: " + campo
            );
        }

        return (Map<String, Object>) valor;
    }
}
