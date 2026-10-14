package br.ufpr.dac.grupo2.gerente.rest;

import br.ufpr.dac.grupo2.gerente.dto.request.GerenteUpdateRequestDTO;
import br.ufpr.dac.grupo2.gerente.dto.response.GerenteResponseDTO;
import br.ufpr.dac.grupo2.gerente.service.GerenteService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@CrossOrigin
@RestController
@RequestMapping("/gerentes")
public class GerenteREST {

    private final GerenteService service;

    public GerenteREST(GerenteService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<GerenteResponseDTO>> listar() {
        return ResponseEntity.ok(service.listarAtivos());
    }

    @GetMapping("/{cpf}")
    public ResponseEntity<GerenteResponseDTO> buscar(@PathVariable String cpf) {
        return service.buscarPorCpf(cpf)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{cpf}")
    public ResponseEntity<GerenteResponseDTO> atualizar(@PathVariable String cpf,
            @Valid @RequestBody GerenteUpdateRequestDTO dados) {
        return ResponseEntity.ok(service.atualizar(cpf, dados));
    }
}
