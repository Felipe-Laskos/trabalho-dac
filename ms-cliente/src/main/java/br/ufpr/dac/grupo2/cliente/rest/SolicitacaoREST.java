package br.ufpr.dac.grupo2.cliente.rest;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import jakarta.validation.Valid;

import br.ufpr.dac.grupo2.cliente.dto.request.SolicitacaoRequestDTO;
import br.ufpr.dac.grupo2.cliente.dto.response.SolicitacaoResponseDTO;
import br.ufpr.dac.grupo2.cliente.service.SolicitacaoService;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.http.ResponseEntity;

@CrossOrigin
@RestController
@RequestMapping("/solicitacoes")
public class SolicitacaoREST {

    private final SolicitacaoService service;

    public SolicitacaoREST(SolicitacaoService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<SolicitacaoResponseDTO> criarSolicitacao(@Valid @RequestBody SolicitacaoRequestDTO request) {
        SolicitacaoResponseDTO response = service.criarSolicitacao(request);
        URI location = URI.create("/solicitacoes/" + response.getCpf());
        return ResponseEntity.created(location).body(response);
    }

    @GetMapping("/{cpf}")
    public ResponseEntity<SolicitacaoResponseDTO> buscarSolicitacao(@PathVariable String cpf) {
        return service.buscarSolicitacaoPorCpf(cpf)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listarSolicitacoes(@RequestParam(required = false) String status) {
        List<SolicitacaoResponseDTO> solicitacoes;

        if (status != null) {
            solicitacoes = service.listarSolicitacoesPorStatus(status);
        } else {
            solicitacoes = service.listarTodasSolicitacoes();
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("solicitacoes", solicitacoes);
        response.put("_links", Map.of("self", new Link("/solicitacoes")));
        return ResponseEntity.ok(response);
    }
}
