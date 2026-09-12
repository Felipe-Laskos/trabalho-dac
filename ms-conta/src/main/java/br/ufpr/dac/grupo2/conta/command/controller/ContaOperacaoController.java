package br.ufpr.dac.grupo2.conta.command.controller;

import br.ufpr.dac.grupo2.conta.command.dto.OperacaoRealizada;
import br.ufpr.dac.grupo2.conta.command.dto.TransferenciaRequest;
import br.ufpr.dac.grupo2.conta.command.dto.ValorRequest;
import br.ufpr.dac.grupo2.conta.command.service.OperacaoContaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/contas/{numero}")
public class ContaOperacaoController {

    private final OperacaoContaService service;

    public ContaOperacaoController(
            OperacaoContaService service) {
        this.service = service;
    }

    @PostMapping("/deposito")
    public ResponseEntity<OperacaoRealizada> depositar(
            @PathVariable String numero,
            @RequestHeader("X-User-CPF") String cpfUsuario,
            @Valid @RequestBody ValorRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(service.depositar(
                        numero,
                        request.valor(),
                        cpfUsuario
                ));
    }

    @PostMapping("/saque")
    public ResponseEntity<OperacaoRealizada> sacar(
            @PathVariable String numero,
            @RequestHeader("X-User-CPF") String cpfUsuario,
            @Valid @RequestBody ValorRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(service.sacar(
                        numero,
                        request.valor(),
                        cpfUsuario
                ));
    }

    @PostMapping("/transferencia")
    public ResponseEntity<OperacaoRealizada> transferir(
            @PathVariable String numero,
            @RequestHeader("X-User-CPF") String cpfUsuario,
            @Valid @RequestBody TransferenciaRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(service.transferir(
                        numero,
                        request,
                        cpfUsuario
                ));
    }
}
