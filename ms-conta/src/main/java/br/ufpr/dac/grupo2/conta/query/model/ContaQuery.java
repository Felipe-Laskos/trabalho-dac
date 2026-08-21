package br.ufpr.dac.grupo2.conta.query.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "contas", schema = "conta_query")
public class ContaQuery {

    @Id
    @Column(name = "numero", length = 4)
    private String numero;

    @Column(name = "cpf_cliente", nullable = false, unique = true, length = 11)
    private String cpfCliente;

    @Column(name = "cpf_gerente", nullable = false, length = 11)
    private String cpfGerente;

    @Column(name = "data_criacao", nullable = false)
    private LocalDate dataCriacao;

    @Column(name = "saldo", nullable = false, precision = 19, scale = 4)
    private BigDecimal saldo;

    @Column(name = "ultima_versao", nullable = false)
    private Integer ultimaVersao;

}

