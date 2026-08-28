package br.ufpr.dac.grupo2.conta.admin.controller;

import br.ufpr.dac.grupo2.conta.admin.dto.SeedResponse;
import br.ufpr.dac.grupo2.conta.admin.service.SeedService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
public class AdminSeedController {

    private final SeedService seedService;

    public AdminSeedController(SeedService seedService) {
        this.seedService = seedService;
    }

    @PostMapping("/seed")
    public ResponseEntity<SeedResponse> executarSeed() {
        long total = seedService.executar();
        return ResponseEntity.ok(new SeedResponse(total));
    }
}