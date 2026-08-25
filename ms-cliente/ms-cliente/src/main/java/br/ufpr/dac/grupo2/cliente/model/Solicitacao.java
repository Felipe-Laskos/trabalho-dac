package br.ufpr.dac.grupo2.cliente.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.AccessLevel;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "solicitacoes", schema = "cliente")
public class Solicitacao {
    @Id
    @Column(name = "cpf", length = 11, unique = true, nullable = false)
    private String cpf;

    @Column(name = "nome", length = 120, nullable = false)
    private String nome;

    @Column(name = "email", length = 120, nullable = false, unique = true)
    private String email;

    @Column(name = "telefone", length = 20, nullable = false)
    private String telefone;

    @Column(name = "salario", nullable = false,precision = 19, scale = 4)
    private BigDecimal salario;

    @Column(name = "logradouro", length = 120, nullable = false)
    private String logradouro;

    @Column(name = "numero", length = 10, nullable = false)
    private String numero;

    @Column(name = "complemento", length = 60)
    private String complemento;

    @Column(name = "cep", length = 8, nullable = false)
    private String cep;

    @Column(name = "cidade", length = 80, nullable = false)
    private String cidade;

    @Column(name = "uf", length = 2, nullable = false)
    private String uf;

    @Column(name = "status", length = 15, nullable = false)
    private String status;

    @Column(name = "motivo", length = 255)
    private String motivo;

    @Column(name = "data_hora_processamento", nullable = false)
    private LocalDateTime data_hora_processamento;

}
