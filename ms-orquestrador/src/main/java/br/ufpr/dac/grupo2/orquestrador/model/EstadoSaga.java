package br.ufpr.dac.grupo2.orquestrador.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class EstadoSaga {

	private String sagaId;
	private String tipo;
	private int etapaAtual;
	private StatusSaga status;
	private Map<String, Object> payload = new HashMap<>();
	private String timestamp;

	private String aguardando;
	private long timestampPasso;
	private List<Integer> passosExecutados = new ArrayList<>();
	private List<Integer> compensacoesPendentes = new ArrayList<>();
	private String erro;

	public static EstadoSaga nova(String sagaId, String tipo, Map<String, Object> payload, String timestamp) {
		EstadoSaga estado = new EstadoSaga();
		estado.sagaId = sagaId;
		estado.tipo = tipo;
		estado.status = StatusSaga.EM_ANDAMENTO;
		estado.payload = payload;
		estado.timestamp = timestamp;
		return estado;
	}

	public void aguardar(String tipoEsperado, long agora) {
		this.aguardando = tipoEsperado;
		this.timestampPasso = agora;
	}

	public void encerrar(StatusSaga desfecho) {
		this.status = desfecho;
		this.aguardando = null;
	}

}
