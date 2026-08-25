package br.ufpr.dac.grupo2.cliente.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EnderecoDTO {

    @NotBlank(message = "O logradouro é obrigatório.")
    @Size(max = 120, message = "O logradouro pode ter no máximo 120 caracteres.")
    private String logradouro;

    @NotBlank(message = "O número é obrigatório.")
    @Size(max = 10, message = "O número pode ter no máximo 10 caracteres.")
    private String numero;

    @Size(max = 60, message = "O complemento pode ter no máximo 60 caracteres.")
    private String complemento;

    @NotBlank(message = "O CEP é obrigatório.")
    @Size(min = 8, max = 8, message = "O CEP deve conter exatamente 8 dígitos.")
    private String cep;

    @NotBlank(message = "A cidade é obrigatória.")
    @Size(max = 80, message = "A cidade pode ter no máximo 80 caracteres.")
    private String cidade;

    @NotBlank(message = "A UF é obrigatória.")
    @Size(min = 2, max = 2, message = "A UF deve conter exatamente 2 caracteres.")
    private String uf;
}
