package br.ufpr.dac.grupo2.conta.admin.dto;

import br.ufpr.dac.grupo2.conta.command.model.EstadoConta;
import java.math.RoundingMode;

public record ReplayContaDTO(
        String numero,
        String cpfCliente,
        String cpfGerente,
        String saldo,
        int versao) {

    public static ReplayContaDTO de(EstadoConta estado) {
        // O banco conserva quatro casas; a API publica duas com arredondamento HALF_UP.
        return new ReplayContaDTO(
                estado.getNumero(),
                estado.getCpfCliente(),
                estado.getCpfGerente(),
                estado.getSaldo().setScale(2, RoundingMode.HALF_UP).toPlainString(),
                estado.getVersao());
    }
}
