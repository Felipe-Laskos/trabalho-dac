package br.ufpr.dac.grupo2.conta;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import br.ufpr.dac.grupo2.conta.admin.service.SeedService;
import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.command.repository.EventoRepository;
import br.ufpr.dac.grupo2.conta.query.model.ContaQuery;
import br.ufpr.dac.grupo2.conta.query.repository.ContaQueryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ReplayContaTest {

    @Autowired
    private SeedService seedService;

    @Autowired
    private EventoRepository eventoRepository;

    @Autowired
    private ContaQueryRepository contaQueryRepository;

    @BeforeEach
    void prepararDados() {
        assertEquals(5L, seedService.executar());
    }

    @Test
    void deveReproduzirOsCincoSaldosDoReadModel() {
        List<ContaQuery> contas = contaQueryRepository.findAll();
        assertEquals(5, contas.size());

        for (ContaQuery conta : contas) {
            List<Evento> eventos = eventoRepository
                    .findByObjetoIdOrderByVersaoAsc(conta.getNumero());

            BigDecimal saldoReplay = replay(eventos);

            assertEquals(
                    0,
                    saldoReplay.compareTo(conta.getSaldo()),
                    "Saldo divergente para a conta " + conta.getNumero()
            );
        }
    }

    private BigDecimal replay(List<Evento> eventos) {
        BigDecimal saldo = BigDecimal.ZERO;

        for (Evento evento : eventos) {
            Map<String, Object> payload = evento.getPayload();

            switch (evento.getTipo()) {
                case "Criado" -> saldo = new BigDecimal(
                        payload.getOrDefault("saldoInicial", "0.00").toString()
                );
                case "Depósito", "TransferênciaDestino" ->
                        saldo = saldo.add(valor(payload));
                case "Saque", "TransferênciaOrigem" ->
                        saldo = saldo.subtract(valor(payload));
                default -> throw new IllegalArgumentException(
                        "Tipo de evento desconhecido: " + evento.getTipo()
                );
            }
        }

        return saldo;
    }

    private BigDecimal valor(Map<String, Object> payload) {
        return new BigDecimal(payload.get("valor").toString());
    }
}