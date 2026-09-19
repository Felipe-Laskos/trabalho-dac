package br.ufpr.dac.grupo2.conta.query.repository;

import br.ufpr.dac.grupo2.conta.query.model.Movimentacao;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MovimentacaoRepository extends JpaRepository<Movimentacao, Long> {
    boolean existsByEventoId(Long eventoId);

    Optional<Movimentacao> findFirstByNumeroContaAndDataHoraBeforeOrderByDataHoraDescIdDesc(
            String numeroConta, LocalDateTime inicio);

    List<Movimentacao> findByNumeroContaAndDataHoraGreaterThanEqualAndDataHoraLessThanOrderByDataHoraAscIdAsc(
            String numeroConta, LocalDateTime inicio, LocalDateTime fimExclusivo);
}