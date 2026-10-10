package br.ufpr.dac.grupo2.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.mongodb.test.autoconfigure.DataMongoTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import br.ufpr.dac.grupo2.auth.config.SegurancaConfig;
import br.ufpr.dac.grupo2.auth.dto.ComandoSagaDTO;
import br.ufpr.dac.grupo2.auth.dto.RespostaSagaDTO;
import br.ufpr.dac.grupo2.auth.model.Usuario;
import br.ufpr.dac.grupo2.auth.repository.ComandoProcessadoRepository;
import br.ufpr.dac.grupo2.auth.repository.UsuarioRepository;
import br.ufpr.dac.grupo2.auth.service.AuthService;
import br.ufpr.dac.grupo2.auth.service.UsuarioSagaService;

@DataMongoTest
@Testcontainers
@Import({ UsuarioSagaService.class, AuthService.class, SegurancaConfig.class })
class UsuarioSagaServiceTest {
  private static final String SAGA_R9 = "saga-r9";
  private static final String SAGA_R13 = "saga-r13";
  private static final String SAGA_R15 = "saga-r15";

  private static final String CPF = "11122233396";
  private static final String EMAIL = "fulano@exemplo.com.br";

  private static final String GENIEVE = "98574307084";

  @Container
  static MongoDBContainer mongo = new MongoDBContainer("mongo:7");

  @DynamicPropertySource
  static void configurarMongo(DynamicPropertyRegistry registry) {
    registry.add("spring.mongodb.uri", () -> mongo.getReplicaSetUrl("bantads_auth"));
  }

  @Autowired
  private UsuarioSagaService servico;

  @Autowired
  private AuthService auth;

  @Autowired
  private UsuarioRepository usuarios;

  @Autowired
  private ComandoProcessadoRepository processados;

  @Autowired
  private Argon2PasswordEncoder argon2;

  @BeforeEach
  void limpar() {
    usuarios.deleteAll();
    processados.deleteAll();
  }

  @Test
  void criarUsuarioSemSenhaGeraUmaAleatoriaQueSoSaiNaResposta() {
    RespostaSagaDTO resposta = servico.processar(criarCliente(SAGA_R9));

    assertEquals("SUCESSO", resposta.status());
    assertEquals("criar-usuario", resposta.tipo());
    String senha = (String) resposta.payload().get("senha");
    assertTrue(senha.matches("[A-HJ-NP-Za-km-np-z2-9]{8}"), senha);

    Usuario salvo = usuarios.findByLogin(EMAIL).orElseThrow();
    assertNotEquals(senha, salvo.getSenha());
    assertTrue(salvo.getSenha().startsWith("$argon2id$"));
    assertEquals(CPF, auth.autenticar(EMAIL, senha).orElseThrow().getCpf());

    Map<String, Object> guardada = processados.findBySagaIdAndTipo(SAGA_R9, "criar-usuario").orElseThrow()
      .getResposta().payload();
    assertEquals(Map.of("cpf", CPF), guardada);
  }

  @Test
  void criarUsuarioComSenhaInformadaNaoDevolveSenha() {
    RespostaSagaDTO resposta = servico.processar(comando(SAGA_R13, "criar-usuario",
      Map.of("cpf", "40501740066", "login", "ger4@bantads.com.br", "tipo", "GERENTE", "senha", "tads")));

    assertEquals("SUCESSO", resposta.status());
    assertEquals(Map.of("cpf", "40501740066"), resposta.payload());
    assertEquals("GERENTE", auth.autenticar("ger4@bantads.com.br", "tads").orElseThrow().getTipo());
  }

  @Test
  void emailJaCadastradoFalhaComMotivoRecusaSemDuplicarOLogin() {
    auth.recriarSeed();

    RespostaSagaDTO resposta = servico.processar(comando(SAGA_R9, "criar-usuario",
      Map.of("cpf", CPF, "login", "cli1@bantads.com.br", "tipo", "CLIENTE")));

    assertEquals("FALHA", resposta.status());
    assertEquals("E-mail já cadastrado", resposta.erro());
    assertEquals(Map.of("motivoRecusa", "E-mail já cadastrado"), resposta.payload());
    assertEquals("12912861012", usuarios.findByLogin("cli1@bantads.com.br").orElseThrow().getCpf());
    assertEquals(9, usuarios.count());
  }

  @Test
  void compensarOEmailDuplicadoNaoApagaQuemJaTinhaOLogin() {
    auth.recriarSeed();
    servico.processar(comando(SAGA_R9, "criar-usuario",
      Map.of("cpf", CPF, "login", "cli1@bantads.com.br", "tipo", "CLIENTE")));

    RespostaSagaDTO resposta = servico.processar(comando(SAGA_R9, "compensar-criar-usuario", Map.of("cpf", CPF)));

    assertEquals("SUCESSO", resposta.status());
    assertEquals(Map.of("removido", false), resposta.payload());
    assertTrue(auth.autenticar("cli1@bantads.com.br", "tads").isPresent());
  }

  @Test
  void compensarCriarUsuarioRemoveOQueAMesmaSagaCriou() {
    servico.processar(criarCliente(SAGA_R9));

    RespostaSagaDTO resposta = servico.processar(comando(SAGA_R9, "compensar-criar-usuario", Map.of("cpf", CPF)));

    assertEquals(Map.of("removido", true), resposta.payload());
    assertTrue(usuarios.findByLogin(EMAIL).isEmpty());
  }

  @Test
  void criarQueChegaDepoisDaCompensacaoDaMesmaSagaNaoCriaNada() {
    servico.processar(comando(SAGA_R9, "compensar-criar-usuario", Map.of("cpf", CPF)));

    RespostaSagaDTO resposta = servico.processar(criarCliente(SAGA_R9));

    assertEquals("FALHA", resposta.status());
    assertEquals("SAGA já compensada", resposta.erro());
    assertTrue(usuarios.findByLogin(EMAIL).isEmpty());
  }

  @Test
  void reentregaDoCriarUsuarioDevolveARespostaGuardadaSemCriarDeNovo() {
    RespostaSagaDTO primeira = servico.processar(criarCliente(SAGA_R9));
    RespostaSagaDTO segunda = servico.processar(criarCliente(SAGA_R9));

    assertEquals("SUCESSO", segunda.status());
    assertEquals(primeira.timestamp(), segunda.timestamp());
    assertEquals(Map.of("cpf", CPF), segunda.payload());
    assertEquals(1, usuarios.count());
    assertEquals(1, processados.count());
    assertTrue(auth.autenticar(EMAIL, (String) primeira.payload().get("senha")).isPresent());
  }

  @Test
  void reentregaDepoisDeGravarOUsuarioMasAntesDeRegistrarOComandoESucesso() {
    Usuario jaGravado = new Usuario(CPF, "CLIENTE", EMAIL, argon2.encode("Xk7pQ2mZ"), true);
    jaGravado.setSagaId(SAGA_R9);
    usuarios.save(jaGravado);

    RespostaSagaDTO resposta = servico.processar(criarCliente(SAGA_R9));

    assertEquals("SUCESSO", resposta.status());
    assertEquals(Map.of("cpf", CPF), resposta.payload());
    assertEquals(1, usuarios.count());
  }

  @Test
  void desativarEReativarOGerente() {
    auth.recriarSeed();

    RespostaSagaDTO desativado = servico.processar(comando(SAGA_R15, "desativar-usuario", Map.of("cpf", GENIEVE)));
    assertEquals("SUCESSO", desativado.status());
    assertEquals(Map.of("cpf", GENIEVE), desativado.payload());
    assertFalse(auth.autenticar("ger1@bantads.com.br", "tads").orElseThrow().isAtivo());

    RespostaSagaDTO reativado = servico.processar(comando(SAGA_R15, "compensar-desativar-usuario", Map.of("cpf", GENIEVE)));
    assertEquals("SUCESSO", reativado.status());
    assertEquals(Map.of("reativado", true), reativado.payload());
    assertTrue(auth.autenticar("ger1@bantads.com.br", "tads").orElseThrow().isAtivo());
  }

  @Test
  void desativarNaoAlcancaCliente() {
    auth.recriarSeed();

    RespostaSagaDTO resposta = servico.processar(comando(SAGA_R15, "desativar-usuario", Map.of("cpf", "12912861012")));

    assertEquals("FALHA", resposta.status());
    assertEquals("Gerente sem usuário no MS Auth", resposta.erro());
    assertTrue(auth.autenticar("cli1@bantads.com.br", "tads").orElseThrow().isAtivo());
  }

  @Test
  void desativarQueChegaDepoisDaCompensacaoDaMesmaSagaNaoDesativa() {
    auth.recriarSeed();
    servico.processar(comando(SAGA_R15, "compensar-desativar-usuario", Map.of("cpf", GENIEVE)));

    RespostaSagaDTO resposta = servico.processar(comando(SAGA_R15, "desativar-usuario", Map.of("cpf", GENIEVE)));

    assertEquals("FALHA", resposta.status());
    assertEquals("SAGA já compensada", resposta.erro());
    assertTrue(auth.autenticar("ger1@bantads.com.br", "tads").orElseThrow().isAtivo());
  }

  @Test
  void reentregaDoDesativarNaoExecutaDeNovo() {
    auth.recriarSeed();
    servico.processar(comando(SAGA_R15, "desativar-usuario", Map.of("cpf", GENIEVE)));
    // reativa por fora: se a reentrega executasse de novo, o gerente voltaria a ficar inativo
    Usuario genieve = usuarios.findByLogin("ger1@bantads.com.br").orElseThrow();
    genieve.setAtivo(true);
    usuarios.save(genieve);

    RespostaSagaDTO reentrega = servico.processar(comando(SAGA_R15, "desativar-usuario", Map.of("cpf", GENIEVE)));

    assertEquals("SUCESSO", reentrega.status());
    assertTrue(usuarios.findByLogin("ger1@bantads.com.br").orElseThrow().isAtivo());
    assertEquals(1, processados.count());
  }

  @Test
  void payloadInvalidoETipoDesconhecidoFalhamSemGravarUsuario() {
    RespostaSagaDTO cpfInvalido = servico.processar(comando(SAGA_R9, "criar-usuario",
      Map.of("cpf", "123", "login", EMAIL, "tipo", "CLIENTE")));
    RespostaSagaDTO tipoDesconhecido = servico.processar(comando(SAGA_R9, "apagar-usuarios", Map.of()));

    assertEquals("Payload inválido para criar-usuario", cpfInvalido.erro());
    assertEquals("Tipo de comando não suportado: apagar-usuarios", tipoDesconhecido.erro());
    assertEquals(0, usuarios.count());
  }

  private static ComandoSagaDTO criarCliente(String sagaId) {
    return comando(sagaId, "criar-usuario", Map.of("cpf", CPF, "login", EMAIL, "tipo", "CLIENTE"));
  }

  private static ComandoSagaDTO comando(String sagaId, String tipo, Map<String, Object> payload) {
    return new ComandoSagaDTO(sagaId, tipo, "2026-10-04T10:00:00", payload);
  }
}
