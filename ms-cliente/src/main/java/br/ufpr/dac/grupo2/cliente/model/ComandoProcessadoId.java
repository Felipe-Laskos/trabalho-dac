package br.ufpr.dac.grupo2.cliente.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@Embeddable
public class ComandoProcessadoId implements Serializable {

    @Column(name = "saga_id", length = 36, nullable = false)
    private String sagaId;

    @Column(name = "tipo", length = 80, nullable = false)
    private String tipo;
}