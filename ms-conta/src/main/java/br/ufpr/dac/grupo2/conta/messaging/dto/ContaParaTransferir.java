package br.ufpr.dac.grupo2.conta.messaging.dto;

public record ContaParaTransferir(
        String numeroConta,
        String cpfCliente,
        String cpfGerenteAnterior) {
}
