package br.ufpr.dac.grupo2.conta.command.service;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.util.concurrent.atomic.AtomicInteger;
class NumeroContaTest {
    @Test void colisaoSorteiaOutraVez() {
        int[] sorteios={1291,1291,42};
        AtomicInteger pos=new AtomicInteger();
        NumeroConta gerador=new NumeroConta(() -> sorteios[pos.getAndIncrement()]);
        assertEquals("0042",gerador.livre("1291"::equals));
        assertEquals(3,pos.get());
    }
    @Test void limiteNaoFicaEmLoopInfinito() {
        NumeroConta gerador=new NumeroConta(() -> 1);
        assertThrows(IllegalArgumentException.class,() -> gerador.livre(n -> true));
    }
}