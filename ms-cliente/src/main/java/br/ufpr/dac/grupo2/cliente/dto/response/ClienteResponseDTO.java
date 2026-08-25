package br.ufpr.dac.grupo2.cliente.dto.response;

import br.ufpr.dac.grupo2.cliente.dto.DTOComLinks;
import br.ufpr.dac.grupo2.cliente.dto.EnderecoDTO;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


// Contrato: GET /clientes/{cpf}
@Getter
@Setter
@NoArgsConstructor
public class ClienteResponseDTO extends DTOComLinks {

    private String cpf;
    private String nome;
    private String email;
    private String telefone;
    private String salario;
    private EnderecoDTO endereco;
}
