package br.ufpr.dac.grupo2.cliente.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record SolicitacaoRequestDTO(

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

    @NotNull(message = "O salário é obrigatório.")
    BigDecimal salario,

    @NotBlank(message = "O logradouro é obrigatório.")
    @Size(max = 120, message = "O logradouro pode ter no máximo 120 caracteres.")
    String logradouro,

    @NotBlank(message = "O número é obrigatório.")
    @Size(max = 10, message = "O número pode ter no máximo 10 caracteres.")
    String numero,

    @Size(max = 60, message = "O complemento pode ter no máximo 60 caracteres.")
    String complemento,

    @NotBlank(message = "O CEP é obrigatório.")
    @Size(min = 8, max = 8, message = "O CEP deve conter exatamente 8 dígitos.")
    String cep,

    @NotBlank(message = "A cidade é obrigatória.")
    @Size(max = 80, message = "A cidade pode ter no máximo 80 caracteres.")
    String cidade,

    @NotBlank(message = "A UF é obrigatória.")
    @Size(min = 2, max = 2, message = "A UF deve conter exatamente 2 caracteres.")
    String uf,

    @NotBlank(message = "O status é obrigatório.")
    @Size(max = 255, message = "O status pode ter no máximo 255 caracteres.")
    String status
) {}