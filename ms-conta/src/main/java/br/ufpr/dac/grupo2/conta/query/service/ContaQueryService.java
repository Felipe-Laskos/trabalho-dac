package br.ufpr.dac.grupo2.conta.query.service;

import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import br.ufpr.dac.grupo2.conta.query.dto.ContaDTO;
import br.ufpr.dac.grupo2.conta.query.dto.Link;
import br.ufpr.dac.grupo2.conta.query.model.ContaQuery;
import br.ufpr.dac.grupo2.conta.query.repository.ContaQueryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContaQueryService {

    private final ContaQueryRepository repository;

    public ContaQueryService(ContaQueryRepository repository) {
        this.repository = repository;
    }

    @Transactional(
            transactionManager = "queryTransactionManager",
            readOnly = true
    )
    public Optional<ContaDTO> buscarPorNumero(String numero) {
        return repository.findById(numero)
                .map(this::paraDTO);
    }

    @Transactional(
            transactionManager = "queryTransactionManager",
            readOnly = true
    )
    public Optional<ContaDTO> buscarPorCpf(String cpf) {
        return repository.findByCpfCliente(cpf)
                .map(this::paraDTO);
    }

    private ContaDTO paraDTO(ContaQuery conta) {
        String saldoFormatado = conta.getSaldo()
                .setScale(2, RoundingMode.HALF_UP)
                .toPlainString();

        String base = "/contas/" + conta.getNumero();

        Map<String, Link> links = new LinkedHashMap<>();
        links.put("self", new Link(base));
        links.put("cliente", new Link(
                "/clientes/" + conta.getCpfCliente()
        ));
        links.put("deposito", new Link(base + "/deposito"));
        links.put("saque", new Link(base + "/saque"));
        links.put("transferencia", new Link(base + "/transferencia"));
        links.put("extrato", new Link(base + "/extrato"));

        return new ContaDTO(
                conta.getNumero(),
                conta.getCpfCliente(),
                conta.getCpfGerente(),
                saldoFormatado,
                conta.getDataCriacao().toString(),
                links
        );
    }
}