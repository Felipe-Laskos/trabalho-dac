package br.ufpr.dac.grupo2.conta.exception;

public class EventoInvalidoException extends RuntimeException {
    public EventoInvalidoException(String mensagem) {
        super(mensagem);
    }
}
