package br.ufpr.dac.grupo2.conta.query.service;

import br.ufpr.dac.grupo2.conta.command.exception.AcessoNegadoException;
import br.ufpr.dac.grupo2.conta.command.exception.ContaNaoEncontradaException;
import br.ufpr.dac.grupo2.conta.command.exception.EventoInvalidoException;
import br.ufpr.dac.grupo2.conta.query.dto.ExtratoDTO;
import br.ufpr.dac.grupo2.conta.query.dto.Link;
import br.ufpr.dac.grupo2.conta.query.model.Movimentacao;
import br.ufpr.dac.grupo2.conta.query.repository.ContaQueryRepository;
import br.ufpr.dac.grupo2.conta.query.repository.MovimentacaoRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExtratoQueryService {
    private final ContaQueryRepository contas;
    private final MovimentacaoRepository movimentos;
    private final Clock clock;

    public ExtratoQueryService(ContaQueryRepository contas,
            MovimentacaoRepository movimentos, Clock clock) {
        this.contas = contas;
        this.movimentos = movimentos;
        this.clock = clock;
    }

    @Transactional(transactionManager = "queryTransactionManager",
            readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ExtratoDTO consultar(String numero, LocalDate inicio, LocalDate fim,
            String cpf, String tipo) {
        var conta = contas.findById(numero)
                .orElseThrow(() -> new ContaNaoEncontradaException(numero));
        if (!("GERENTE".equals(tipo)
                || ("CLIENTE".equals(tipo) && conta.getCpfCliente().equals(cpf)))) {
            throw new AcessoNegadoException();
        }

        LocalDate finalPeriodo = fim == null ? LocalDate.now(clock) : fim;
        // Reserva um dia para calcular o limite superior exclusivo com segurança
        if (finalPeriodo.equals(LocalDate.MAX)
                || (inicio == null && finalPeriodo.isBefore(LocalDate.MIN.plusDays(29)))) {
            throw new EventoInvalidoException("Data fora do intervalo suportado");
        }
        LocalDate inicialPeriodo = inicio == null ? finalPeriodo.minusDays(29) : inicio;
        if (finalPeriodo.isBefore(inicialPeriodo)) {
            throw new EventoInvalidoException("Data final anterior à inicial");
        }
        if (ChronoUnit.DAYS.between(inicialPeriodo, finalPeriodo) > 365) {
            throw new EventoInvalidoException("Intervalo máximo de 365 dias");
        }

        var limiteInicial = inicialPeriodo.atStartOfDay();
        var limiteFinal = finalPeriodo.plusDays(1).atStartOfDay();
        BigDecimal abertura = movimentos
                .findFirstByNumeroContaAndDataHoraBeforeOrderByDataHoraDescIdDesc(numero, limiteInicial)
                .map(Movimentacao::getSaldoApos).orElse(BigDecimal.ZERO);
        var itens = movimentos
                .findByNumeroContaAndDataHoraGreaterThanEqualAndDataHoraLessThanOrderByDataHoraAscIdAsc(
                        numero, limiteInicial, limiteFinal)
                .stream().map(this::item).toList();
        String base = "/contas/" + numero;
        var links = new LinkedHashMap<String, Link>();
        links.put("self", new Link(base + "/extrato?inicio=" + inicialPeriodo + "&fim=" + finalPeriodo));
        links.put("conta", new Link(base));
        return new ExtratoDTO(numero, inicialPeriodo.toString(), finalPeriodo.toString(),
                dinheiro(abertura), itens, links);
    }

    private ExtratoDTO.Item item(Movimentacao m) {
        boolean transferencia = "TRANSFERENCIA".equals(m.getTipo());
        return new ExtratoDTO.Item(
                m.getDataHora().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                m.getTipo(), dinheiro(m.getValor()),
                transferencia ? new ExtratoDTO.Parte(
                        m.getContaOrigem(), m.getCpfOrigem(), m.getNomeOrigem()) : null,
                transferencia ? new ExtratoDTO.Parte(
                        m.getContaDestino(), m.getCpfDestino(), m.getNomeDestino()) : null);
    }

    private String dinheiro(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }
}
