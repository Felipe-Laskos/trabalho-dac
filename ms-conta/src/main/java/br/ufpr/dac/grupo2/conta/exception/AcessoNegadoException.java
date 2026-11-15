package br.ufpr.dac.grupo2.conta.exception;

public class AcessoNegadoException extends RuntimeException {
    public AcessoNegadoException() {
        super("A conta pertence a outro cliente");
    }
}
