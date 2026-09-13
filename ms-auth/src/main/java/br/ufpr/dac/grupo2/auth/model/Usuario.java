package br.ufpr.dac.grupo2.auth.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Document(collection = "usuarios")
@Getter
@Setter
@NoArgsConstructor
public class Usuario {
  @Id
  private String id;

  private String cpf;

  private String tipo;

  @Indexed(unique = true, name = "uk_usuarios_login")
  private String login;

  private String senha;

  private boolean ativo;

  public Usuario(String cpf, String tipo, String login, String senha, boolean ativo) {
    this.cpf = cpf;
    this.tipo = tipo;
    this.login = login;
    this.senha = senha;
    this.ativo = ativo;
  }
}
