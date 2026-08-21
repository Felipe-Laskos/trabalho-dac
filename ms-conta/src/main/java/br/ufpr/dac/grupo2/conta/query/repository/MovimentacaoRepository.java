package br.ufpr.dac.grupo2.conta.query.repository;

import br.ufpr.dac.grupo2.conta.query.model.Movimentacao;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MovimentacaoRepository extends JpaRepository<Movimentacao, Long> {

    boolean existsByEventoId(Long eventoId);
}
