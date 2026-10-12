package br.ufpr.dac.grupo2.gerente.rest;

import jakarta.validation.Valid;
import java.util.List;

import br.ufpr.dac.grupo2.gerente.dto.response.GerenteResponseDTO;
import br.ufpr.dac.grupo2.gerente.service.GerenteService;
import br.ufpr.dac.grupo2.gerente.dto.MensagemSaga;
import br.ufpr.dac.grupo2.gerente.dto.request.GerenteRequestDTO;
import br.ufpr.dac.grupo2.gerente.messaging.dto.ResultadoSaga;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

    @PostMapping
    public ResponseEntity<ResultadoSaga> inserirGerenteSaga(@Valid @RequestBody MensagemSaga cmd) {
        ResultadoSaga resultado = service.inserirGerente(cmd);
        return ResponseEntity.ok(resultado);
    }

    @GetMapping
    public ResponseEntity<List<GerenteResponseDTO>> listarAtivos() {
        List<GerenteResponseDTO> gerentes = service.listarAtivos();
        return ResponseEntity.ok(gerentes);
    }

    @PutMapping("/{cpf}")
    public ResponseEntity<GerenteResponseDTO> atualizar(@PathVariable String cpf, @Valid @RequestBody GerenteRequestDTO request) {   
        try {
            GerenteResponseDTO response = service.atualizarGerente(cpf, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
