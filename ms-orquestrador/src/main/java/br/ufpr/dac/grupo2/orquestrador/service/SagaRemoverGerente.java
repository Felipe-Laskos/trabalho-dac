package br.ufpr.dac.grupo2.orquestrador.service;

import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.AUTH_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.CLIENTE_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.CONTA_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.GERENTE_CMD;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import org.springframework.stereotype.Component;

import br.ufpr.dac.grupo2.orquestrador.model.DadosSaga;
import br.ufpr.dac.grupo2.orquestrador.model.Passo;
import br.ufpr.dac.grupo2.orquestrador.repository.SessaoRepository;

@Component
public class SagaRemoverGerente implements Saga {

	private final List<Passo> passos;

	public SagaRemoverGerente(SessaoRepository sessoes) {
		this.passos = List.of(
				Passo.transacional(1, GERENTE_CMD, "inativar-gerente",
						dados -> Map.of("cpf", dados.texto("cpf")),
						"compensar-inativar-gerente", dados -> Map.of("cpf", dados.texto("cpf"))),
				Passo.transacional(2, AUTH_CMD, "desativar-usuario",
						dados -> Map.of("cpf", dados.texto("cpf")),
						"compensar-desativar-usuario", dados -> Map.of("cpf", dados.texto("cpf"))),
				Passo.local(3, "encerrar-sessoes", dados -> sessoes.encerrarTodas(dados.texto("cpf"))),
				Passo.consulta(4, GERENTE_CMD, "listar-ativos",
						dados -> Map.of()),
				Passo.transacional(5, CONTA_CMD, "transferir-contas-do-gerente",
						dados -> Map.of("cpfGerente", dados.texto("cpf"), "cpfsAtivos", dados.valor("cpfsAtivos")),
						"compensar-transferir-contas", dados -> Map.of("cpfGerente", dados.texto("cpf"))),
				Passo.consulta(6, CLIENTE_CMD, "obter-clientes-por-cpf",
						dados -> Map.of("cpfs", cpfsDosClientes(dados)))
						.somenteSe(SagaRemoverGerente::houveTransferencia),
				Passo.emailParaCada(7, "email.gerente-alterado",
						dados -> Avisos.gerenteAlterado(dados.lista("clientes"), nomeDoDestino(dados)))
						.somenteSe(SagaRemoverGerente::houveTransferencia));
	}

	@Override
	public String tipo() {
		return "remover-gerente";
	}

	@Override
	public String dominio() {
		return "gerentes";
	}

	@Override
	public List<Passo> passos() {
		return passos;
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
		dados.opcional("cpfGerenteDestino").ifPresent(destino -> chaves.add("cache:gerente:" + destino));
		return chaves;
	}

	@Override
	public Optional<Map<String, Object>> resultadoInline(DadosSaga dados) {
		int transferidas = dados.lista("contas").size();
		String mensagem = transferidas == 0
				? "Gerente removido; não havia contas a transferir"
				: "Gerente removido; " + transferidas + (transferidas == 1 ? " conta transferida" : " contas transferidas")
						+ " para " + nomeDoDestino(dados);
		return Optional.of(Map.of("mensagem", mensagem));
	}

	private static boolean houveTransferencia(DadosSaga dados) {
		return !dados.lista("contas").isEmpty();
	}

	private static List<Object> cpfsDosClientes(DadosSaga dados) {
		return dados.lista("contas").stream()
				.map(conta -> conta.get("cpfCliente"))
				.filter(Objects::nonNull)
				.distinct()
				.toList();
	}

	private static String nomeDoDestino(DadosSaga dados) {
		String destino = dados.opcional("cpfGerenteDestino").orElse("outro gerente");
		Object nome = dados.mapa("nomesGerentes").get(destino);
		return nome != null ? nome.toString() : destino;
	}

}
