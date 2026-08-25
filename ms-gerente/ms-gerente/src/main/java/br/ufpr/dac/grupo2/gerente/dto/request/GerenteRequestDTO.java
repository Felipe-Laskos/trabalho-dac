package br.ufpr.dac.grupo2.gerente.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record GerenteRequestDTO(

    @NotBlank(message = "O CPF é obrigatório.")
    @Size(min = 11, max = 11, message = "O CPF deve conter exatamente 11 dígitos.")
    String cpf,

    @NotBlank(message = "O nome é obrigatório.")
    @Size(max = 120, message = "O nome pode ter no máximo 120 caracteres.")
    String nome,

    @NotBlank(message = "O e-mail é obrigatório.")
    @Email(message = "O e-mail deve ser válido.")
    @Size(max = 120, message = "O e-mail pode ter no máximo 120 caracteres.")
    String email,

    @NotBlank(message = "O telefone é obrigatório.")
    @Size(max = 20, message = "O telefone pode ter no máximo 20 caracteres.")
    String telefone,

    @NotNull(message = "O campo ativo é obrigatório.")
    Boolean ativo
) {}