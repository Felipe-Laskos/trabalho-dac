package br.ufpr.dac.grupo2.conta.command.service;

import org.hibernate.exception.ConstraintViolationException;

final class ConflitosDeVersao {

    private ConflitosDeVersao() {
    }

    static boolean ehConflitoDeVersao(Throwable erro) {
        for (Throwable causa = erro; causa != null; causa = causa.getCause()) {
            if (causa instanceof ConstraintViolationException violacao
                    && "23505".equals(violacao.getSQLState())
                    && "uk_evento_versao".equals(violacao.getConstraintName())) {
                return true;
            }
        }
        return false;
    }
}
