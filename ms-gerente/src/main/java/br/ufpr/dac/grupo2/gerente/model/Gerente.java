package br.ufpr.dac.grupo2.gerente.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "gerentes", schema = "gerente")
public class Gerente {

    @Id
    @Column(name = "cpf", length = 11, nullable = false)
    private String cpf;

    @Column(name = "nome", length = 120, nullable = false)
    private String nome;

    @Column(name = "email", length = 120, nullable = false, unique = true)
    private String email;

    @Column(name = "telefone", length = 20, nullable = false)
    private String telefone;

    @Column(name = "ativo", nullable = false)
    private Boolean ativo;

}
