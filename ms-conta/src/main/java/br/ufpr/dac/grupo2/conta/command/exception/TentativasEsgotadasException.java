package br.ufpr.dac.grupo2.conta.command.exception;

public class TentativasEsgotadasException
        extends RuntimeException {

    public TentativasEsgotadasException(
            int tentativas,
            Throwable causa) {
        super(
                "Não foi possível concluir a operação após "
                        + tentativas + " tentativas",
                causa
        );
    }
}