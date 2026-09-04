package br.ufpr.dac.grupo2.conta.command.service;

import br.ufpr.dac.grupo2.conta.command.exception.ConflitoDeVersaoException;
import br.ufpr.dac.grupo2.conta.command.model.EstadoConta;
import br.ufpr.dac.grupo2.conta.command.model.Evento;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class ContaCommandService {

    private static final int MAX_TENTATIVAS_APPEND = 3;

    private final ContaLeituraService leitura;
    private final AppendTransacional appendTransacional;

    public ContaCommandService(
            ContaLeituraService leitura,
            AppendTransacional appendTransacional) {
        this.leitura = leitura;
        this.appendTransacional = appendTransacional;
    }

    public EstadoConta replay(String numeroConta) {
        return leitura.replay(numeroConta);
    }

    public Evento append(
            String numeroConta,
            String tipo,
            Map<String, Object> payload) {

        for (int tentativa = 1;
                tentativa <= MAX_TENTATIVAS_APPEND;
                tentativa++) {
            try {
                return appendTransacional.executar(
                        numeroConta,
                        tipo,
                        payload
                );
            } catch (ConflitoDeVersaoException e) {
                if (tentativa == MAX_TENTATIVAS_APPEND) {
                    throw e;
                }
            }
        }

        throw new IllegalStateException("inalcancavel");
    }
}
