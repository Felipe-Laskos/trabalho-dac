package br.ufpr.dac.grupo2.gerente.repository;

import br.ufpr.dac.grupo2.gerente.model.Gerente;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GerenteRepository extends JpaRepository<Gerente, String> {
    boolean existsByEmail(String email);
    List<Gerente> findByAtivoTrueOrderByNomeAsc();
}
