package br.ufpr.dac.grupo2.conta.command.dto;

import jakarta.validation.constraints.NotBlank;

public record ValorRequest(
        @NotBlank(message = "valor é obrigatório")
        String valor) {
}