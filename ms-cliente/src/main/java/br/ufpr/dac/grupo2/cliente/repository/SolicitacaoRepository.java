package br.ufpr.dac.grupo2.cliente.repository;

import br.ufpr.dac.grupo2.cliente.model.Solicitacao;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SolicitacaoRepository extends JpaRepository<Solicitacao, String> {

    @Query(value = """
            SELECT * FROM cliente.solicitacoes
             ORDER BY status <> 'PENDENTE', nome COLLATE "pt-BR-x-icu"
            """, nativeQuery = true)
    List<Solicitacao> listarPendentesPrimeiro();

    @Query(value = """
            SELECT * FROM cliente.solicitacoes
             WHERE status = :status
             ORDER BY nome COLLATE "pt-BR-x-icu"
            """, nativeQuery = true)
    List<Solicitacao> findByStatus(@Param("status") String status);

    boolean existsByEmail(String email);
}
