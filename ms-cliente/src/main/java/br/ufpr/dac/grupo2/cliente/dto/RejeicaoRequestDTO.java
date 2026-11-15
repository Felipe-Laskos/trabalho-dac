package br.ufpr.dac.grupo2.cliente.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RejeicaoRequestDTO {
    @NotBlank(message = "O motivo é obrigatório")
    @Size(max = 255, message = "O motivo tem no máximo 255 caracteres")
    private String motivo;

    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
}
