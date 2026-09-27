package br.ufpr.dac.grupo2.orquestrador.model;

public enum StatusSaga {

	EM_ANDAMENTO,
	COMPENSANDO,
	CONCLUIDA,
	COMPENSADA;

	public boolean emCurso() {
		return this == EM_ANDAMENTO || this == COMPENSANDO;
	}

}
