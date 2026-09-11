package br.ufpr.dac.grupo2.conta.command.dto;

import java.util.Map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ParteTransferencia(
        @NotBlank
        @Pattern(regexp = "\\d{4}")
        String numeroConta,

        @NotBlank
        @Pattern(regexp = "\\d{11}")
        String cpf,

        @NotBlank
        String nome) {

    public Map<String, Object> comoMap() {
        return Map.of(
                "numeroConta", numeroConta,
                "cpf", cpf,
                "nome", nome
        );
    }
}