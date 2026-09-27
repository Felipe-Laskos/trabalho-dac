package br.ufpr.dac.grupo2.auth.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import br.ufpr.dac.grupo2.auth.model.ComandoProcessado;

public interface ComandoProcessadoRepository extends MongoRepository<ComandoProcessado, String> {
  Optional<ComandoProcessado> findBySagaIdAndTipo(String sagaId, String tipo);

  boolean existsBySagaIdAndTipo(String sagaId, String tipo);
}
