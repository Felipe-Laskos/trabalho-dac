package br.ufpr.dac.grupo2.conta;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;

import br.ufpr.dac.grupo2.conta.admin.dto.ReplayContaDTO;
import br.ufpr.dac.grupo2.conta.command.model.EstadoConta;
import org.junit.jupiter.api.Test;

class ReplayContaDTOTest {

    @Test
    void arredondaApenasNaBordaComHalfUp() {
        EstadoConta estado = new EstadoConta("1291");
        estado.setSaldo(new BigDecimal("1.2350"));

        assertEquals("1.24", ReplayContaDTO.de(estado).saldo());
        assertEquals(new BigDecimal("1.2350"), estado.getSaldo());
    }
}
