package br.ufpr.dac.grupo2.conta.command.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import br.ufpr.dac.grupo2.conta.command.dto.ParteTransferencia;
import br.ufpr.dac.grupo2.conta.command.dto.TransferenciaRequest;
import br.ufpr.dac.grupo2.conta.command.exception.AcessoNegadoException;
import br.ufpr.dac.grupo2.conta.command.exception.ConflitoDeVersaoException;
import br.ufpr.dac.grupo2.conta.command.exception.ContaNaoEncontradaException;
import br.ufpr.dac.grupo2.conta.command.exception.EventoInvalidoException;
import br.ufpr.dac.grupo2.conta.command.model.EstadoConta;
import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.command.repository.EventoRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OperacaoTransacional {

    private final ContaLeituraService leitura;
    private final EventoRepository eventoRepository;
    private final EventoPublisher eventoPublisher;

    public OperacaoTransacional(
            ContaLeituraService leitura,
            EventoRepository eventoRepository,
            EventoPublisher eventoPublisher) {
        this.leitura = leitura;
        this.eventoRepository = eventoRepository;
        this.eventoPublisher = eventoPublisher;
    }

    @Transactional(transactionManager = "commandTransactionManager")
    public Evento depositar(
            String numeroConta,
            String valor,
            String cpfUsuario) {

        EstadoConta estado = leitura.replay(numeroConta);
        validarPosse(estado, cpfUsuario);

        Map<String, Object> payload = Map.of("valor", valor);
        leitura.validar("Depósito", payload, estado);

        Evento evento = novoEvento(
                numeroConta,
                "Depósito",
                payload,
                estado.getVersao() + 1,
                LocalDateTime.now()
        );

        salvarUm(evento);
        eventoPublisher.publicarDepoisDoCommit(evento);
        return evento;
    }

    @Transactional(transactionManager = "commandTransactionManager")
    public Evento sacar(
            String numeroConta,
            String valor,
            String cpfUsuario) {

        EstadoConta estado = leitura.replay(numeroConta);
        validarPosse(estado, cpfUsuario);

        Map<String, Object> payload = Map.of("valor", valor);

        // ContaLeituraService valida o saldo reconstruído pelo replay.
        leitura.validar("Saque", payload, estado);

        Evento evento = novoEvento(
                numeroConta,
                "Saque",
                payload,
                estado.getVersao() + 1,
                LocalDateTime.now()
        );

        salvarUm(evento);
        eventoPublisher.publicarDepoisDoCommit(evento);
        return evento;
    }

    @Transactional(transactionManager = "commandTransactionManager")
    public TransferenciaPersistida transferir(
            String contaOrigem,
            TransferenciaRequest request,
            String cpfUsuario) {

        EstadoConta origem = leitura.replay(contaOrigem);
        validarPosse(origem, cpfUsuario);

        if (contaOrigem.equals(request.contaDestino())) {
            throw new EventoInvalidoException(
                    "Transferência para a própria conta"
            );
        }

        EstadoConta destino;
        try {
            destino = leitura.replay(request.contaDestino());
        } catch (ContaNaoEncontradaException e) {
            throw new EventoInvalidoException(
                    "Conta destino inexistente"
            );
        }

        validarPartesEnriquecidas(
                contaOrigem,
                origem,
                destino,
                request
        );

        Map<String, Object> payload = Map.of(
                "valor", request.valor(),
                "origem", request.origem().comoMap(),
                "destino", request.destino().comoMap()
        );

        leitura.validar(
                "TransferênciaOrigem",
                payload,
                origem
        );
        leitura.validar(
                "TransferênciaDestino",
                payload,
                destino
        );

        LocalDateTime instante = LocalDateTime.now();

        Evento eventoOrigem = novoEvento(
                contaOrigem,
                "TransferênciaOrigem",
                payload,
                origem.getVersao() + 1,
                instante
        );

        Evento eventoDestino = novoEvento(
                request.contaDestino(),
                "TransferênciaDestino",
                payload,
                destino.getVersao() + 1,
                instante
        );

        try {
            eventoRepository.saveAllAndFlush(
                    List.of(eventoOrigem, eventoDestino)
            );
        } catch (DataIntegrityViolationException e) {
            if (!ConflitosDeVersao.ehConflitoDeVersao(e)) {
                throw e;
            }
            throw new ConflitoDeVersaoException(
                    "Conflito de versão durante a transferência",
                    e
            );
        }

        eventoPublisher.publicarDepoisDoCommit(eventoOrigem);
        eventoPublisher.publicarDepoisDoCommit(eventoDestino);

        return new TransferenciaPersistida(
                eventoOrigem,
                eventoDestino,
                request.destino()
        );
    }

    private void validarPosse(
            EstadoConta estado,
            String cpfUsuario) {

        if (!estado.getCpfCliente().equals(cpfUsuario)) {
            throw new AcessoNegadoException();
        }
    }

    private void validarPartesEnriquecidas(
            String contaOrigem,
            EstadoConta origem,
            EstadoConta destino,
            TransferenciaRequest request) {

        ParteTransferencia parteOrigem = request.origem();
        ParteTransferencia parteDestino = request.destino();

        boolean origemInvalida =
                !contaOrigem.equals(parteOrigem.numeroConta())
                || !origem.getCpfCliente().equals(parteOrigem.cpf());

        boolean destinoInvalido =
                !request.contaDestino().equals(
                        parteDestino.numeroConta()
                )
                || !destino.getCpfCliente().equals(
                        parteDestino.cpf()
                );

        if (origemInvalida || destinoInvalido) {
            throw new EventoInvalidoException(
                    "Dados de origem ou destino inconsistentes"
            );
        }
    }

    private Evento novoEvento(
            String numeroConta,
            String tipo,
            Map<String, Object> payload,
            int versao,
            LocalDateTime instante) {

        return new Evento(
                numeroConta,
                tipo,
                payload,
                versao,
                instante
        );
    }

    private void salvarUm(Evento evento) {
        try {
            eventoRepository.saveAndFlush(evento);
        } catch (DataIntegrityViolationException e) {
            if (!ConflitosDeVersao.ehConflitoDeVersao(e)) {
                throw e;
            }
            throw new ConflitoDeVersaoException(
                    evento.getObjetoId(),
                    evento.getVersao(),
                    e
            );
        }
    }

    public record TransferenciaPersistida(
            Evento origem,
            Evento destino,
            ParteTransferencia parteDestino) {
    }
}
