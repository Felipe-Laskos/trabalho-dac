package br.ufpr.dac.grupo2.cliente.dto;

import jakarta.validation.constraints.NotBlank;

public class RejeicaoRequestDTO {
    @NotBlank(message = "O motivo é obrigatório")
    private String motivo;

    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
}