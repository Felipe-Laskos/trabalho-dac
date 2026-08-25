package br.ufpr.dac.grupo2.gerente.rest;

import br.ufpr.dac.grupo2.gerente.dto.response.GerenteResponseDTO;
import br.ufpr.dac.grupo2.gerente.service.GerenteService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin
@RestController
@RequestMapping("/gerentes")
public class GerenteREST {

    private final GerenteService service;

    public GerenteREST(GerenteService service) {
        this.service = service;
    }

    @GetMapping("/{cpf}")
    public ResponseEntity<GerenteResponseDTO> buscar(@PathVariable String cpf) {
        return service.buscarPorCpf(cpf)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
