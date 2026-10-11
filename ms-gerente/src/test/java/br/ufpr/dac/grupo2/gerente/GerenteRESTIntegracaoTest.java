package br.ufpr.dac.grupo2.gerente;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.function.Consumer;

import br.ufpr.dac.grupo2.gerente.model.Gerente;
import br.ufpr.dac.grupo2.gerente.repository.GerenteRepository;
import br.ufpr.dac.grupo2.gerente.service.GerenteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
@Sql(scripts = {"/db/01-schemas.sql", "/db/03-ddl-gerente.sql"})
class GerenteRESTIntegracaoTest {

    private static final String GENIEVE = "98574307084";
    private static final String GODOPHREDO = "64065268052";
    private static final String GYANDULA = "23862179060";
    private static final String GADAMANTIO = "40501740066";

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void configurar(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired GerenteService service;
    @Autowired GerenteRepository gerentes;
    @Autowired WebApplicationContext contexto;
    private MockMvc mvc;

    @BeforeEach
    void preparar() {
        service.seed();
        mvc = MockMvcBuilders.webAppContextSetup(contexto).build();
    }

    @Test
    void listagemTrazSoAtivosEmOrdemPtBrComLinks() throws Exception {
        alterar(GYANDULA, g -> g.setAtivo(false));
        alterar(GADAMANTIO, g -> g.setNome("Ávila"));

        mvc.perform(get("/gerentes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[*].nome").value(contains("Ávila", "Geniéve", "Godophredo")))
                .andExpect(jsonPath("$[*].ativo").value(everyItem(is(true))))
                .andExpect(jsonPath("$[1]._links.self.href").value("/gerentes/" + GENIEVE))
                .andExpect(jsonPath("$[1]._links.atualizacao.href").value("/gerentes/" + GENIEVE))
                .andExpect(jsonPath("$[1]._links.remocao.href").value("/gerentes/" + GENIEVE));
    }

    @Test
    void atualizaSoNomeETelefone() throws Exception {
        mvc.perform(put("/gerentes/" + GODOPHREDO).contentType("application/json")
                        .content("{\"nome\":\"X\",\"telefone\":\"41999\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("X"))
                .andExpect(jsonPath("$.telefone").value("41999"))
                .andExpect(jsonPath("$.email").value("ger2@bantads.com.br"))
                .andExpect(jsonPath("$._links.atualizacao.href").value("/gerentes/" + GODOPHREDO));

        Gerente salvo = gerentes.findById(GODOPHREDO).orElseThrow();
        assertEquals("X", salvo.getNome());
        assertEquals("41999", salvo.getTelefone());
        assertEquals("ger2@bantads.com.br", salvo.getEmail());
    }

    @Test
    void emailOuCpfIguaisAoAtualSaoAceitos() throws Exception {
        mvc.perform(put("/gerentes/" + GODOPHREDO).contentType("application/json")
                        .content("{\"nome\":\"X\",\"telefone\":\"1\",\"email\":\"ger2@bantads.com.br\",\"cpf\":\"" + GODOPHREDO + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void emailDiferenteDoAtualDa400ENaoAltera() throws Exception {
        mvc.perform(put("/gerentes/" + GODOPHREDO).contentType("application/json")
                        .content("{\"nome\":\"X\",\"telefone\":\"1\",\"email\":\"outro@x.com\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.mensagem").exists());

        assertEquals("Godophredo", gerentes.findById(GODOPHREDO).orElseThrow().getNome());
    }

    @Test
    void cpfDiferenteDoAtualDa400() throws Exception {
        mvc.perform(put("/gerentes/" + GODOPHREDO).contentType("application/json")
                        .content("{\"nome\":\"X\",\"telefone\":\"1\",\"cpf\":\"" + GENIEVE + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void corpoSemNomeDa400() throws Exception {
        mvc.perform(put("/gerentes/" + GODOPHREDO).contentType("application/json")
                        .content("{\"telefone\":\"41999\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void gerenteInexistenteDa404() throws Exception {
        mvc.perform(put("/gerentes/00000000000").contentType("application/json")
                        .content("{\"nome\":\"X\",\"telefone\":\"1\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    private void alterar(String cpf, Consumer<Gerente> mudanca) {
        Gerente gerente = gerentes.findById(cpf).orElseThrow();
        mudanca.accept(gerente);
        gerentes.save(gerente);
    }
}
