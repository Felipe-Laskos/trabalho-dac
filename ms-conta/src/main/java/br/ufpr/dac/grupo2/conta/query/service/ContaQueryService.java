package br.ufpr.dac.grupo2.conta.query.service;

import br.ufpr.dac.grupo2.conta.query.dto.ContaDTO;
import br.ufpr.dac.grupo2.conta.query.model.ContaQuery;
import br.ufpr.dac.grupo2.conta.query.repository.ContaQueryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;
import java.util.Optional;

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

    private ContaDTO paraDTO(ContaQuery conta) {
        String saldoFormatado = conta.getSaldo()
                .setScale(2, RoundingMode.HALF_UP)
                .toPlainString();

        return new ContaDTO(
                conta.getNumero(),
                conta.getCpfCliente(),
                conta.getCpfGerente(),
                saldoFormatado,
                conta.getDataCriacao().toString()
        );
    }
}