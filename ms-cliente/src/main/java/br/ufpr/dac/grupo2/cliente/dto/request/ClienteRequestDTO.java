package br.ufpr.dac.grupo2.cliente.dto.request;

import br.ufpr.dac.grupo2.cliente.dto.EnderecoDTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ClienteRequestDTO {

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

    @NotNull(message = "O salário é obrigatório.")
    private BigDecimal salario;

    @NotNull(message = "O endereço é obrigatório.")
    @Valid
    private EnderecoDTO endereco;
}
