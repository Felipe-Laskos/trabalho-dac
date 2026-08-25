package br.ufpr.dac.grupo2.gerente.dto.response;

import br.ufpr.dac.grupo2.gerente.dto.DTOComLinks;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class GerenteResponseDTO extends DTOComLinks {

    private String cpf;
    private String nome;
    private String email;
    private String telefone;
    private Boolean ativo;
    private Integer quantidadeClientes;
}
