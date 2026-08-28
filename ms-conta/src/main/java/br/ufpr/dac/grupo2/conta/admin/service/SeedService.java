package br.ufpr.dac.grupo2.conta.admin.service;

import br.ufpr.dac.grupo2.conta.command.service.CommandSeedService;
import br.ufpr.dac.grupo2.conta.query.repository.ContaQueryRepository;
import br.ufpr.dac.grupo2.conta.query.service.QuerySeedService;
import org.springframework.stereotype.Service;

@Service
public class SeedService {

    private final CommandSeedService commandSeedService;
    private final QuerySeedService querySeedService;
    private final ContaQueryRepository contaQueryRepository;

    public SeedService(
            CommandSeedService commandSeedService,
            QuerySeedService querySeedService,
            ContaQueryRepository contaQueryRepository) {
        this.commandSeedService = commandSeedService;
        this.querySeedService = querySeedService;
        this.contaQueryRepository = contaQueryRepository;
    }

    public long executar() {
        commandSeedService.executar();
        querySeedService.executar();
        return contaQueryRepository.count();
    }
}