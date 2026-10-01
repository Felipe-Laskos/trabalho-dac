package br.ufpr.dac.grupo2.conta.query.service;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import br.ufpr.dac.grupo2.conta.messaging.dto.ContaParaTransferir;
import br.ufpr.dac.grupo2.conta.query.model.ContaQuery;
import br.ufpr.dac.grupo2.conta.query.repository.ContaQueryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TransferenciaNovoGerenteService {

    private final ContaQueryRepository contas;

    public TransferenciaNovoGerenteService(ContaQueryRepository contas) {
        this.contas = contas;
    }

    @Transactional(
            transactionManager = "queryTransactionManager",
            readOnly = true)
    public Optional<ContaParaTransferir> escolher(String cpfNovoGerente) {
        validarCpf(cpfNovoGerente);

        Map<String, List<ContaQuery>> porGerente = contas.findAll().stream()
                .filter(conta -> !cpfNovoGerente.equals(conta.getCpfGerente()))
                .collect(Collectors.groupingBy(ContaQuery::getCpfGerente));

        int maiorQuantidade = porGerente.values().stream()
                .mapToInt(List::size)
                .max()
                .orElse(0);

        if (maiorQuantidade <= 1) {
            return Optional.empty();
        }

        Map.Entry<String, List<ContaQuery>> gerente = porGerente.entrySet()
                .stream()
                .filter(entry -> entry.getValue().size() == maiorQuantidade)
                .min(Comparator
                        .comparing((Map.Entry<String, List<ContaQuery>> entry) ->
                                saldoTotal(entry.getValue()))
                        .thenComparing(Map.Entry::getKey))
                .orElseThrow();

        ContaQuery conta = gerente.getValue().stream()
                .min(Comparator.comparing(ContaQuery::getSaldo)
                        .thenComparing(ContaQuery::getNumero))
                .orElseThrow();

        return Optional.of(new ContaParaTransferir(
                conta.getNumero(),
                conta.getCpfCliente(),
                gerente.getKey()));
    }

    private BigDecimal saldoTotal(List<ContaQuery> contasDoGerente) {
        return contasDoGerente.stream()
                .map(ContaQuery::getSaldo)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void validarCpf(String cpf) {
        if (cpf == null || !cpf.matches("[0-9]{11}")) {
            throw new IllegalArgumentException("CPF inválido: cpfGerente");
        }
    }
}
