package br.ufpr.dac.grupo2.conta.command.repository;

import br.ufpr.dac.grupo2.conta.command.model.Evento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventoRepository extends JpaRepository<Evento, Long> {

    List<Evento> findByObjetoIdOrderByVersaoAsc(String objetoId);
}