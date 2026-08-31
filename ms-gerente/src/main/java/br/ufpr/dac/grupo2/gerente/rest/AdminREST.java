package br.ufpr.dac.grupo2.gerente.rest;
import br.ufpr.dac.grupo2.gerente.service.GerenteService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/admin")
public class AdminREST {
    private final GerenteService service;

    public AdminREST(GerenteService service) {
        this.service = service;
    }

    @PostMapping("/seed")
    public ResponseEntity<Map<String, Integer>> seed() {
        int total = service.seed();
        return ResponseEntity.ok(Map.of("total", total));
    }
}
