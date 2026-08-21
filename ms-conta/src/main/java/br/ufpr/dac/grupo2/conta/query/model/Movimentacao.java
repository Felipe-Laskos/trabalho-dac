package br.ufpr.dac.grupo2.conta.query.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "movimentacoes", schema = "conta_query")
public class Movimentacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "evento_id", nullable = false, unique = true)
    private Long eventoId;

    @Column(name = "numero_conta", nullable = false, length = 4)
    private String numeroConta;

    @Column(name = "data_hora", nullable = false)
    private LocalDateTime dataHora;

    @Column(name = "tipo", nullable = false, length = 20)
    private String tipo;

    @Column(name = "valor", nullable = false, precision = 19, scale = 4)
    private BigDecimal valor;

    @Column(name = "saldo_apos", nullable = false, precision = 19, scale = 4)
    private BigDecimal saldoApos;

    @Column(name = "conta_origem", length = 4)
    private String contaOrigem;

    @Column(name = "cpf_origem", length = 11)
    private String cpfOrigem;

    @Column(name = "nome_origem", length = 120)
    private String nomeOrigem;

    @Column(name = "conta_destino", length = 4)
    private String contaDestino;

    @Column(name = "cpf_destino", length = 11)
    private String cpfDestino;

    @Column(name = "nome_destino", length = 120)
    private String nomeDestino;

    protected Movimentacao() {
    }

    public Long getId() {
        return id;
    }

    public Long getEventoId() {
        return eventoId;
    }

    public String getNumeroConta() {
        return numeroConta;
    }

    public LocalDateTime getDataHora() {
        return dataHora;
    }

    public String getTipo() {
        return tipo;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public BigDecimal getSaldoApos() {
        return saldoApos;
    }

    public String getContaOrigem() {
        return contaOrigem;
    }

    public String getCpfOrigem() {
        return cpfOrigem;
    }

    public String getNomeOrigem() {
        return nomeOrigem;
    }

    public String getContaDestino() {
        return contaDestino;
    }

    public String getCpfDestino() {
        return cpfDestino;
    }

    public String getNomeDestino() {
        return nomeDestino;
    }
}