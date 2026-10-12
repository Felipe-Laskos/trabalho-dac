package br.ufpr.dac.grupo2.gerente.repository;

import br.ufpr.dac.grupo2.gerente.model.Gerente;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface GerenteRepository extends JpaRepository<Gerente, String> {

    @Query(value = "SELECT * FROM gerente.gerentes WHERE ativo ORDER BY nome COLLATE \"pt-BR-x-icu\"", nativeQuery = true)
    List<Gerente> listarAtivosOrdenadoPorNome();
}
