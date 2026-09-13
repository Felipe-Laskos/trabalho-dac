package br.ufpr.dac.grupo2.conta.query.controller;

import br.ufpr.dac.grupo2.conta.query.dto.ContaDTO;
import br.ufpr.dac.grupo2.conta.query.service.ContaQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ContaQueryController {

    private final ContaQueryService service;

    public ContaQueryController(ContaQueryService service) {
        this.service = service;
    }

    @GetMapping("/contas/{numero}")
    public ResponseEntity<ContaDTO> buscarPorNumero(
            @PathVariable String numero) {
        return service.buscarPorNumero(numero)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/clientes/{cpf}/conta")
    public ResponseEntity<ContaDTO> buscarPorCpf(
            @PathVariable String cpf) {
        return service.buscarPorCpf(cpf)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}