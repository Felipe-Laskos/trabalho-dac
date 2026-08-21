package br.ufpr.dac.grupo2.conta.query.repository;

import br.ufpr.dac.grupo2.conta.query.model.ContaQuery;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContaQueryRepository extends JpaRepository<ContaQuery, String> {
}