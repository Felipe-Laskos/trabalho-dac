package br.ufpr.dac.grupo2.conta.command.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(
        name = "eventos",
        schema = "conta_command",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_evento_versao",
                columnNames = {"objeto_id", "versao"}
        )
)
public class Evento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "objeto_id", nullable = false, length = 4)
    private String objetoId;

    @Column(name = "tipo", nullable = false, length = 30)
    private String tipo;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> payload;

    @Column(name = "versao", nullable = false)
    private Integer versao;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    protected Evento() {
    }

    public Evento(
            String objetoId,
            String tipo,
            Map<String, Object> payload,
            Integer versao,
            LocalDateTime timestamp) {
        this.objetoId = objetoId;
        this.tipo = tipo;
        this.payload = payload;
        this.versao = versao;
        this.timestamp = timestamp;
    }

    public Long getId() {
        return id;
    }

    public String getObjetoId() {
        return objetoId;
    }

    public String getTipo() {
        return tipo;
    }

    public Map<String, Object> getPayload() {
        return payload;
    }

    public Integer getVersao() {
        return versao;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }
}