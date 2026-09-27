package br.ufpr.dac.grupo2.conta;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;
import br.ufpr.dac.grupo2.conta.query.service.EscolhaGerenteService;
class EscolhaGerenteTest {
    @Test void gerenteSemContaGanha() {
        assertEquals("40501740066",EscolhaGerenteService.selecionar(
            List.of("98574307084","64065268052","23862179060","40501740066"),
            Map.of("98574307084",2L,"64065268052",2L,"23862179060",1L)));
    }
    @Test void empateMenorCpfIndependeDaOrdem() {
        assertEquals("23862179060",EscolhaGerenteService.selecionar(
            List.of("98574307084","23862179060"),Map.of()));
    }
    @Test void listaVaziaFalha() {
        assertThrows(IllegalArgumentException.class,() ->
            EscolhaGerenteService.selecionar(List.of(),Map.of()));
    }
}