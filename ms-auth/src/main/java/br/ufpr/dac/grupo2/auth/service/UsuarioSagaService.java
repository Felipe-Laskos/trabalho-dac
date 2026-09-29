package br.ufpr.dac.grupo2.auth.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.stereotype.Service;

import br.ufpr.dac.grupo2.auth.dto.ComandoSagaDTO;
import br.ufpr.dac.grupo2.auth.dto.RespostaSagaDTO;
import br.ufpr.dac.grupo2.auth.model.ComandoProcessado;
import br.ufpr.dac.grupo2.auth.model.Usuario;
import br.ufpr.dac.grupo2.auth.repository.ComandoProcessadoRepository;
import br.ufpr.dac.grupo2.auth.repository.UsuarioRepository;

@Service
public class UsuarioSagaService {
  private static final String CRIAR = "criar-usuario";
  private static final String COMPENSAR = "compensar-criar-usuario";

  private static final Set<String> TIPOS = Set.of("CLIENTE", "GERENTE");

  private static final String EMAIL_DUPLICADO = "E-mail já cadastrado";

  private static final String ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  private static final int TAMANHO_SENHA = 8;

  private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

  private final SecureRandom sorteio = new SecureRandom();

  private final UsuarioRepository usuarios;

  private final ComandoProcessadoRepository processados;

  private final Argon2PasswordEncoder argon2;

  public UsuarioSagaService(UsuarioRepository usuarios, ComandoProcessadoRepository processados,
      Argon2PasswordEncoder argon2) {
    this.usuarios = usuarios;
    this.processados = processados;
    this.argon2 = argon2;
  }

  public RespostaSagaDTO processar(ComandoSagaDTO cmd) {
    Optional<ComandoProcessado> anterior = processados.findBySagaIdAndTipo(cmd.sagaId(), cmd.tipo());
    if (anterior.isPresent()) {
      return anterior.get().getResposta();
    }

    RespostaSagaDTO resposta = switch (cmd.tipo()) {
      case CRIAR -> criar(cmd);
      case COMPENSAR -> compensar(cmd);
      default -> falha(cmd, "Tipo de comando não suportado: " + cmd.tipo(), Map.of());
    };

    processados.save(new ComandoProcessado(resposta));
    return resposta;
  }

  private RespostaSagaDTO criar(ComandoSagaDTO cmd) {
    if (processados.existsBySagaIdAndTipo(cmd.sagaId(), COMPENSAR)) {
      return falha(cmd, "SAGA já compensada", Map.of());
    }

    String cpf = cmd.texto("cpf");
    String login = cmd.texto("login");
    String tipo = cmd.texto("tipo");
    if (cpf == null || !cpf.matches("\\d{11}") || login == null || login.isBlank() || !TIPOS.contains(tipo)) {
      return falha(cmd, "Payload inválido para " + CRIAR, Map.of());
    }

    String senha = gerarSenha();
    Usuario usuario = new Usuario(cpf, tipo, login, argon2.encode(senha), true);
    usuario.setSagaId(cmd.sagaId());

    try {
      usuarios.save(usuario);
    } catch (DuplicateKeyException e) {
      return loginDuplicado(cmd, login, cpf);
    }

    return sucesso(cmd, Map.of("cpf", cpf, "senha", senha));
  }

  private RespostaSagaDTO loginDuplicado(ComandoSagaDTO cmd, String login, String cpf) {
    boolean criadoPorEstaSaga = usuarios.findByLogin(login)
      .map(existente -> cmd.sagaId().equals(existente.getSagaId()))
      .orElse(false);

    if (criadoPorEstaSaga) {
      return sucesso(cmd, Map.of("cpf", cpf));
    }

    return falha(cmd, EMAIL_DUPLICADO, Map.of("motivoRecusa", EMAIL_DUPLICADO));
  }

  private RespostaSagaDTO compensar(ComandoSagaDTO cmd) {
    long removidos = usuarios.deleteBySagaId(cmd.sagaId());
    return sucesso(cmd, Map.of("removido", removidos > 0));
  }

  private String gerarSenha() {
    StringBuilder senha = new StringBuilder(TAMANHO_SENHA);
    for (int i = 0; i < TAMANHO_SENHA; i++) {
      senha.append(ALFABETO.charAt(sorteio.nextInt(ALFABETO.length())));
    }
    return senha.toString();
  }

  private RespostaSagaDTO sucesso(ComandoSagaDTO cmd, Map<String, Object> payload) {
    return new RespostaSagaDTO(cmd.sagaId(), cmd.tipo(), payload, agora(), "SUCESSO", null);
  }

  private RespostaSagaDTO falha(ComandoSagaDTO cmd, String erro, Map<String, Object> payload) {
    return new RespostaSagaDTO(cmd.sagaId(), cmd.tipo(), payload, agora(), "FALHA", erro);
  }

  private String agora() {
    return LocalDateTime.now().format(ISO);
  }
}
