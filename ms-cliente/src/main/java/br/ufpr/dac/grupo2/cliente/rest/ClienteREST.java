package br.ufpr.dac.grupo2.cliente.rest;

import br.ufpr.dac.grupo2.cliente.dto.response.ClienteResponseDTO;
import br.ufpr.dac.grupo2.cliente.service.ClienteService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin
@RestController
@RequestMapping("/clientes")
public class ClienteREST {

    private final ClienteService service;

    public ClienteREST(ClienteService service) {
        this.service = service;
    }

    @GetMapping("/{cpf}")
    public ResponseEntity<ClienteResponseDTO> buscar(@PathVariable String cpf) {
        return service.buscarPorCpf(cpf)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
