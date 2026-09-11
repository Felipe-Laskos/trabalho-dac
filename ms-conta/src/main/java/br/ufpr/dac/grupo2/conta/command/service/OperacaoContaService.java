package br.ufpr.dac.grupo2.conta.command.service;

import java.util.function.Supplier;

import br.ufpr.dac.grupo2.conta.command.dto.OperacaoRealizada;
import br.ufpr.dac.grupo2.conta.command.dto.TransferenciaRequest;
import br.ufpr.dac.grupo2.conta.command.exception.ConflitoDeVersaoException;
import br.ufpr.dac.grupo2.conta.command.exception.TentativasEsgotadasException;
import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.command.service.OperacaoTransacional.TransferenciaPersistida;
import org.springframework.stereotype.Service;

@Service
public class OperacaoContaService {

    private static final int MAX_TENTATIVAS = 4;

    private final OperacaoTransacional transacao;

    public OperacaoContaService(
            OperacaoTransacional transacao) {
        this.transacao = transacao;
    }

    public OperacaoRealizada depositar(
            String numeroConta,
            String valor,
            String cpfUsuario) {

        Evento evento = repetir(() -> transacao.depositar(
                numeroConta,
                valor,
                cpfUsuario
        ));

        return OperacaoRealizada.de(
                evento,
                "DEPOSITO",
                valor,
                null
        );
    }

    public OperacaoRealizada sacar(
            String numeroConta,
            String valor,
            String cpfUsuario) {

        Evento evento = repetir(() -> transacao.sacar(
                numeroConta,
                valor,
                cpfUsuario
        ));

        return OperacaoRealizada.de(
                evento,
                "SAQUE",
                valor,
                null
        );
    }

    public OperacaoRealizada transferir(
            String contaOrigem,
            TransferenciaRequest request,
            String cpfUsuario) {

        TransferenciaPersistida resultado = repetir(
                () -> transacao.transferir(
                        contaOrigem,
                        request,
                        cpfUsuario
                )
        );

        return OperacaoRealizada.de(
                resultado.origem(),
                "TRANSFERENCIA",
                request.valor(),
                resultado.parteDestino()
        );
    }

    private <T> T repetir(Supplier<T> operacao) {
        ConflitoDeVersaoException ultimoConflito = null;

        for (int tentativa = 1;
                tentativa <= MAX_TENTATIVAS;
                tentativa++) {
            try {
                return operacao.get();
            } catch (ConflitoDeVersaoException e) {
                ultimoConflito = e;
            }
        }

        throw new TentativasEsgotadasException(
                MAX_TENTATIVAS,
                ultimoConflito
        );
    }
}