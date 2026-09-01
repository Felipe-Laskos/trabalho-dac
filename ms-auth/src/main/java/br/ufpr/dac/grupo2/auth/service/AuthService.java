package br.ufpr.dac.grupo2.auth.service;

import java.util.List;
import java.util.Optional;

import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.stereotype.Service;

import br.ufpr.dac.grupo2.auth.dto.AuthResponseDTO;
import br.ufpr.dac.grupo2.auth.model.Usuario;
import br.ufpr.dac.grupo2.auth.repository.UsuarioRepository;

@Service
public class AuthService {
  private static final String SENHA_SEED = "tads";

  private static final List<String[]> SEED = List.of(
          new String[] { "12912861012", "CLIENTE", "cli1@bantads.com.br" },
          new String[] { "09506382000", "CLIENTE", "cli2@bantads.com.br" },
          new String[] { "85733854057", "CLIENTE", "cli3@bantads.com.br" },
          new String[] { "58872160006", "CLIENTE", "cli4@bantads.com.br" },
          new String[] { "76179646090", "CLIENTE", "cli5@bantads.com.br" },
          new String[] { "98574307084", "GERENTE", "ger1@bantads.com.br" },
          new String[] { "64065268052", "GERENTE", "ger2@bantads.com.br" },
          new String[] { "23862179060", "GERENTE", "ger3@bantads.com.br" },
          new String[] { "40501740066", "GERENTE", "ger4@bantads.com.br" });

  private final UsuarioRepository repository;

  private final Argon2PasswordEncoder argon2;

  public AuthService(UsuarioRepository repository, Argon2PasswordEncoder argon2) {
    this.repository = repository;
    this.argon2 = argon2;
  }

  public Optional<AuthResponseDTO> autenticar(String login, String senha) {
    if(login == null || senha == null) {
      return Optional.empty();
    }

    return repository.findByLogin(login)
      .filter(usuario -> argon2.matches(senha, usuario.getSenha()))
      .map(usuario -> new AuthResponseDTO(usuario.getCpf(), usuario.getTipo(), usuario.isAtivo()));
    
  }

  public int recriarSeed() {
    repository.deleteAll();

    List<Usuario> usuarios = SEED.stream()
      .map(linha -> new Usuario(linha[0], linha[1], linha[2], argon2.encode(SENHA_SEED), true))
      .toList();

    repository.saveAll(usuarios);
    return usuarios.size();
  }
}
