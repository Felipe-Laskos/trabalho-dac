package br.ufpr.dac.grupo2.conta.command.model;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EstadoConta {

    private final String numero;
    private String cpfCliente;
    private String cpfGerente;
    private BigDecimal saldo = BigDecimal.ZERO;
    private int versao;

    public EstadoConta(String numero) {
        this.numero = numero;
    }
}