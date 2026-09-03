package br.ufpr.dac.grupo2.conta.command.exception;

public class ContaNaoEncontradaException extends RuntimeException {

    public ContaNaoEncontradaException(String numero) {
        super("Conta não encontrada: " + numero);
    }
}