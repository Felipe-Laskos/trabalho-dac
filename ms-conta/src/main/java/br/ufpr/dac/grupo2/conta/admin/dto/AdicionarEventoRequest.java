package br.ufpr.dac.grupo2.conta.admin.dto;

import java.util.Map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AdicionarEventoRequest(
        @NotBlank String objetoId,
        @NotBlank String tipo,
        @NotNull Map<String, Object> payload) {
}
