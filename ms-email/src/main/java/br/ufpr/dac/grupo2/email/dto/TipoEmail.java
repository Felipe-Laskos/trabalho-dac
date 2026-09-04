package br.ufpr.dac.grupo2.email.dto;


public enum TipoEmail {

	SENHA_NOVA("email.senha-nova",
			"BANTADS — sua conta foi aprovada",
			"""
			Olá, %s!

			Sua conta no BANTADS foi aprovada e já está disponível.

			Sua senha de acesso é: %s

			Recomendamos que você a altere no primeiro acesso.

			Atenciosamente,
			Equipe BANTADS"""),

	SOLICITACAO_NAO_EFETUADA("email.solicitacao-nao-efetuada",
			"BANTADS — sua solicitação não foi efetuada",
			"""
			Olá, %s!

			Não foi possível concluir sua solicitação de abertura de conta.
			Nenhuma alteração foi realizada em seu cadastro.

			Você pode tentar novamente a qualquer momento.

			Atenciosamente,
			Equipe BANTADS"""),

	SOLICITACAO_REJEITADA("email.solicitacao-rejeitada",
			"BANTADS — sua solicitação foi rejeitada",
			"""
			Olá, %s!

			Sua solicitação de abertura de conta no BANTADS foi rejeitada.

			Motivo: %s

			Atenciosamente,
			Equipe BANTADS"""),

	GERENTE_ALTERADO("email.gerente-alterado",
			"BANTADS — seu gerente foi alterado",
			"""
			Olá, %s!

			Informamos que o gerente responsável pela sua conta foi alterado.

			Seu novo gerente é: %s

			Atenciosamente,
			Equipe BANTADS""");

	private final String tipo;
	private final String assunto;
	private final String modelo;

	TipoEmail(String tipo, String assunto, String modelo) {
		this.tipo = tipo;
		this.assunto = assunto;
		this.modelo = modelo;
	}

	public String tipo() {
		return tipo;
	}

	public String assunto() {
		return assunto;
	}

	public String modelo() {
		return modelo;
	}

	public static TipoEmail de(String tipo) {
		for (TipoEmail t : values()) {
			if (t.tipo.equals(tipo)) {
				return t;
			}
		}
		return null;
	}

}
