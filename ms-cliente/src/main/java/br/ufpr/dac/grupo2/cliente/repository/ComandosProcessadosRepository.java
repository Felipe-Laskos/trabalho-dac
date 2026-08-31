package br.ufpr.dac.grupo2.cliente.repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import br.ufpr.dac.grupo2.cliente.model.ComandoProcessado;
import br.ufpr.dac.grupo2.cliente.model.ComandoProcessadoId;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ComandosProcessadosRepository extends JpaRepository<ComandoProcessado, ComandoProcessadoId> {
    @Modifying
    @Query(value = "DELETE FROM cliente.comandos_processados", nativeQuery = true)
    void deleteAll();
}