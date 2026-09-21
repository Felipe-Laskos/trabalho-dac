package br.ufpr.dac.grupo2.cliente.repository;

import br.ufpr.dac.grupo2.cliente.model.Solicitacao;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SolicitacaoRepository extends JpaRepository<Solicitacao, String> {
    List<Solicitacao> findByStatus(String status);
    boolean existsByEmail(String email);
}
