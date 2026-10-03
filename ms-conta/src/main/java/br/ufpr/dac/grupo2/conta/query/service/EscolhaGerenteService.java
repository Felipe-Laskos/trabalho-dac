package br.ufpr.dac.grupo2.conta.query.service;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import br.ufpr.dac.grupo2.conta.query.repository.ContaQueryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EscolhaGerenteService {

    private final ContaQueryRepository contas;

    public EscolhaGerenteService(ContaQueryRepository contas) {
        this.contas = contas;
    }

    @Transactional(transactionManager = "queryTransactionManager", readOnly = true)
    public String escolher(List<String> ativos) {
        Map<String, Long> quantidadePorGerente = new HashMap<>();
        contas.contarPorGerente().forEach(linha ->
                quantidadePorGerente.put(linha.getCpf(), linha.getQuantidade()));
        return selecionar(ativos, quantidadePorGerente);
    }

    public static String selecionar(List<String> ativos,
            Map<String, Long> quantidadePorGerente) {
        if (ativos == null || ativos.isEmpty()
                || ativos.stream().anyMatch(cpf ->
                        cpf == null || !cpf.matches("[0-9]{11}"))) {
            throw new IllegalArgumentException("Lista de CPFs ativos inválida");
        }

        return ativos.stream()
                .distinct()
                .min(Comparator
                        .<String>comparingLong(cpf ->
                                quantidadePorGerente.getOrDefault(cpf, 0L))
                        .thenComparing(Comparator.naturalOrder()))
                .orElseThrow();
    }
}
