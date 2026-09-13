package br.ufpr.dac.grupo2.conta.query.exception;

public class EventoForaDeOrdemException extends RuntimeException {

    public EventoForaDeOrdemException(
            String numero,
            int esperada,
            int recebida) {
        super(
                "Evento fora de ordem para a conta " + numero
                        + ": esperada versão " + esperada
                        + ", recebida " + recebida
        );
    }
}