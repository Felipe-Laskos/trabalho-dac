package br.ufpr.dac.grupo2.conta.admin.controller;

import br.ufpr.dac.grupo2.conta.admin.dto.AppendEventoRequest;
import br.ufpr.dac.grupo2.conta.command.dto.EventoPublicado;
import br.ufpr.dac.grupo2.conta.command.model.EstadoConta;
import br.ufpr.dac.grupo2.conta.command.model.Evento;
import br.ufpr.dac.grupo2.conta.command.service.ContaCommandService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
public class AdminEventoController {

    private final ContaCommandService contaCommandService;

    public AdminEventoController(
            ContaCommandService contaCommandService) {
        this.contaCommandService = contaCommandService;
    }

    @PostMapping("/eventos")
    public ResponseEntity<EventoPublicado> append(
            @Valid @RequestBody AppendEventoRequest request) {

        Evento evento = contaCommandService.append(
                request.objetoId(),
                request.tipo(),
                request.payload()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(EventoPublicado.de(evento));
    }

    @GetMapping("/replay/{numero}")
    public ResponseEntity<EstadoConta> replay(
            @PathVariable String numero) {
        return ResponseEntity.ok(
                contaCommandService.replay(numero)
        );
    }
}