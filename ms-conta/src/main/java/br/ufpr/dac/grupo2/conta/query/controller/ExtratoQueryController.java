package br.ufpr.dac.grupo2.conta.query.controller;

import br.ufpr.dac.grupo2.conta.query.dto.ExtratoDTO;
import br.ufpr.dac.grupo2.conta.query.service.ExtratoQueryService;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ExtratoQueryController {
    private final ExtratoQueryService service;

    public ExtratoQueryController(ExtratoQueryService service) {
        this.service = service;
    }

    @GetMapping("/contas/{numero}/extrato")
    public ExtratoDTO extrato(
            @PathVariable("numero") String numero,
            @RequestParam(name = "inicio", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(name = "fim", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestHeader("X-User-CPF") String cpf,
            @RequestHeader("X-User-Tipo") String tipo) {
        return service.consultar(numero, inicio, fim, cpf, tipo);
    }
}