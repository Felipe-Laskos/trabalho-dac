package br.ufpr.dac.grupo2.gerente.repository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.JpaRepository;

import br.ufpr.dac.grupo2.gerente.model.ComandoProcessado;
import br.ufpr.dac.grupo2.gerente.model.ComandoProcessadoId;

public interface ComandosProcessadosRepository extends JpaRepository<ComandoProcessado, ComandoProcessadoId> {

    @Modifying
    @Query(value = "DELETE FROM gerente.comandos_processados", nativeQuery = true)
    void deleteAll();
}