package br.ufpr.dac.grupo2.orquestrador.service;

import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.AUTH_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.CLIENTE_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.CONTA_CMD;
import static br.ufpr.dac.grupo2.orquestrador.config.RabbitConfig.GERENTE_CMD;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Component;

import br.ufpr.dac.grupo2.orquestrador.model.DadosSaga;
import br.ufpr.dac.grupo2.orquestrador.model.Passo;

@Component
public class SagaAprovarCliente implements Saga {

	private static final List<Passo> PASSOS = List.of(
			Passo.transacional(1, CLIENTE_CMD, "aprovar-solicitacao",
					dados -> Map.of("cpf", dados.texto("cpf")),
					"compensar-aprovar-solicitacao", SagaAprovarCliente::devolverSolicitacao),
			Passo.consulta(2, GERENTE_CMD, "listar-ativos",
					dados -> Map.of()),
			Passo.consulta(3, CONTA_CMD, "gerente-com-menos-clientes",
					dados -> Map.of("cpfsAtivos", dados.valor("cpfsAtivos"))),
			Passo.transacional(4, CLIENTE_CMD, "criar-cliente",
					dados -> Map.of("cpf", dados.texto("cpf")),
					"compensar-criar-cliente", dados -> Map.of("cpf", dados.texto("cpf"))),
			Passo.transacional(5, AUTH_CMD, "criar-usuario",
					dados -> Map.of("cpf", dados.texto("cpf"), "login", dados.texto("email"), "tipo", "CLIENTE"),
					"compensar-criar-usuario", dados -> Map.of("cpf", dados.texto("cpf"))),
			Passo.transacional(6, CONTA_CMD, "criar-conta",
					dados -> Map.of("cpfCliente", dados.texto("cpf"), "cpfGerente", dados.texto("cpfGerente")),
					"compensar-criar-conta", SagaAprovarCliente::removerConta),
			Passo.email(7, "email.senha-nova",
					dados -> destinatario(dados, Map.of("senha", dados.senha()))));

	private static final Passo EMAIL_DE_FALHA = Passo.email(0, "email.solicitacao-nao-efetuada",
			dados -> destinatario(dados, Map.of()));

	@Override
	public String tipo() {
		return "aprovar-cliente";
	}

	@Override
	public String dominio() {
		return "clientes";
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
		return Optional.of(EMAIL_DE_FALHA);
	}

	@Override
	public List<String> cacheInvalidado(DadosSaga dados) {
		return List.of("cache:cliente:" + dados.texto("cpf"));
	}

	private static Map<String, Object> devolverSolicitacao(DadosSaga dados) {
		Map<String, Object> payload = new HashMap<>(Map.of("cpf", dados.texto("cpf")));
		dados.opcional("motivoRecusa").ifPresent(motivo -> payload.put("motivoRecusa", motivo));
		return payload;
	}

	private static Map<String, Object> removerConta(DadosSaga dados) {
		Map<String, Object> payload = new HashMap<>(Map.of("cpfCliente", dados.texto("cpf")));
		dados.opcional("numeroConta").ifPresent(numero -> payload.put("numeroConta", numero));
		return payload;
	}

	private static Map<String, Object> destinatario(DadosSaga dados, Map<String, Object> extra) {
		Map<String, Object> payload = new HashMap<>(extra);
		payload.put("para", dados.texto("email"));
		dados.opcional("nome").ifPresent(nome -> payload.put("nome", nome));
		return payload;
	}

}
