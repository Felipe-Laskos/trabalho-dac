package br.ufpr.dac.grupo2.conta.command.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record TransferenciaRequest(
        @NotBlank
        @Pattern(regexp = "\\d{4}")
        String contaDestino,

        @NotBlank(message = "valor é obrigatório")
        @Pattern(regexp = "\\d+(\\.\\d{1,2})?")
        @DecimalMin(value = "0", inclusive = false)
        String valor,

        @Valid
        @NotNull
        ParteTransferencia origem,

        @Valid
        @NotNull
        ParteTransferencia destino) {
}