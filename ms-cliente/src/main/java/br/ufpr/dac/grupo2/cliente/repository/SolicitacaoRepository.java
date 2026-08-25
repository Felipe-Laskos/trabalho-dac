package br.ufpr.dac.grupo2.cliente.repository;

import br.ufpr.dac.grupo2.cliente.model.Solicitacao;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SolicitacaoRepository extends JpaRepository<Solicitacao, String> {
}
