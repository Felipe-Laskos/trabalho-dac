package br.ufpr.dac.grupo2.conta.command.service;

import java.security.SecureRandom;
import java.util.Locale;
import java.util.function.IntSupplier;
import java.util.function.Predicate;

import org.springframework.stereotype.Component;

@Component
public class NumeroConta {

    private static final int QUANTIDADE_NUMEROS = 10_000;
    private static final int LIMITE_TENTATIVAS = 20_000;

    private final IntSupplier sorteio;

    public NumeroConta() {
        SecureRandom random = new SecureRandom();
        sorteio = () -> random.nextInt(QUANTIDADE_NUMEROS);
    }

    // Visibilidade de pacote para permitir sorteios determinísticos nos testes.
    NumeroConta(IntSupplier sorteio) {
        this.sorteio = sorteio;
    }

    public String livre(Predicate<String> ocupado) {
        for (int tentativa = 0; tentativa < LIMITE_TENTATIVAS; tentativa++) {
            String numero = String.format(Locale.ROOT, "%04d", sorteio.getAsInt());
            if (!ocupado.test(numero)) {
                return numero;
            }
        }
        throw new IllegalArgumentException(
                "Não foi possível reservar número após 20000 sorteios");
    }
}
