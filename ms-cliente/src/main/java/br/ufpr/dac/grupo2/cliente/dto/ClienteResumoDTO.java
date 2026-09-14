package br.ufpr.dac.grupo2.cliente.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ClienteResumoDTO extends DTOComLinks {
    private String cpf;
    private String nome;
    private String cidade;
    private String estado;
}
