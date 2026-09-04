package br.ufpr.dac.grupo2.conta.command.exception;

public class ConflitoDeVersaoException extends RuntimeException {

    public ConflitoDeVersaoException(
            String numero,
            int versao,
            Throwable causa) {
        super(
                "Conflito ao gravar conta " + numero
                        + " na versão " + versao,
                causa
        );
    }
}