package br.ufpr.dac.grupo2.gerente.dto.request;

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
public class GerenteUpdateRequestDTO {

    @NotBlank(message = "O nome é obrigatório.")
    @Size(max = 120, message = "O nome pode ter no máximo 120 caracteres.")
    private String nome;

    @NotBlank(message = "O telefone é obrigatório.")
    @Size(max = 20, message = "O telefone pode ter no máximo 20 caracteres.")
    private String telefone;

    private String cpf;
    private String email;
}
