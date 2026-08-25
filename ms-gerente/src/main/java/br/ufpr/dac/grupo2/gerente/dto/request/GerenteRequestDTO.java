package br.ufpr.dac.grupo2.gerente.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GerenteRequestDTO {

    @NotBlank(message = "O CPF é obrigatório.")
    @Pattern(regexp = "\\d{11}", message = "O CPF deve conter exatamente 11 dígitos.")
    private String cpf;

    @NotBlank(message = "O nome é obrigatório.")
    @Size(max = 120, message = "O nome pode ter no máximo 120 caracteres.")
    private String nome;

    @NotBlank(message = "O e-mail é obrigatório.")
    @Email(message = "O e-mail deve ser válido.")
    @Size(max = 120, message = "O e-mail pode ter no máximo 120 caracteres.")
    private String email;

    @NotBlank(message = "O telefone é obrigatório.")
    @Size(max = 20, message = "O telefone pode ter no máximo 20 caracteres.")
    private String telefone;
}
