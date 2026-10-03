package br.ufpr.dac.grupo2.auth.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import br.ufpr.dac.grupo2.auth.dto.RespostaSagaDTO;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Document(collection = "comandos_processados")
@CompoundIndex(name = "uk_comandos_saga_tipo", def = "{'sagaId': 1, 'tipo': 1}", unique = true)
@Getter
@NoArgsConstructor
public class ComandoProcessado {
  @Id
  private String id;

  private String sagaId;

  private String tipo;

  private RespostaSagaDTO resposta;

  public ComandoProcessado(RespostaSagaDTO resposta) {
    this.sagaId = resposta.sagaId();
    this.tipo = resposta.tipo();
    this.resposta = resposta.semSenha();
  }
}
