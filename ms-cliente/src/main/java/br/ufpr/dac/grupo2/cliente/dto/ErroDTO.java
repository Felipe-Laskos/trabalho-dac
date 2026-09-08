package br.ufpr.dac.grupo2.cliente.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ErroDTO {
    private int status;
    private String error;
    private String message;
}