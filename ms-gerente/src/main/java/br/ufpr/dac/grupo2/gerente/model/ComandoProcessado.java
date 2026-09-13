package br.ufpr.dac.grupo2.gerente.model;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "comandos_processados", schema = "gerente")
public class ComandoProcessado {

    @EmbeddedId
    private ComandoProcessadoId id;

    @Column(name = "processado_em", nullable = false)
    private LocalDateTime processadoEm;
}