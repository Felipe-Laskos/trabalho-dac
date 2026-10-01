package br.ufpr.dac.grupo2.orquestrador.service;

import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.AUTH_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.CLIENTE_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.CONTA_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.GERENTE_CMD;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Component;

import br.ufpr.dac.grupo2.orquestrador.model.DadosSaga;
import br.ufpr.dac.grupo2.orquestrador.model.Passo;

@Component
public class SagaInserirGerente implements Saga {

	private static final List<Passo> PASSOS = List.of(
			Passo.transacional(1, GERENTE_CMD, "inserir-gerente",
					dados -> Map.of("cpf", dados.texto("cpf"), "nome", dados.texto("nome"),
							"email", dados.texto("email"), "telefone", dados.texto("telefone")),
					"compensar-inserir-gerente", dados -> Map.of("cpf", dados.texto("cpf"))),
			Passo.transacional(2, AUTH_CMD, "criar-usuario",
					dados -> Map.of("cpf", dados.texto("cpf"), "login", dados.texto("email"), "tipo", "GERENTE",
							"senha", dados.senha()),
					"compensar-criar-usuario", dados -> Map.of("cpf", dados.texto("cpf"))),
			Passo.consulta(3, CONTA_CMD, "conta-a-transferir",
					dados -> Map.of("cpfGerente", dados.texto("cpf"))),
			Passo.transacional(4, CONTA_CMD, "atribuir-conta",
					dados -> Map.of("numeroConta", dados.texto("numeroConta"), "cpfGerente", dados.texto("cpf")),
					"compensar-atribuir-conta",
					dados -> Map.of("numeroConta", dados.texto("numeroConta"),
							"cpfGerente", dados.texto("cpfGerenteAnterior")))
					.somenteSe(SagaInserirGerente::haContaATransferir),
			Passo.consulta(5, CLIENTE_CMD, "obter-clientes-por-cpf",
					dados -> Map.of("cpfs", List.of(dados.texto("cpfCliente"))))
					.somenteSe(SagaInserirGerente::haContaATransferir),
			Passo.emailParaCada(6, "email.gerente-alterado",
					dados -> Avisos.gerenteAlterado(dados.lista("clientes"), dados.texto("nome")))
					.somenteSe(SagaInserirGerente::haContaATransferir));

	@Override
	public String tipo() {
		return "inserir-gerente";
	}

	@Override
	public String dominio() {
		return "gerentes";
	}

	@Override
	public List<Passo> passos() {
		return PASSOS;
	}

	@Override
	public String recurso(DadosSaga dados) {
		return dados.texto("cpf");
	}

	@Override
	public Optional<Passo> emailDeFalha() {
		return Optional.empty();
	}

	@Override
	public List<String> cacheInvalidado(DadosSaga dados) {
		List<String> chaves = new ArrayList<>(List.of("cache:gerente:" + dados.texto("cpf")));
		dados.opcional("cpfGerenteAnterior").ifPresent(anterior -> chaves.add("cache:gerente:" + anterior));
		return chaves;
	}

	private static boolean haContaATransferir(DadosSaga dados) {
		return Boolean.parseBoolean(dados.opcional("transferir").orElse("false"));
	}

}
